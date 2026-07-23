/** Drop weak retrieval hits so Fuentes Motus stay credible. */
export const RAG_SIMILARITY_FLOOR = 0.45;

/** Inference knobs by chat mode (Wave 3). */
export const MOTUSAI_INFERENCE = {
  supervision: {
    temperature: 0.25,
    maxTokens: 2048,
  },
  qa: {
    temperature: 0.5,
    maxTokens: 1200,
  },
} as const;

export const MOTUSAI_THREAD_STORAGE_VERSION = 1;
