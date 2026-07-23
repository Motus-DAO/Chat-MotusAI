"use client";

import { MOTUSAI_THREAD_STORAGE_VERSION } from "@/lib/motusai-constants";

export type StoredChatMode = "supervision" | "qa";

export type StoredChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  ragSources?: Array<{
    sourcePath: string;
    title: string;
    namespace: string;
    similarity: number;
  }>;
  clinicalNotes?: string[];
  riskLevel?: "none" | "low" | "medium" | "high" | "emergency";
};

export type StoredThread = {
  version: number;
  mode: StoredChatMode;
  messages: StoredChatMessage[];
  activeRisk: "high" | "emergency" | null;
  updatedAt: number;
};

function storageKey(waapId: string, mode: StoredChatMode): string {
  return `motusai.thread.v${MOTUSAI_THREAD_STORAGE_VERSION}:${waapId}:${mode}`;
}

export function loadMotusThread(
  waapId: string,
  mode: StoredChatMode,
): StoredThread | null {
  if (typeof window === "undefined" || !waapId) return null;
  try {
    const raw = window.localStorage.getItem(storageKey(waapId, mode));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredThread;
    if (
      !parsed ||
      parsed.version !== MOTUSAI_THREAD_STORAGE_VERSION ||
      parsed.mode !== mode ||
      !Array.isArray(parsed.messages)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveMotusThread(
  waapId: string,
  thread: Omit<StoredThread, "version" | "updatedAt">,
): void {
  if (typeof window === "undefined" || !waapId) return;
  try {
    const payload: StoredThread = {
      version: MOTUSAI_THREAD_STORAGE_VERSION,
      mode: thread.mode,
      messages: thread.messages.map(
        ({ id, role, content, ragSources, clinicalNotes, riskLevel }) => ({
          id,
          role,
          content,
          ragSources,
          clinicalNotes,
          riskLevel,
        }),
      ),
      activeRisk: thread.activeRisk,
      updatedAt: Date.now(),
    };
    window.localStorage.setItem(
      storageKey(waapId, thread.mode),
      JSON.stringify(payload),
    );
  } catch {
    // Quota / private mode — ignore
  }
}

export function clearMotusThread(waapId: string, mode: StoredChatMode): void {
  if (typeof window === "undefined" || !waapId) return;
  try {
    window.localStorage.removeItem(storageKey(waapId, mode));
  } catch {
    // ignore
  }
}
