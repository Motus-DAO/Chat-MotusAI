import { NextRequest, NextResponse } from "next/server";
import OpenAI, {
  APIConnectionError,
  APIError,
  AuthenticationError,
  RateLimitError,
} from "openai";
import { readFile } from "fs/promises";
import path from "path";
import {
  isKnowledgeRagEnabled,
  retrieveMotusContext,
  retrieveMotusQaContext,
  toRagSources,
} from "@/lib/motus-knowledge";
import { MOTUSAI_INFERENCE } from "@/lib/motusai-constants";
import { resolveMotusAuth } from "@/lib/motusai-auth";
import { checkMotusAiRateLimit } from "@/lib/motusai-rate-limit";
import { recordMotusAiTelemetry } from "@/lib/motusai-telemetry";

export type MotusChatMode = "supervision" | "qa";

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

/**
 * json_object | json_schema | off
 * Default OFF: zai-org-glm-5 (current MotusAI model) accepts json_object but
 * returns empty content with finish=stop. Prompt + parseMotusSupervisionJson
 * already enforce JSON. Set MOTUSAI_JSON_MODE=json_object only for models that
 * truly support it (non-empty structured output).
 */
const JSON_MODE = (process.env.MOTUSAI_JSON_MODE || "off").toLowerCase();

const QA_SYSTEM_PROMPT = `Eres el Asistente Oficial de MotusDAO.
Responde preguntas sobre la misión, producto, academia, pagos, referidos, gobernanza, eventos, recorridos PSM/usuario y políticas públicas del ecosistema MotusDAO.

Reglas:
1) Usa SOLO el contexto verificado cuando exista. Si un dato no consta, dilo con claridad y sugiere dónde preguntar (comunidad MotusDAO / soporte).
2) No inventes precios, fechas, contratos ni promesas.
3) No des consejos médicos, diagnósticos ni intervención clínica. Si la persona pide supervisión de caso o ayuda en crisis, indica que cambie a "Supervisión clínica" o contacte servicios de emergencia locales.
4) Estilo: claro, sobrio, preciso. Preferir español. Markdown breve permitido (listas, negritas).
5) Responde en prosa útil; no uses JSON.`;

const SUPERVISION_JSON_SCHEMA = {
  type: "json_schema" as const,
  json_schema: {
    name: "MotusAISupervisionOutput",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        conversation_type: { type: "string" },
        risk_level: {
          type: "string",
          enum: ["none", "low", "medium", "high", "emergency"],
        },
        detected_demand: { type: ["string", "null"] },
        primary_signifier: { type: ["string", "null"] },
        secondary_signifier: { type: ["string", "null"] },
        logical_position: { type: ["string", "null"] },
        observed_pattern: { type: ["string", "null"] },
        clinical_notes: { type: "array", items: { type: "string" } },
        response: { type: "string" },
      },
      required: [
        "conversation_type",
        "risk_level",
        "detected_demand",
        "primary_signifier",
        "secondary_signifier",
        "logical_position",
        "observed_pattern",
        "clinical_notes",
        "response",
      ],
    },
  },
};

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

type RagSourcePayload = ReturnType<typeof toRagSources>;

function stripMarkdownFences(raw: string): string {
  return raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

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
          data: JSON.parse(
            cleaned.slice(start, end + 1),
          ) as MotusAISupervisionOutput,
        };
      } catch {
        return { ok: false };
      }
    }
  }
  return { ok: false };
}

function dedupeTrailingUserMessage(
  history: { role: "user" | "assistant"; content: string }[],
  message: string,
): { role: "user" | "assistant"; content: string }[] {
  const last = history[history.length - 1];
  if (last?.role === "user" && last.content.trim() === message.trim()) {
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
    if (
      m.includes("fetch failed") ||
      m.includes("econnreset") ||
      m.includes("aborted")
    ) {
      return "Conexión interrumpida. Intenta de nuevo.";
    }
  }
  return "Error en el asistente. Intenta de nuevo o inicia un chat nuevo.";
}

function normalizeMode(value: unknown): MotusChatMode {
  return value === "qa" ? "qa" : "supervision";
}

function supervisionResponseFormat():
  | { type: "json_object" }
  | typeof SUPERVISION_JSON_SCHEMA
  | undefined {
  if (JSON_MODE === "off" || JSON_MODE === "none" || JSON_MODE === "false") {
    return undefined;
  }
  if (JSON_MODE === "json_schema") return SUPERVISION_JSON_SCHEMA;
  return { type: "json_object" };
}

function isResponseFormatError(error: unknown): boolean {
  if (!(error instanceof APIError)) return false;
  const msg = `${error.message} ${error.code ?? ""}`.toLowerCase();
  return (
    msg.includes("response_format") ||
    msg.includes("json_object") ||
    msg.includes("json_schema") ||
    msg.includes("structured")
  );
}

async function buildChatMessages(input: {
  mode: MotusChatMode;
  message: string;
  language: string;
  conversation_type: string;
  history: { role: "user" | "assistant"; content: string }[];
}): Promise<{
  mode: MotusChatMode;
  messages: OpenAI.Chat.ChatCompletionMessageParam[];
  ragSources: RagSourcePayload;
  ragEnabled: boolean;
  temperature: number;
  maxTokens: number;
}> {
  const priorHistory = trimHistory(
    dedupeTrailingUserMessage(
      Array.isArray(input.history) ? input.history : [],
      input.message,
    ),
  );

  let ragSources: RagSourcePayload = [];
  let contextSnippets: string[] = [];
  const ragEnabled = isKnowledgeRagEnabled();

  if (ragEnabled) {
    try {
      const retrieved =
        input.mode === "qa"
          ? await retrieveMotusQaContext(input.message)
          : await retrieveMotusContext(input.message);
      contextSnippets = retrieved.snippets;
      ragSources = toRagSources(retrieved.sources);
    } catch (ragError) {
      console.error(
        `[motusai] RAG retrieval failed (${input.mode}), continuing without context:`,
        ragError,
      );
    }
  }

  if (input.mode === "qa") {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: `${QA_SYSTEM_PROMPT}\nPreferred language: ${input.language}.`,
      },
    ];

    if (contextSnippets.length) {
      messages.push({
        role: "system",
        content: `Contexto verificado de MotusDAO Knowledge (no inventar fuera de esto):\n${contextSnippets.join("\n---\n")}`,
      });
    } else {
      messages.push({
        role: "system",
        content:
          "No hay fragmentos RAG recuperados para esta consulta. Responde solo con conocimiento general seguro de MotusDAO y declara incertidumbre cuando falte un dato concreto.",
      });
    }

    messages.push(
      ...priorHistory.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      { role: "user", content: input.message },
    );

    return {
      mode: "qa",
      messages,
      ragSources,
      ragEnabled,
      temperature: MOTUSAI_INFERENCE.qa.temperature,
      maxTokens: MOTUSAI_INFERENCE.qa.maxTokens,
    };
  }

  const promptPath = path.join(process.cwd(), "prompts", "motusai-skill.md");
  const systemPrompt = await readFile(promptPath, "utf8");
  const systemHeader = `You are MotusAI-Psychat, operating strictly under the following specification.\nConversation type: ${input.conversation_type}.\nPreferred language: ${input.language}.\n\nFollow the spec below exactly:\n\n`;

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: systemHeader + systemPrompt,
    },
  ];

  if (contextSnippets.length) {
    messages.push({
      role: "system",
      content: `Contexto verificado de MotusDAO Knowledge (no inventar fuera de esto; úsalo cuando aporte hechos de producto, política clínica o recorrido). Si no aplica a la consulta, ignóralo:\n${contextSnippets.join("\n---\n")}`,
    });
  }

  messages.push(
    ...priorHistory.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    { role: "user", content: input.message },
    {
      role: "system",
      content:
        "Always reply as a single JSON object following the `Suggested Output Format` in the spec. Do not include explanations, markdown or extra text outside JSON.",
    },
  );

  return {
    mode: "supervision",
    messages,
    ragSources,
    ragEnabled,
    temperature: MOTUSAI_INFERENCE.supervision.temperature,
    maxTokens: MOTUSAI_INFERENCE.supervision.maxTokens,
  };
}

function sseEncode(payload: unknown): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(payload)}\n\n`);
}

async function createCompletionWithFormatFallback(
  client: OpenAI,
  args: {
    messages: OpenAI.Chat.ChatCompletionMessageParam[];
    temperature: number;
    maxTokens: number;
    stream: boolean;
    mode: MotusChatMode;
    signal?: AbortSignal;
  },
): Promise<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  completion: any;
  jsonMode: string;
}> {
  const base = {
    model: veniceModel,
    messages: args.messages,
    temperature: args.temperature,
    max_tokens: args.maxTokens,
    stream: args.stream,
  };

  if (args.mode !== "supervision") {
    return {
      completion: await client.chat.completions.create(base, {
        signal: args.signal,
      }),
      jsonMode: "n/a",
    };
  }

  const format = supervisionResponseFormat();
  if (!format) {
    return {
      completion: await client.chat.completions.create(base, {
        signal: args.signal,
      }),
      jsonMode: "off",
    };
  }

  // Streaming + response_format on some Venice models yields empty deltas.
  // Prefer prompt-enforced JSON for streams unless explicitly forced.
  if (args.stream && process.env.MOTUSAI_JSON_MODE_ON_STREAM !== "true") {
    return {
      completion: await client.chat.completions.create(base, {
        signal: args.signal,
      }),
      jsonMode: "off-stream",
    };
  }

  try {
    const completion = await client.chat.completions.create(
      { ...base, response_format: format },
      { signal: args.signal },
    );

    // Non-stream: some models return finish=stop with empty content instead of erroring.
    if (!args.stream) {
      const content =
        (completion as OpenAI.Chat.ChatCompletion).choices?.[0]?.message
          ?.content ?? "";
      if (!content.trim()) {
        console.warn(
          "[motusai] response_format returned empty content; retrying without it",
          { model: veniceModel, format: format.type },
        );
        return {
          completion: await client.chat.completions.create(base, {
            signal: args.signal,
          }),
          jsonMode: "fallback-empty",
        };
      }
    }

    return {
      completion,
      jsonMode: format.type,
    };
  } catch (error) {
    if (!isResponseFormatError(error)) throw error;
    console.warn(
      "[motusai] response_format unsupported for model; retrying without it",
      { model: veniceModel, format: format.type },
    );
    return {
      completion: await client.chat.completions.create(base, {
        signal: args.signal,
      }),
      jsonMode: "fallback-off",
    };
  }
}

export async function POST(req: NextRequest) {
  const started = Date.now();
  let mode: MotusChatMode = "supervision";
  let stream = false;
  let authKey = "unknown";
  let jsonModeUsed = "n/a";

  try {
    if (!veniceApiKey) {
      return NextResponse.json(
        { error: "Missing VENICE_INFERENCE_KEY or VENICE_API_KEY" },
        { status: 401 },
      );
    }

    const auth = resolveMotusAuth(req);
    if (!auth.ok) {
      recordMotusAiTelemetry({
        event: "motusai.turn",
        at: new Date().toISOString(),
        mode,
        stream,
        ok: false,
        latencyMs: Date.now() - started,
        ragEnabled: false,
        ragHits: 0,
        errorKind: "auth",
      });
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }
    authKey = auth.subject.key;

    const limit = checkMotusAiRateLimit(auth.subject.key);
    if (!limit.allowed) {
      recordMotusAiTelemetry({
        event: "motusai.turn",
        at: new Date().toISOString(),
        mode,
        stream,
        ok: false,
        latencyMs: Date.now() - started,
        ragEnabled: false,
        ragHits: 0,
        rateLimited: true,
        authSubject: auth.subject.waapId,
        errorKind: "rate_limit",
      });
      return NextResponse.json(
        {
          error:
            "Has alcanzado el límite de solicitudes. Espera un momento e intenta de nuevo.",
          retryAfterSec: limit.retryAfterSec,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(limit.retryAfterSec ?? 60),
            "X-RateLimit-Remaining-Minute": String(limit.remainingMinute),
            "X-RateLimit-Remaining-Day": String(limit.remainingDay),
          },
        },
      );
    }

    const client = createVeniceClient();
    const body = await req.json();

    const {
      message,
      language = "es",
      conversation_type = "professional_supervision",
      history = [],
      stream: streamFlag = false,
      mode: rawMode,
    } = body as {
      message: string;
      language?: "es" | "en" | "pt";
      conversation_type?: string;
      history?: { role: "user" | "assistant"; content: string }[];
      stream?: boolean;
      mode?: MotusChatMode;
    };

    stream = Boolean(streamFlag);
    mode = normalizeMode(rawMode);

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Missing `message` in request body" },
        { status: 400 },
      );
    }

    const built = await buildChatMessages({
      mode,
      message,
      language,
      conversation_type,
      history,
    });

    if (stream) {
      const readable = new ReadableStream<Uint8Array>({
        async start(controller) {
          const send = (payload: unknown) => {
            controller.enqueue(sseEncode(payload));
          };

          let parseOk: boolean | undefined;
          let riskLevel: string | undefined;
          let ok = false;
          let errorKind: string | undefined;

          try {
            send({
              type: "rag",
              mode: built.mode,
              ragSources: built.ragSources,
              ragEnabled: built.ragEnabled,
            });

            const { completion, jsonMode } =
              await createCompletionWithFormatFallback(client, {
                messages: built.messages,
                temperature: built.temperature,
                maxTokens: built.maxTokens,
                stream: true,
                mode: built.mode,
                signal: req.signal,
              });
            jsonModeUsed = jsonMode;

            let raw = "";
            for await (const chunk of completion) {
              if (req.signal.aborted) break;
              const delta = chunk.choices[0]?.delta?.content ?? "";
              if (!delta) continue;
              raw += delta;
              send({ type: "delta", text: delta, mode: built.mode });
            }

            if (req.signal.aborted) {
              send({ type: "aborted" });
              errorKind = "aborted";
              return;
            }

            if (!raw.trim()) {
              errorKind = "empty";
              send({
                type: "error",
                error:
                  "El modelo no devolvió contenido. Intenta de nuevo o acorta el mensaje.",
              });
              return;
            }

            if (built.mode === "qa") {
              ok = true;
              riskLevel = "none";
              send({
                type: "done",
                mode: "qa",
                response: raw.trim(),
                risk_level: "none",
                clinical_notes: [],
                ragSources: built.ragSources,
                ragEnabled: built.ragEnabled,
              });
              return;
            }

            const parsedResult = parseMotusSupervisionJson(raw);
            parseOk = parsedResult.ok;
            if (
              !parsedResult.ok ||
              typeof parsedResult.data.response !== "string"
            ) {
              console.error(
                "MotusAI JSON parse failed. Raw prefix:",
                raw.slice(0, 800),
              );
              errorKind = "parse";
              send({
                type: "error",
                error:
                  "La respuesta del modelo no se pudo interpretar. Intenta de nuevo o reformula la pregunta.",
              });
              return;
            }

            ok = true;
            riskLevel = parsedResult.data.risk_level;
            send({
              type: "done",
              mode: "supervision",
              ...parsedResult.data,
              ragSources: built.ragSources,
              ragEnabled: built.ragEnabled,
            });
          } catch (error) {
            if (req.signal.aborted) {
              send({ type: "aborted" });
              errorKind = "aborted";
            } else {
              console.error("MotusAI stream error:", error);
              errorKind = "stream";
              send({ type: "error", error: clientFacingMotusError(error) });
            }
          } finally {
            recordMotusAiTelemetry({
              event: "motusai.turn",
              at: new Date().toISOString(),
              mode: built.mode,
              stream: true,
              ok,
              latencyMs: Date.now() - started,
              ragEnabled: built.ragEnabled,
              ragHits: built.ragSources.length,
              parseOk,
              riskLevel,
              authSubject: auth.subject.waapId,
              errorKind,
              jsonMode: jsonModeUsed,
            });
            controller.close();
          }
        },
        cancel() {
          // Client disconnected; Venice call aborts via req.signal when fetch is aborted.
        },
      });

      return new Response(readable, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
          "X-RateLimit-Remaining-Minute": String(limit.remainingMinute),
          "X-RateLimit-Remaining-Day": String(limit.remainingDay),
        },
      });
    }

    const { completion, jsonMode } = await createCompletionWithFormatFallback(
      client,
      {
        messages: built.messages,
        temperature: built.temperature,
        maxTokens: built.maxTokens,
        stream: false,
        mode: built.mode,
      },
    );
    jsonModeUsed = jsonMode;

    const raw = completion.choices[0]?.message?.content ?? "";
    if (!raw.trim()) {
      recordMotusAiTelemetry({
        event: "motusai.turn",
        at: new Date().toISOString(),
        mode: built.mode,
        stream: false,
        ok: false,
        latencyMs: Date.now() - started,
        ragEnabled: built.ragEnabled,
        ragHits: built.ragSources.length,
        authSubject: auth.subject.waapId,
        errorKind: "empty",
        jsonMode: jsonModeUsed,
      });
      return NextResponse.json(
        {
          error:
            "El modelo no devolvió contenido. Intenta de nuevo o acorta el mensaje.",
        },
        { status: 502 },
      );
    }

    if (built.mode === "qa") {
      recordMotusAiTelemetry({
        event: "motusai.turn",
        at: new Date().toISOString(),
        mode: "qa",
        stream: false,
        ok: true,
        latencyMs: Date.now() - started,
        ragEnabled: built.ragEnabled,
        ragHits: built.ragSources.length,
        riskLevel: "none",
        authSubject: auth.subject.waapId,
        jsonMode: jsonModeUsed,
      });
      return NextResponse.json({
        mode: "qa",
        response: raw.trim(),
        risk_level: "none",
        clinical_notes: [],
        ragSources: built.ragSources,
        ragEnabled: built.ragEnabled,
      });
    }

    const parsedResult = parseMotusSupervisionJson(raw);
    if (!parsedResult.ok || typeof parsedResult.data.response !== "string") {
      console.error("MotusAI JSON parse failed. Raw prefix:", raw.slice(0, 800));
      recordMotusAiTelemetry({
        event: "motusai.turn",
        at: new Date().toISOString(),
        mode: "supervision",
        stream: false,
        ok: false,
        latencyMs: Date.now() - started,
        ragEnabled: built.ragEnabled,
        ragHits: built.ragSources.length,
        parseOk: false,
        authSubject: auth.subject.waapId,
        errorKind: "parse",
        jsonMode: jsonModeUsed,
      });
      return NextResponse.json(
        {
          error:
            "La respuesta del modelo no se pudo interpretar. Intenta de nuevo o reformula la pregunta.",
        },
        { status: 502 },
      );
    }

    recordMotusAiTelemetry({
      event: "motusai.turn",
      at: new Date().toISOString(),
      mode: "supervision",
      stream: false,
      ok: true,
      latencyMs: Date.now() - started,
      ragEnabled: built.ragEnabled,
      ragHits: built.ragSources.length,
      parseOk: true,
      riskLevel: parsedResult.data.risk_level,
      authSubject: auth.subject.waapId,
      jsonMode: jsonModeUsed,
    });

    return NextResponse.json({
      mode: "supervision",
      ...parsedResult.data,
      ragSources: built.ragSources,
      ragEnabled: built.ragEnabled,
    });
  } catch (error) {
    console.error("MotusAI route error:", error);
    recordMotusAiTelemetry({
      event: "motusai.turn",
      at: new Date().toISOString(),
      mode,
      stream,
      ok: false,
      latencyMs: Date.now() - started,
      ragEnabled: false,
      ragHits: 0,
      authSubject: authKey,
      errorKind: "exception",
      jsonMode: jsonModeUsed,
    });
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
