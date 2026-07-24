"use client";

import * as React from "react";
import { useEffect, useRef, useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import {
  FileText,
  SendIcon,
  LoaderIcon,
  Square,
  RotateCcw,
  PhoneCall,
  AlertTriangle,
  ClipboardList,
  BookOpen,
  Stethoscope,
  Trash2,
  Award,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { marked } from "marked";
import { useUIStore } from "@/lib/store";
import { useWaaP, useWaaPWallets } from "@/lib/contexts/WaaPProvider";
import { getEOAAddress } from "@/lib/wallet-utils";
import { RAG_SIMILARITY_FLOOR } from "@/lib/motusai-constants";
import { extractPartialResponseField } from "@/lib/motusai-stream";
import {
  LATAM_CRISIS_RESOURCES,
  MOTUS_HUMAN_SUPPORT_MAIL,
} from "@/lib/crisis-resources";
import {
  clearMotusThread,
  loadMotusThread,
  saveMotusThread,
} from "@/lib/motusai-thread-storage";
import { newMotusSessionId } from "@/lib/certificates";
import { saveCertificate } from "@/lib/certificate-storage";
import { CertificateNftCard } from "@/components/certificates/CertificateNftCard";
import Link from "next/link";

marked.setOptions({ breaks: true, gfm: true });

function renderMarkdown(content: string): string {
  try {
    const result = marked(content);
    return typeof result === "string" ? result : content;
  } catch {
    return content;
  }
}

type ChatMode = "supervision" | "qa";
type RiskLevel = "none" | "low" | "medium" | "high" | "emergency";

interface UseAutoResizeTextareaProps {
  minHeight: number;
  maxHeight?: number;
}

function useAutoResizeTextarea({
  minHeight,
  maxHeight,
}: UseAutoResizeTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(
    (reset?: boolean) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      if (reset) {
        textarea.style.height = `${minHeight}px`;
        return;
      }

      textarea.style.height = `${minHeight}px`;
      const newHeight = Math.max(
        minHeight,
        Math.min(textarea.scrollHeight, maxHeight ?? Number.POSITIVE_INFINITY),
      );

      textarea.style.height = `${newHeight}px`;
    },
    [minHeight, maxHeight],
  );

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = `${minHeight}px`;
    }
  }, [minHeight]);

  useEffect(() => {
    const handleResize = () => adjustHeight();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [adjustHeight]);

  return { textareaRef, adjustHeight };
}

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  containerClassName?: string;
  showRing?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, containerClassName, showRing = true, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);

    return (
      <div className={cn("relative", containerClassName)}>
        <textarea
          className={cn(
            "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
            "transition-all duration-200 ease-in-out",
            "placeholder:text-muted-foreground",
            "disabled:cursor-not-allowed disabled:opacity-50",
            showRing
              ? "focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
              : "",
            className,
          )}
          ref={ref}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />

        {showRing && isFocused && (
          <motion.span
            className="pointer-events-none absolute inset-0 rounded-md ring-2 ring-violet-500/30 ring-offset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </div>
    );
  },
);
Textarea.displayName = "Textarea";

interface RagSource {
  sourcePath: string;
  title: string;
  namespace: string;
  similarity: number;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  ragSources?: RagSource[];
  clinicalNotes?: string[];
  riskLevel?: RiskLevel;
  streaming?: boolean;
}

type RetryPayload = {
  message: string;
  history: { role: "user" | "assistant"; content: string }[];
  mode: ChatMode;
};

function filterVisibleRagSources(sources?: RagSource[]): RagSource[] {
  if (!sources?.length) return [];
  return sources.filter((s) => s.similarity >= RAG_SIMILARITY_FLOOR);
}

function isElevatedRisk(level?: RiskLevel): level is "high" | "emergency" {
  return level === "high" || level === "emergency";
}

interface AnimatedAIChatProps {
  fullScreen?: boolean;
}

export function AnimatedAIChat({ fullScreen = true }: AnimatedAIChatProps) {
  const { theme, role } = useUIStore();
  const { user, authenticated } = useWaaP();
  const { wallets } = useWaaPWallets();
  const eoaAddress = getEOAAddress(wallets);
  const waapId = user?.id ?? "";
  const isLight = theme === "light";
  const isPsm = role === "psm";
  const [chatMode, setChatMode] = useState<ChatMode>("supervision");
  const [value, setValue] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryPayload, setRetryPayload] = useState<RetryPayload | null>(null);
  const [activeRisk, setActiveRisk] = useState<RiskLevel | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [inputFocused, setInputFocused] = useState(false);
  const [isEndingSession, setIsEndingSession] = useState(false);
  const [endedCert, setEndedCert] = useState<{
    sessionId: number;
    mintTxHash?: string;
    label: string;
  } | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 60,
    maxHeight: 200,
  });

  const clinicalExample =
    "Tengo un paciente que tiene ansiedad. El comenta que no se siente lo hombre, por lo que he decidio abordar este tema desde la teoria de genero y social, dandole herramientas de nuevas masculinidades y me enfocare en trabajar en su autoestima.";
  const qaExample =
    "¿Qué es el Pase Motus Beta y qué incluye para PSM?";

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping, activeRisk]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // Hydrate thread from localStorage when auth + mode are ready
  useEffect(() => {
    if (!authenticated || !waapId) {
      setHydrated(true);
      return;
    }
    const stored = loadMotusThread(waapId, chatMode);
    if (stored) {
      setMessages(
        stored.messages.map((m) => ({
          ...m,
          streaming: false,
        })),
      );
      setActiveRisk(stored.activeRisk);
    } else {
      setMessages([]);
      setActiveRisk(null);
    }
    setHydrated(true);
  }, [authenticated, waapId, chatMode]);

  // Persist thread (skip while streaming / before hydrate)
  useEffect(() => {
    if (!hydrated || !authenticated || !waapId) return;
    if (messages.some((m) => m.streaming)) return;
    saveMotusThread(waapId, {
      mode: chatMode,
      messages,
      activeRisk:
        activeRisk === "high" || activeRisk === "emergency"
          ? activeRisk
          : null,
    });
  }, [
    messages,
    chatMode,
    activeRisk,
    authenticated,
    waapId,
    hydrated,
  ]);

  const authHeaders = useCallback((): HeadersInit => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (waapId) headers["x-motus-waap-id"] = waapId;
    return headers;
  }, [waapId]);

  const switchMode = (next: ChatMode) => {
    if (next === chatMode || isTyping) return;
    abortRef.current?.abort();
    // Persist current mode before switching
    if (authenticated && waapId) {
      saveMotusThread(waapId, {
        mode: chatMode,
        messages: messages.filter((m) => !m.streaming),
        activeRisk:
          activeRisk === "high" || activeRisk === "emergency"
            ? activeRisk
            : null,
      });
    }
    setHydrated(false);
    setChatMode(next);
    setMessages([]);
    setActiveRisk(null);
    setError(null);
    setRetryPayload(null);
    setValue("");
    adjustHeight(true);
  };

  const clearConversation = () => {
    if (isTyping) return;
    abortRef.current?.abort();
    setMessages([]);
    setActiveRisk(null);
    setError(null);
    setRetryPayload(null);
    setEndedCert(null);
    if (authenticated && waapId) {
      clearMotusThread(waapId, chatMode);
    }
  };

  const endSessionAndMint = async () => {
    if (isTyping || isEndingSession || messages.length === 0) return;
    if (!authenticated || !eoaAddress) {
      setError("Conecta tu wallet para mintear el certificado de esta sesión.");
      return;
    }

    const hasUserTurn = messages.some((m) => m.role === "user");
    if (!hasUserTurn) {
      setError("Escribe al menos un mensaje antes de finalizar la sesión.");
      return;
    }

    setIsEndingSession(true);
    setError(null);
    setEndedCert(null);

    const sessionId = newMotusSessionId();
    const label =
      chatMode === "qa"
        ? `MotusAI Preguntas · ${new Date().toLocaleDateString("es")}`
        : `MotusAI Supervisión · ${new Date().toLocaleDateString("es")}`;

    try {
      const response = await fetch("/api/certificados/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: eoaAddress,
          sessionId,
          label,
        }),
      });

      const payload = (await response.json()) as {
        success?: boolean;
        alreadyMinted?: boolean;
        mintTxHash?: string;
        sessionId?: number;
        error?: string;
        retryInMinutes?: number;
      };

      if (!response.ok && !payload.alreadyMinted) {
        throw new Error(
          payload.error ||
            (typeof payload.retryInMinutes === "number"
              ? `Espera ${payload.retryInMinutes} min antes de reclamar otro certificado.`
              : "No se pudo mintear el certificado"),
        );
      }

      const mintedSessionId = payload.sessionId ?? sessionId;
      saveCertificate(eoaAddress, {
        sessionId: mintedSessionId,
        recipient: eoaAddress,
        mintTxHash: payload.mintTxHash,
        mintedAt: Date.now(),
        label,
        source: "motusai",
      });

      setEndedCert({
        sessionId: mintedSessionId,
        mintTxHash: payload.mintTxHash,
        label,
      });

      abortRef.current?.abort();
      setMessages([]);
      setActiveRisk(null);
      setRetryPayload(null);
      setValue("");
      adjustHeight(true);
      if (waapId) clearMotusThread(waapId, chatMode);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo finalizar la sesión con certificado.",
      );
    } finally {
      setIsEndingSession(false);
    }
  };

  const runMotusStream = useCallback(
    async (payload: RetryPayload, assistantId: string) => {
      const controller = new AbortController();
      abortRef.current = controller;
      setIsTyping(true);
      setError(null);

      let raw = "";
      let ragSources: RagSource[] | undefined;
      const isQa = payload.mode === "qa";

      try {
        const res = await fetch("/api/motusai", {
          method: "POST",
          headers: authHeaders(),
          signal: controller.signal,
          body: JSON.stringify({
            message: payload.message,
            language: "es",
            conversation_type: "professional_supervision",
            history: payload.history,
            stream: true,
            mode: payload.mode,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            (data as { error?: string }).error ||
              "Error en el asistente clínico",
          );
        }

        if (!res.body) {
          throw new Error("El servidor no devolvió un flujo de respuesta.");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        const applyPartial = (text: string) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content: text,
                    streaming: true,
                    ragSources: filterVisibleRagSources(ragSources),
                  }
                : m,
            ),
          );
        };

        while (true) {
          const { done, value: chunk } = await reader.read();
          if (done) break;
          buffer += decoder.decode(chunk, { stream: true });

          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";

          for (const part of parts) {
            const line = part
              .split("\n")
              .map((l) => l.trim())
              .find((l) => l.startsWith("data:"));
            if (!line) continue;
            const jsonText = line.replace(/^data:\s*/, "");
            if (!jsonText) continue;

            let event: {
              type: string;
              text?: string;
              response?: string;
              error?: string;
              ragSources?: RagSource[];
              risk_level?: RiskLevel;
              clinical_notes?: string[];
              mode?: ChatMode;
            };
            try {
              event = JSON.parse(jsonText);
            } catch {
              continue;
            }

            if (event.type === "rag" && Array.isArray(event.ragSources)) {
              ragSources = event.ragSources;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? {
                        ...m,
                        ragSources: filterVisibleRagSources(ragSources),
                      }
                    : m,
                ),
              );
            } else if (event.type === "delta" && event.text) {
              raw += event.text;
              if (isQa || event.mode === "qa") {
                applyPartial(raw);
              } else {
                const partial = extractPartialResponseField(raw);
                if (partial !== null) applyPartial(partial);
              }
            } else if (event.type === "done") {
              const finalText =
                typeof event.response === "string"
                  ? event.response
                  : isQa
                    ? raw.trim()
                    : extractPartialResponseField(raw) || raw;
              const finalSources = filterVisibleRagSources(
                Array.isArray(event.ragSources) ? event.ragSources : ragSources,
              );
              const riskLevel = event.risk_level ?? "none";
              const clinicalNotes = Array.isArray(event.clinical_notes)
                ? event.clinical_notes.filter(
                    (n) => typeof n === "string" && n.trim(),
                  )
                : [];

              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? {
                        ...m,
                        content: finalText,
                        ragSources: finalSources,
                        clinicalNotes,
                        riskLevel,
                        streaming: false,
                      }
                    : m,
                ),
              );

              if (isElevatedRisk(riskLevel)) {
                setActiveRisk(riskLevel);
              }
              setRetryPayload(null);
            } else if (event.type === "aborted") {
              setMessages((prev) => {
                const current = prev.find((m) => m.id === assistantId);
                if (!current?.content.trim()) {
                  return prev.filter((m) => m.id !== assistantId);
                }
                return prev.map((m) =>
                  m.id === assistantId ? { ...m, streaming: false } : m,
                );
              });
            } else if (event.type === "error") {
              throw new Error(
                event.error || "Error en el asistente clínico",
              );
            }
          }
        }
      } catch (err: unknown) {
        if (controller.signal.aborted) {
          setMessages((prev) => {
            const current = prev.find((m) => m.id === assistantId);
            if (!current?.content.trim()) {
              return prev.filter((m) => m.id !== assistantId);
            }
            return prev.map((m) =>
              m.id === assistantId ? { ...m, streaming: false } : m,
            );
          });
          return;
        }

        const msg =
          err instanceof Error
            ? err.message
            : "Error inesperado en el asistente clínico";
        setError(msg);
        setRetryPayload(payload);
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
        setIsTyping(false);
      }
    },
    [authHeaders],
  );

  const handleSendMessage = (override?: RetryPayload) => {
    if (isTyping && !override) return;

    const payload: RetryPayload | null = override
      ? override
      : (() => {
          const userMessage = value.trim();
          if (!userMessage) return null;
          return {
            message: userMessage,
            history: messages.map(({ role, content }) => ({ role, content })),
            mode: chatMode,
          };
        })();

    if (!payload) return;

    if (!override) {
      setValue("");
      adjustHeight(true);
    }

    const assistantId = `assistant-${Date.now()}`;
    setMessages((prev) => {
      const base = override
        ? prev
        : [
            ...prev,
            {
              id: `user-${Date.now()}`,
              role: "user" as const,
              content: payload.message,
            },
          ];
      return [
        ...base,
        {
          id: assistantId,
          role: "assistant",
          content: "",
          streaming: true,
        },
      ];
    });

    void runMotusStream(payload, assistantId);
  };

  const handleStop = () => {
    abortRef.current?.abort();
  };

  const handleRetry = () => {
    if (!retryPayload || isTyping) return;
    handleSendMessage(retryPayload);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isTyping) {
        handleSendMessage();
      }
    }
  };

  const fillExample = () => {
    if (isTyping) return;
    setValue(chatMode === "qa" ? qaExample : clinicalExample);
    requestAnimationFrame(() => adjustHeight());
  };

  const humanMailHref = `mailto:${MOTUS_HUMAN_SUPPORT_MAIL}?subject=${encodeURIComponent(
    "MotusAI — solicitar acompañamiento humano",
  )}&body=${encodeURIComponent(
    "Hola MotusDAO,\n\nNecesito hablar con una persona del equipo / un profesional.\n\nContexto (sin datos identificables de pacientes):\n",
  )}`;

  return (
    <div
      className={cn(
        "relative flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-transparent",
        isLight ? "text-slate-900" : "text-white",
        fullScreen ? "h-full p-4 sm:p-6" : "h-full",
      )}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/4 top-0 h-96 w-96 animate-pulse rounded-full bg-violet-500/10 blur-[128px] filter" />
        <div className="absolute bottom-0 right-1/4 h-96 w-96 animate-pulse rounded-full bg-indigo-500/10 blur-[128px] delay-700 filter" />
        <div className="absolute right-1/3 top-1/4 h-64 w-64 animate-pulse rounded-full bg-fuchsia-500/10 blur-[96px] delay-1000 filter" />
      </div>

      <div className="relative mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col">
        <motion.div
          className="relative z-10 flex min-h-0 flex-1 flex-col gap-4 sm:gap-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="shrink-0 space-y-3 text-center">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-block"
            >
              <h1 className="bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 bg-clip-text pb-1 text-2xl font-medium tracking-tight text-transparent sm:text-3xl">
                {chatMode === "qa"
                  ? "¿Qué quieres saber de MotusDAO?"
                  : "¿Cómo puedo ayudarte hoy?"}
              </h1>
              <motion.div
                className="h-px bg-gradient-to-r from-violet-500/0 via-fuchsia-400/70 to-pink-500/0"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "100%", opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.8 }}
              />
            </motion.div>
            <motion.p
              className={cn(
                "text-sm",
                isLight
                  ? "text-slate-600"
                  : "bg-gradient-to-r from-violet-300/90 to-pink-400/85 bg-clip-text text-transparent",
              )}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {chatMode === "qa"
                ? "Respuestas con contexto verificado del knowledge Motus"
                : "Consulta clínica o supervisión analítica"}
            </motion.p>

            <div
              className={cn(
                "mx-auto flex w-full max-w-md rounded-xl border p-1",
                isLight
                  ? "border-slate-300/80 bg-white/80"
                  : "border-white/[0.08] bg-white/[0.03]",
              )}
              role="tablist"
              aria-label="Modo de chat"
            >
              <button
                type="button"
                role="tab"
                aria-selected={chatMode === "supervision"}
                disabled={isTyping}
                onClick={() => switchMode("supervision")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors sm:text-sm",
                  chatMode === "supervision"
                    ? isLight
                      ? "bg-slate-900 text-white"
                      : "bg-white text-black"
                    : isLight
                      ? "text-slate-600 hover:bg-slate-100"
                      : "text-white/60 hover:bg-white/[0.06]",
                  isTyping && "opacity-60",
                )}
              >
                <Stethoscope className="h-3.5 w-3.5" />
                Supervisión clínica
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={chatMode === "qa"}
                disabled={isTyping}
                onClick={() => switchMode("qa")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors sm:text-sm",
                  chatMode === "qa"
                    ? isLight
                      ? "bg-slate-900 text-white"
                      : "bg-white text-black"
                    : isLight
                      ? "text-slate-600 hover:bg-slate-100"
                      : "text-white/60 hover:bg-white/[0.06]",
                  isTyping && "opacity-60",
                )}
              >
                <BookOpen className="h-3.5 w-3.5" />
                Preguntas MotusDAO
              </button>
            </div>
          </div>

          <AnimatePresence>
            {isElevatedRisk(activeRisk ?? undefined) && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className={cn(
                  "shrink-0 rounded-xl border px-4 py-3 text-sm",
                  activeRisk === "emergency"
                    ? isLight
                      ? "border-red-400 bg-red-50 text-red-950"
                      : "border-red-500/40 bg-red-500/15 text-red-100"
                    : isLight
                      ? "border-amber-400 bg-amber-50 text-amber-950"
                      : "border-amber-500/40 bg-amber-500/15 text-amber-100",
                )}
                role="alert"
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="font-medium">
                      {activeRisk === "emergency"
                        ? "Señal de riesgo alto / emergencia detectada"
                        : "Señal de riesgo elevado detectada"}
                    </p>
                    <p className="text-xs opacity-90">
                      MotusAI no puede manejar crisis de forma autónoma. Si hay
                      riesgo inminente, contacta servicios de emergencia locales
                      o una línea de ayuda. Esta IA no sustituye juicio clínico
                      humano.
                    </p>
                    <ul className="grid gap-1 text-xs sm:grid-cols-2">
                      {LATAM_CRISIS_RESOURCES.map((r) => (
                        <li key={r.country}>
                          <span className="font-medium">{r.country}:</span>{" "}
                          {r.line}
                        </li>
                      ))}
                    </ul>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <a
                        href={humanMailHref}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium",
                          isLight
                            ? "bg-slate-900 text-white"
                            : "bg-white text-black",
                        )}
                      >
                        <PhoneCall className="h-3.5 w-3.5" />
                        Hablar con humano
                      </a>
                      <button
                        type="button"
                        onClick={() => setActiveRisk(null)}
                        className="rounded-lg px-3 py-1.5 text-xs underline-offset-2 hover:underline"
                      >
                        Ocultar aviso
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className={cn(
                  "flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm",
                  isLight
                    ? "border-red-300 bg-red-50 text-red-800"
                    : "border-red-500/30 bg-red-500/10 text-red-200",
                )}
                role="alert"
              >
                <p className="min-w-0 flex-1">{error}</p>
                <button
                  type="button"
                  onClick={handleRetry}
                  disabled={!retryPayload || isTyping}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                    isLight
                      ? "bg-red-100 text-red-900 hover:bg-red-200 disabled:opacity-50"
                      : "bg-red-500/20 text-red-100 hover:bg-red-500/30 disabled:opacity-50",
                  )}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reintentar
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {endedCert && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="shrink-0 space-y-3"
              >
                <CertificateNftCard
                  sessionId={endedCert.sessionId}
                  mintTxHash={endedCert.mintTxHash}
                  label={endedCert.label}
                  compact
                />
                <p className="text-center text-xs text-muted-foreground">
                  Sesión finalizada.{" "}
                  <Link
                    href="/certificados"
                    className="text-violet-300 underline-offset-2 hover:underline"
                  >
                    Ver en Certificados
                  </Link>{" "}
                  o{" "}
                  <Link
                    href="/perfil"
                    className="text-violet-300 underline-offset-2 hover:underline"
                  >
                    Perfil
                  </Link>
                  .
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <div
            ref={messagesContainerRef}
            className={cn(
              "min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-y-contain rounded-2xl border p-4",
              isLight
                ? "border-slate-300/70 bg-white/70"
                : "border-white/[0.05] bg-black/20",
            )}
            aria-live="polite"
            aria-label="Mensajes del chat"
          >
            {messages.length === 0 && (
              <p
                className={cn(
                  "text-sm",
                  isLight ? "text-slate-600" : "text-white/35",
                )}
              >
                {chatMode === "qa"
                  ? "Pregunta por el Pase Motus, academia, pagos, gobernanza u otros temas del ecosistema. Las respuestas se apoyan en Fuentes Motus cuando hay coincidencia."
                  : "Describe brevemente tu caso clínico (anónimo) o tu duda de supervisión, y el asistente responderá según el marco ético‑lógico de MotusAI."}
              </p>
            )}
            {messages.map((m) => {
              const visibleSources = filterVisibleRagSources(m.ragSources);
              const showNotes =
                isPsm &&
                m.role === "assistant" &&
                !m.streaming &&
                (m.clinicalNotes?.length ?? 0) > 0;

              return (
                <div
                  key={m.id}
                  className={cn(
                    "flex w-full",
                    m.role === "user" ? "justify-end" : "justify-start",
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[88%] rounded-2xl px-3 py-2 text-sm sm:max-w-[80%]",
                      m.role === "user"
                        ? isLight
                          ? "bg-slate-900 text-white"
                          : "bg-white text-black"
                        : isLight
                          ? "border border-slate-200 bg-white text-slate-800"
                          : "bg-white/[0.06] text-white/90",
                      m.role === "assistant" &&
                        isElevatedRisk(m.riskLevel) &&
                        (isLight
                          ? "ring-1 ring-amber-400/60"
                          : "ring-1 ring-amber-400/40"),
                    )}
                  >
                    {m.role === "assistant" ? (
                      m.content ? (
                        <div
                          className={cn(
                            "motusai-md max-w-none",
                            "[&_p]:mb-2 [&_p:last-child]:mb-0",
                            "[&_ul]:mb-2 [&_ul]:list-disc [&_ul]:pl-4",
                            "[&_ol]:mb-2 [&_ol]:list-decimal [&_ol]:pl-4",
                            "[&_strong]:font-semibold",
                            "[&_h1]:mb-2 [&_h1]:text-base [&_h1]:font-semibold",
                            "[&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold",
                            "[&_h3]:mb-1.5 [&_h3]:text-sm [&_h3]:font-semibold",
                            "[&_a]:underline",
                            isLight
                              ? "[&_strong]:text-slate-900"
                              : "[&_strong]:text-violet-200",
                          )}
                          dangerouslySetInnerHTML={{
                            __html: renderMarkdown(m.content),
                          }}
                        />
                      ) : (
                        <span
                          className={cn(
                            "inline-flex items-center gap-2 text-xs",
                            isLight ? "text-slate-500" : "text-white/50",
                          )}
                        >
                          Generando
                          <TypingDots dim={!isLight} />
                        </span>
                      )
                    ) : (
                      m.content
                    )}

                    {showNotes && (
                      <details
                        className={cn(
                          "mt-2 rounded-lg border px-2 py-1.5 text-xs",
                          isLight
                            ? "border-slate-200 bg-slate-50 text-slate-700"
                            : "border-white/10 bg-white/[0.04] text-white/75",
                        )}
                      >
                        <summary className="flex cursor-pointer list-none items-center gap-1.5 font-medium">
                          <ClipboardList className="h-3.5 w-3.5" />
                          Notas de supervisión ({m.clinicalNotes!.length})
                        </summary>
                        <ul className="mt-2 list-disc space-y-1 pl-4">
                          {m.clinicalNotes!.map((note, i) => (
                            <li key={`${m.id}-note-${i}`}>{note}</li>
                          ))}
                        </ul>
                      </details>
                    )}

                    {m.role === "assistant" &&
                      visibleSources.length > 0 &&
                      !m.streaming && (
                        <details
                          className={cn(
                            "mt-2 text-xs opacity-80",
                            isLight ? "text-slate-600" : "text-white/70",
                          )}
                        >
                          <summary className="cursor-pointer">
                            Fuentes Motus ({visibleSources.length})
                          </summary>
                          <ul className="mt-1 list-disc space-y-1 pl-4">
                            {visibleSources.map((src) => (
                              <li key={`${src.sourcePath}-${src.similarity}`}>
                                [{src.namespace}] {src.title} ·{" "}
                                {src.similarity.toFixed(3)}
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                  </div>
                </div>
              );
            })}
          </div>

          <motion.div
            className={cn(
              "relative shrink-0 rounded-2xl border shadow-2xl backdrop-blur-2xl",
              isLight
                ? "border-slate-300/70 bg-white/70"
                : "border-white/[0.05] bg-white/[0.02]",
            )}
            initial={{ scale: 0.98 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <div className="p-4">
              <Textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  adjustHeight();
                }}
                onKeyDown={handleKeyDown}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                placeholder={
                  chatMode === "qa"
                    ? "Pregunta sobre MotusDAO, Pase Motus, academia…"
                    : "Describe tu caso clínico o consulta de supervisión…"
                }
                containerClassName="w-full"
                disabled={isTyping}
                aria-label="Escribe tu mensaje"
                className={cn(
                  "min-h-[60px] w-full resize-none border-none bg-transparent px-4 py-3 text-sm focus:outline-none",
                  isLight
                    ? "text-slate-900 placeholder:text-slate-500"
                    : "text-white/90 placeholder:text-white/20",
                )}
                style={{ overflow: "hidden" }}
                showRing={false}
              />
            </div>

            <div
              className={cn(
                "flex items-center justify-between gap-4 border-t p-4",
                isLight ? "border-slate-300/70" : "border-white/[0.05]",
              )}
            >
              <div className="flex items-center gap-3">
                <motion.button
                  type="button"
                  onClick={fillExample}
                  disabled={isTyping}
                  whileTap={{ scale: 0.94 }}
                  className={cn(
                    "group relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors disabled:opacity-50",
                    isLight
                      ? "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900"
                      : "bg-white/[0.03] text-white/70 hover:bg-white/[0.08] hover:text-white",
                  )}
                >
                  <FileText className="h-4 w-4" />
                  <span>
                    {chatMode === "qa" ? "Ejemplo MotusDAO" : "Caso clinico ejemplo"}
                  </span>
                </motion.button>
                <motion.button
                  type="button"
                  onClick={clearConversation}
                  disabled={isTyping || isEndingSession || messages.length === 0}
                  whileTap={{ scale: 0.94 }}
                  title="Nueva conversación"
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors disabled:opacity-40",
                    isLight
                      ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      : "bg-white/[0.03] text-white/70 hover:bg-white/[0.08]",
                  )}
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Nueva</span>
                </motion.button>
                <motion.button
                  type="button"
                  onClick={() => void endSessionAndMint()}
                  disabled={
                    isTyping ||
                    isEndingSession ||
                    messages.length === 0 ||
                    !authenticated
                  }
                  whileTap={{ scale: 0.94 }}
                  title="Finalizar sesión y mintear certificado NFT"
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors disabled:opacity-40",
                    isLight
                      ? "bg-violet-100 text-violet-800 hover:bg-violet-200"
                      : "bg-violet-500/20 text-violet-200 hover:bg-violet-500/30",
                  )}
                >
                  {isEndingSession ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Award className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">
                    {isEndingSession ? "Minteando…" : "Finalizar"}
                  </span>
                </motion.button>
              </div>

              {isTyping ? (
                <motion.button
                  type="button"
                  onClick={handleStop}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
                    isLight
                      ? "bg-slate-900 text-white shadow-lg shadow-slate-300/60"
                      : "bg-white text-[#0A0A0B] shadow-lg shadow-white/10",
                  )}
                >
                  <Square className="h-3.5 w-3.5 fill-current" />
                  <span>Detener</span>
                </motion.button>
              ) : (
                <motion.button
                  type="button"
                  onClick={() => handleSendMessage()}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={!value.trim()}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
                    value.trim()
                      ? isLight
                        ? "bg-slate-900 text-white shadow-lg shadow-slate-300/60"
                        : "bg-white text-[#0A0A0B] shadow-lg shadow-white/10"
                      : isLight
                        ? "bg-slate-200/80 text-slate-500"
                        : "bg-white/[0.05] text-white/40",
                  )}
                >
                  <SendIcon className="h-4 w-4" />
                  <span>Enviar</span>
                </motion.button>
              )}
            </div>

            <div
              className={cn(
                "border-t px-4 pb-4 pt-3 text-xs",
                isLight
                  ? "border-slate-300/70 text-slate-600"
                  : "border-white/[0.05] text-white/60",
              )}
            >
              <div className="flex items-center gap-2">
                <Image
                  src="/venice-logo.svg"
                  alt="Venice"
                  width={14}
                  height={14}
                  className="rounded-sm"
                />
                <span
                  className={cn(
                    "font-medium",
                    isLight ? "text-slate-700" : "text-white/80",
                  )}
                >
                  Powered by Venice
                </span>
                {isTyping && (
                  <span className="inline-flex items-center gap-1.5 text-[11px] opacity-80">
                    <LoaderIcon className="h-3 w-3 animate-spin" />
                    Generando…
                  </span>
                )}
              </div>
              <p className="mt-1">
                Venice prioriza privacidad y anonimato: no vincules información
                sensible ni datos identificables de pacientes.
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {inputFocused && (
        <motion.div
          className="pointer-events-none fixed z-0 h-[50rem] w-[50rem] rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-500 opacity-[0.02] blur-[96px]"
          animate={{
            x: mousePosition.x - 400,
            y: mousePosition.y - 400,
          }}
          transition={{
            type: "spring",
            damping: 25,
            stiffness: 150,
            mass: 0.5,
          }}
        />
      )}
    </div>
  );
}

function TypingDots({ dim = false }: { dim?: boolean }) {
  return (
    <div className="ml-0.5 flex items-center">
      {[1, 2, 3].map((dot) => (
        <motion.div
          key={dot}
          className={cn(
            "mx-0.5 h-1.5 w-1.5 rounded-full",
            dim ? "bg-white/70" : "bg-slate-500",
          )}
          initial={{ opacity: 0.3 }}
          animate={{
            opacity: [0.3, 0.9, 0.3],
            scale: [0.85, 1.1, 0.85],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: dot * 0.15,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
