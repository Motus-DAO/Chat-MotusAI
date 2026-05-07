import { NextRequest, NextResponse } from "next/server";
import OpenAI, {
  APIConnectionError,
  APIError,
  AuthenticationError,
  RateLimitError,
} from "openai";
import { readFile } from "fs/promises";
import path from "path";

// Use Venice as OpenAI-compatible backend for MotusAI supervision
const rawVeniceApiKey =
  process.env.VENICE_INFERENCE_KEY || process.env.VENICE_API_KEY;
const veniceApiKey = rawVeniceApiKey
  ? rawVeniceApiKey.startsWith("VENICE_INFERENCE_KEY_")
    ? rawVeniceApiKey
    : `VENICE_INFERENCE_KEY_${rawVeniceApiKey}`
  : undefined;
const veniceModel = process.env.VENICE_MODEL || "zai-org-glm-5";

/** Max prior chat messages sent (user + assistant); avoids context overflow on long threads */
const MAX_HISTORY_MESSAGES = Math.max(
  4,
  Number.parseInt(process.env.MOTUSAI_MAX_HISTORY_MESSAGES ?? "48", 10) || 48,
);

function createVeniceClient() {
  return new OpenAI({
    apiKey: veniceApiKey,
    baseURL: "https://api.venice.ai/api/v1",
  });
}

type MotusAISupervisionOutput = {
  conversation_type: string;
  risk_level: "none" | "low" | "medium" | "high" | "emergency";
  detected_demand: string | null;
  primary_signifier: string | null;
  secondary_signifier: string | null;
  logical_position: string | null;
  observed_pattern: string | null;
  clinical_notes: string[];
  response: string;
};

function stripMarkdownFences(raw: string): string {
  return raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

/**
 * Models sometimes wrap JSON in fences or add a short lead-in; try to recover a single object.
 */
function parseMotusSupervisionJson(
  raw: string,
): { ok: true; data: MotusAISupervisionOutput } | { ok: false } {
  const cleaned = stripMarkdownFences(raw);
  if (!cleaned) return { ok: false };

  try {
    return {
      ok: true,
      data: JSON.parse(cleaned) as MotusAISupervisionOutput,
    };
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return {
          ok: true,
          data: JSON.parse(cleaned.slice(start, end + 1)) as MotusAISupervisionOutput,
        };
      } catch {
        return { ok: false };
      }
    }
  }
  return { ok: false };
}

/** Older clients sent the new user turn twice (inside history + as message). Drop duplicate tail. */
function dedupeTrailingUserMessage(
  history: { role: "user" | "assistant"; content: string }[],
  message: string,
): { role: "user" | "assistant"; content: string }[] {
  const last = history[history.length - 1];
  if (
    last?.role === "user" &&
    last.content.trim() === message.trim()
  ) {
    return history.slice(0, -1);
  }
  return history;
}

function trimHistory(
  history: { role: "user" | "assistant"; content: string }[],
): { role: "user" | "assistant"; content: string }[] {
  if (history.length <= MAX_HISTORY_MESSAGES) return history;
  return history.slice(-MAX_HISTORY_MESSAGES);
}

function clientFacingMotusError(error: unknown): string {
  if (error instanceof RateLimitError) {
    return "Demasiadas solicitudes en poco tiempo. Espera un momento e intenta de nuevo.";
  }
  if (error instanceof APIError) {
    const msg = `${error.message} ${error.code ?? ""}`.toLowerCase();
    if (
      error.status === 400 &&
      (msg.includes("context") ||
        msg.includes("token") ||
        msg.includes("length") ||
        msg.includes("maximum"))
    ) {
      return "La conversación supera el límite del modelo. Inicia un chat nuevo o acorta el hilo.";
    }
    if (error.status === 429) {
      return "El servicio está limitando solicitudes. Intenta de nuevo en unos segundos.";
    }
    if (error.status === 503 || error.status === 502) {
      return "El servicio de inferencia no está disponible momentáneamente. Intenta de nuevo.";
    }
  }
  if (error instanceof APIConnectionError) {
    return "No se pudo conectar con el asistente. Revisa tu red e intenta de nuevo.";
  }
  if (error instanceof AuthenticationError) {
    return "Configuración del servidor inválida (clave API). Contacta al administrador.";
  }
  if (error instanceof Error) {
    const m = error.message.toLowerCase();
    if (m.includes("fetch failed") || m.includes("econnreset")) {
      return "Conexión interrumpida. Intenta de nuevo.";
    }
  }
  return "Error en el asistente clínico. Intenta de nuevo o inicia un chat nuevo.";
}

export async function POST(req: NextRequest) {
  try {
    if (!veniceApiKey) {
      return NextResponse.json(
        { error: "Missing VENICE_INFERENCE_KEY or VENICE_API_KEY" },
        { status: 401 },
      );
    }

    const client = createVeniceClient();
    const body = await req.json();

    const {
      message,
      language = "es",
      conversation_type = "professional_supervision",
      history = [],
    } = body as {
      message: string;
      language?: "es" | "en" | "pt";
      conversation_type?: string;
      history?: { role: "user" | "assistant"; content: string }[];
    };

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Missing `message` in request body" },
        { status: 400 },
      );
    }

    const promptPath = path.join(
      process.cwd(),
      "prompts",
      "motusai-skill.md",
    );
    const systemPrompt = await readFile(promptPath, "utf8");

    const systemHeader = `You are MotusAI-Psychat, operating strictly under the following specification.\nConversation type: ${conversation_type}.\nPreferred language: ${language}.\n\nFollow the spec below exactly:\n\n`;

    const priorHistory = trimHistory(
      dedupeTrailingUserMessage(
        Array.isArray(history) ? history : [],
        message,
      ),
    );

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: systemHeader + systemPrompt,
      },
      ...priorHistory.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      {
        role: "user",
        content: message,
      },
      {
        role: "system",
        content:
          "Always reply as a single JSON object following the `Suggested Output Format` in the spec. Do not include explanations, markdown or extra text outside JSON.",
      },
    ];

    const completion = await client.chat.completions.create({
      model: veniceModel,
      messages,
      temperature: 0.3,
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    if (!raw.trim()) {
      console.error("MotusAI empty completion", {
        finish_reason: completion.choices[0]?.finish_reason,
      });
      return NextResponse.json(
        {
          error:
            "El modelo no devolvió contenido. Intenta de nuevo o acorta el mensaje.",
        },
        { status: 502 },
      );
    }

    const parsedResult = parseMotusSupervisionJson(raw);
    if (!parsedResult.ok) {
      console.error("MotusAI JSON parse failed. Raw prefix:", raw.slice(0, 800));
      return NextResponse.json(
        {
          error:
            "La respuesta del modelo no se pudo interpretar. Intenta de nuevo o reformula la pregunta.",
        },
        { status: 502 },
      );
    }

    const parsed = parsedResult.data;
    if (typeof parsed.response !== "string") {
      return NextResponse.json(
        {
          error:
            "El modelo devolvió un formato inesperado. Intenta de nuevo.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("MotusAI route error:", error);
    const publicMsg = clientFacingMotusError(error);
    let status = 500;
    if (error instanceof AuthenticationError) status = 401;
    else if (error instanceof RateLimitError) status = 429;
    else if (error instanceof APIError && typeof error.status === "number") {
      status =
        error.status >= 400 && error.status < 600 ? error.status : 500;
    }
    return NextResponse.json({ error: publicMsg }, { status });
  }
}

