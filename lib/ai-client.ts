import OpenAI from "openai";

type AIProvider = "openai" | "venice";

const OPENAI_NATIVE_EMBEDDING_MODELS = new Set([
  "text-embedding-3-small",
  "text-embedding-3-large",
  "text-embedding-ada-002",
]);

function resolveProvider(): AIProvider {
  const explicit = (
    process.env.EMBEDDING_PROVIDER ??
    process.env.AI_PROVIDER ??
    ""
  ).toLowerCase();

  if (explicit === "venice") return "venice";
  if (explicit === "openai") return "openai";
  if (process.env.VENICE_INFERENCE_KEY || process.env.VENICE_API_KEY) {
    return "venice";
  }
  return "openai";
}

export function getAIProvider() {
  return resolveProvider();
}

function veniceApiKey(): string | undefined {
  return process.env.VENICE_INFERENCE_KEY || process.env.VENICE_API_KEY;
}

/** Match MCP-MotusDAO ingest: Venice private default is bge-m3 (1024 dims). */
function resolveVeniceEmbeddingModel(): string {
  const requested =
    process.env.VENICE_EMBEDDING_MODEL?.trim() ||
    process.env.EMBEDDING_MODEL?.trim();
  if (!requested || OPENAI_NATIVE_EMBEDDING_MODELS.has(requested)) {
    return "text-embedding-bge-m3";
  }
  return requested;
}

export function getEmbeddingModel() {
  if (getAIProvider() === "venice") {
    return resolveVeniceEmbeddingModel();
  }
  return process.env.EMBEDDING_MODEL || "text-embedding-3-small";
}

export function hasEmbeddingKey() {
  if (getAIProvider() === "venice") {
    return Boolean(veniceApiKey());
  }
  return Boolean(process.env.OPENAI_API_KEY);
}

export function getEmbeddingClient() {
  if (getAIProvider() === "venice") {
    const apiKey = veniceApiKey();
    if (!apiKey) {
      throw new Error("Missing VENICE_INFERENCE_KEY or VENICE_API_KEY");
    }
    return new OpenAI({
      apiKey,
      baseURL:
        process.env.VENICE_API_BASE_URL || "https://api.venice.ai/api/v1",
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }
  return new OpenAI({
    apiKey,
    ...(process.env.OPENAI_API_BASE_URL
      ? { baseURL: process.env.OPENAI_API_BASE_URL }
      : {}),
  });
}
