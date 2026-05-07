import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
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

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: systemHeader + systemPrompt,
      },
      ...history.map((m) => ({
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
    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let parsed: MotusAISupervisionOutput;
    try {
      parsed = JSON.parse(cleaned) as MotusAISupervisionOutput;
    } catch (err) {
      return NextResponse.json(
        {
          error: "Failed to parse model output as JSON",
          raw,
        },
        { status: 502 },
      );
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("MotusAI route error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Unknown error in MotusAI supervision route";
    const isAuthError = message.includes("401") || message.includes("Authentication failed");
    return NextResponse.json(
      { error: message },
      { status: isAuthError ? 401 : 500 },
    );
  }
}

