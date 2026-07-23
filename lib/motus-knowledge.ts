import { createClient } from "@supabase/supabase-js";
import {
  getEmbeddingClient,
  getEmbeddingModel,
  hasEmbeddingKey,
} from "@/lib/ai-client";
import { RAG_SIMILARITY_FLOOR } from "@/lib/motusai-constants";

export { RAG_SIMILARITY_FLOOR } from "@/lib/motusai-constants";

export interface KnowledgeHit {
  sourcePath: string;
  title: string;
  namespace: string;
  similarity: number;
  content: string;
}

export interface RagSource {
  sourcePath: string;
  title: string;
  namespace: string;
  similarity: number;
}

/**
 * Knowledge RAG may live in a different Supabase project than this app's
 * auth/DB (ChatAlpha vs Hub-Psi/MCP corpus). Prefer MOTUS_KNOWLEDGE_* when set.
 */
function resolveKnowledgeSupabaseConfig(): {
  url: string;
  serviceKey: string;
} | null {
  const url =
    process.env.MOTUS_KNOWLEDGE_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.MOTUS_KNOWLEDGE_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_KEY;

  if (!url || !serviceKey) return null;
  return { url, serviceKey };
}

function getSupabaseAdmin() {
  const config = resolveKnowledgeSupabaseConfig();
  if (!config) return null;
  return createClient(config.url, config.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function isKnowledgeRagEnabled(): boolean {
  return Boolean(resolveKnowledgeSupabaseConfig() && hasEmbeddingKey());
}

export async function searchMotusKnowledge(
  query: string,
  options?: { namespace?: string | null; limit?: number },
): Promise<KnowledgeHit[]> {
  if (!isKnowledgeRagEnabled()) return [];

  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const client = getEmbeddingClient();
  const embedding = await client.embeddings.create({
    model: getEmbeddingModel(),
    input: query,
  });

  const vector = embedding.data[0]?.embedding;
  if (!vector) return [];

  const { data, error } = await supabase.rpc("match_knowledge_chunks", {
    query_embedding: vector,
    match_count: options?.limit ?? 5,
    filter_namespace: options?.namespace ?? null,
  });

  if (error) {
    console.error("[motus-knowledge] search error:", error.message);
    return [];
  }

  return (data ?? []).map((row: Record<string, unknown>) => ({
    sourcePath: String(row.source_path),
    title: String(row.title),
    namespace: String(row.namespace),
    similarity: Number(row.similarity ?? 0),
    content: String(row.content),
  }));
}

export function toContextSnippets(hits: KnowledgeHit[]): string[] {
  return hits.map(
    (h) =>
      `[${h.namespace}] ${h.title} (${h.sourcePath}, sim=${h.similarity.toFixed(3)})\n${h.content}`,
  );
}

function mergeKnowledgeHits(
  hits: KnowledgeHit[],
  limit = 6,
  floor = RAG_SIMILARITY_FLOOR,
): KnowledgeHit[] {
  const merged = new Map<string, KnowledgeHit>();
  for (const hit of hits) {
    if (hit.similarity < floor) continue;
    const key = `${hit.sourcePath}:${hit.content.slice(0, 80)}`;
    if (
      !merged.has(key) ||
      (merged.get(key)?.similarity ?? 0) < hit.similarity
    ) {
      merged.set(key, hit);
    }
  }

  return [...merged.values()]
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

export async function retrieveMotusContext(userQuery: string): Promise<{
  snippets: string[];
  sources: KnowledgeHit[];
}> {
  const trimmed = userQuery.trim();
  if (!trimmed) return { snippets: [], sources: [] };

  const [clinical, product, journey] = await Promise.all([
    searchMotusKnowledge(trimmed, { namespace: "clinical-policy", limit: 2 }),
    searchMotusKnowledge(trimmed, { namespace: "product", limit: 2 }),
    searchMotusKnowledge(trimmed, { namespace: null, limit: 3 }),
  ]);

  const sources = mergeKnowledgeHits([...clinical, ...product, ...journey]);

  return {
    snippets: toContextSnippets(sources),
    sources,
  };
}

/** Product / journey / brand-first retrieval for MotusDAO Q&A mode. */
export async function retrieveMotusQaContext(userQuery: string): Promise<{
  snippets: string[];
  sources: KnowledgeHit[];
}> {
  const trimmed = userQuery.trim();
  if (!trimmed) return { snippets: [], sources: [] };

  const [product, journey, brand, general] = await Promise.all([
    searchMotusKnowledge(trimmed, { namespace: "product", limit: 3 }),
    searchMotusKnowledge(trimmed, { namespace: "customer-journey", limit: 3 }),
    searchMotusKnowledge(trimmed, { namespace: "brand", limit: 2 }),
    searchMotusKnowledge(trimmed, { namespace: null, limit: 2 }),
  ]);

  const sources = mergeKnowledgeHits(
    [...product, ...journey, ...brand, ...general],
    8,
  );

  return {
    snippets: toContextSnippets(sources),
    sources,
  };
}

export function toRagSources(sources: KnowledgeHit[]): RagSource[] {
  return sources.map(({ sourcePath, title, namespace, similarity }) => ({
    sourcePath,
    title,
    namespace,
    similarity,
  }));
}

export function filterRagSources(
  sources: RagSource[],
  floor = RAG_SIMILARITY_FLOOR,
): RagSource[] {
  return sources.filter((s) => s.similarity >= floor);
}
