"use client";

import * as React from "react";
import { useEffect, useRef, useCallback, useTransition, useState } from "react";
import { cn } from "@/lib/utils";
import {
  ImageIcon,
  Figma,
  MonitorIcon,
  Paperclip,
  SendIcon,
  XIcon,
  LoaderIcon,
  Sparkles,
  Command,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useUIStore } from "@/lib/store";

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

interface CommandSuggestion {
  icon: React.ReactNode;
  label: string;
  description: string;
  prefix: string;
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

interface AnimatedAIChatProps {
  fullScreen?: boolean;
}

export function AnimatedAIChat({ fullScreen = true }: AnimatedAIChatProps) {
  const containerHeightClass = fullScreen ? "min-h-screen" : "min-h-[640px]";
  const { theme } = useUIStore();
  const isLight = theme === "light";
  const [value, setValue] = useState("");
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [, startTransition] = useTransition();
  const [activeSuggestion, setActiveSuggestion] = useState<number>(-1);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [recentCommand, setRecentCommand] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 60,
    maxHeight: 200,
  });
  const [inputFocused, setInputFocused] = useState(false);
  const commandPaletteRef = useRef<HTMLDivElement>(null);

  const commandSuggestions: CommandSuggestion[] = [
    {
      icon: <ImageIcon className="h-4 w-4" />,
      label: "Clone UI",
      description: "Generate a UI from a screenshot",
      prefix: "/clone",
    },
    {
      icon: <Figma className="h-4 w-4" />,
      label: "Import Figma",
      description: "Import a design from Figma",
      prefix: "/figma",
    },
    {
      icon: <MonitorIcon className="h-4 w-4" />,
      label: "Create Page",
      description: "Generate a new web page",
      prefix: "/page",
    },
    {
      icon: <Sparkles className="h-4 w-4" />,
      label: "Improve",
      description: "Improve existing UI design",
      prefix: "/improve",
    },
  ];

  useEffect(() => {
    if (value.startsWith("/") && !value.includes(" ")) {
      setShowCommandPalette(true);

      const matchingSuggestionIndex = commandSuggestions.findIndex((cmd) =>
        cmd.prefix.startsWith(value),
      );

      if (matchingSuggestionIndex >= 0) {
        setActiveSuggestion(matchingSuggestionIndex);
      } else {
        setActiveSuggestion(-1);
      }
    } else {
      setShowCommandPalette(false);
    }
  }, [value, commandSuggestions]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const commandButton = document.querySelector("[data-command-button]");

      if (
        commandPaletteRef.current &&
        !commandPaletteRef.current.contains(target) &&
        !commandButton?.contains(target)
      ) {
        setShowCommandPalette(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSendMessage = () => {
    const userMessage = value.trim();
    if (!userMessage) return;

    setValue("");
    adjustHeight(true);

    startTransition(() => {
      setIsTyping(true);
      const priorMessages = messages;
      const nextMessages: { role: "user" | "assistant"; content: string }[] = [
        ...messages,
        { role: "user", content: userMessage },
      ];
      setMessages(nextMessages);

      fetch("/api/motusai", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: userMessage,
            language: "es",
            conversation_type: "professional_supervision",
            // Prior turns only; API appends `message` — avoids duplicating the last user turn
            history: priorMessages,
          }),
        })
          .then(async (res) => {
            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              throw new Error(
                (data as { error?: string }).error ||
                  "Error en el asistente clínico",
              );
            }
            return res.json() as Promise<{
              response: string;
            }>;
          })
          .then((data) => {
            setMessages((prev) => [
              ...prev,
              { role: "assistant", content: data.response },
            ]);
          })
          .catch((err: unknown) => {
            const msg =
              err instanceof Error
                ? err.message
                : "Error inesperado en el asistente clínico";
            setMessages((prev) => [
              ...prev,
              { role: "assistant", content: msg },
            ]);
          })
          .finally(() => {
            setIsTyping(false);
          });
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showCommandPalette) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveSuggestion((prev) =>
          prev < commandSuggestions.length - 1 ? prev + 1 : 0,
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveSuggestion((prev) =>
          prev > 0 ? prev - 1 : commandSuggestions.length - 1,
        );
      } else if (e.key === "Tab" || e.key === "Enter") {
        e.preventDefault();
        if (activeSuggestion >= 0) {
          const selectedCommand = commandSuggestions[activeSuggestion];
          setValue(`${selectedCommand.prefix} `);
          setShowCommandPalette(false);

          setRecentCommand(selectedCommand.label);
          setTimeout(() => setRecentCommand(null), 3500);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setShowCommandPalette(false);
      }
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim()) {
        handleSendMessage();
      }
    }
  };

  const handleAttachFile = () => {
    const mockFileName = `file-${Math.floor(Math.random() * 1000)}.pdf`;
    setAttachments((prev) => [...prev, mockFileName]);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const selectCommandSuggestion = (index: number) => {
    const selectedCommand = commandSuggestions[index];
    setValue(`${selectedCommand.prefix} `);
    setShowCommandPalette(false);

    setRecentCommand(selectedCommand.label);
    setTimeout(() => setRecentCommand(null), 2000);
  };

  return (
    <div
      className={cn(
        "relative flex w-full flex-col items-center justify-center overflow-hidden bg-transparent p-6",
        isLight ? "text-slate-900" : "text-white",
        containerHeightClass,
      )}
    >
      <div className="absolute inset-0 h-full w-full overflow-hidden">
        <div className="absolute left-1/4 top-0 h-96 w-96 animate-pulse rounded-full bg-violet-500/10 blur-[128px] filter" />
        <div className="absolute bottom-0 right-1/4 h-96 w-96 animate-pulse rounded-full bg-indigo-500/10 blur-[128px] delay-700 filter" />
        <div className="absolute right-1/3 top-1/4 h-64 w-64 animate-pulse rounded-full bg-fuchsia-500/10 blur-[96px] delay-1000 filter" />
      </div>
      <div className="relative mx-auto w-full max-w-2xl">
        <motion.div
          className="relative z-10 space-y-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="space-y-3 text-center">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-block"
            >
              <h1 className="bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 bg-clip-text pb-1 text-3xl font-medium tracking-tight text-transparent">
                How can I help today?
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
                isLight ? "text-slate-600" : "bg-gradient-to-r from-violet-300/90 to-pink-400/85 bg-clip-text text-transparent",
              )}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              Type a command or ask a question
            </motion.p>
          </div>

          {/* Messages list */}
          <div
            className={cn(
              "max-h-[360px] space-y-3 overflow-y-auto rounded-2xl border p-4",
              isLight
                ? "border-slate-300/70 bg-white/70"
                : "border-white/[0.05] bg-black/20",
            )}
          >
            {messages.length === 0 && (
              <p className={cn("text-sm", isLight ? "text-slate-600" : "text-white/35")}>
                Describe brevemente tu caso clínico (anónimo) o tu duda de
                supervisión, y el asistente responderá según el marco
                ético‑lógico de MotusAI.
              </p>
            )}
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex w-full",
                  m.role === "user" ? "justify-end" : "justify-start",
                )}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                    m.role === "user"
                      ? isLight
                        ? "bg-slate-900 text-white"
                        : "bg-white text-black"
                      : isLight
                        ? "bg-white text-slate-800 border border-slate-200"
                        : "bg-white/[0.06] text-white/90",
                  )}
                >
                  {m.content}
                </div>
              </div>
            ))}
          </div>

          <motion.div
            className={cn(
              "relative rounded-2xl border shadow-2xl backdrop-blur-2xl",
              isLight
                ? "border-slate-300/70 bg-white/70"
                : "border-white/[0.05] bg-white/[0.02]",
            )}
            initial={{ scale: 0.98 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <AnimatePresence>
              {showCommandPalette && (
                <motion.div
                  ref={commandPaletteRef}
                  className="absolute bottom-full left-4 right-4 z-50 mb-2 overflow-hidden rounded-lg border border-white/10 bg-black/90 shadow-lg backdrop-blur-xl"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  transition={{ duration: 0.15 }}
                >
                  <div className={cn("py-1", isLight ? "bg-white/95" : "bg-black/95")}>
                    {commandSuggestions.map((suggestion, index) => (
                      <motion.div
                        key={suggestion.prefix}
                        className={cn(
                          "flex cursor-pointer items-center gap-2 px-3 py-2 text-xs transition-colors",
                          activeSuggestion === index
                            ? isLight
                              ? "bg-slate-100 text-slate-900"
                              : "bg-white/10 text-white"
                            : isLight
                              ? "text-slate-600 hover:bg-slate-100"
                              : "text-white/70 hover:bg-white/5",
                        )}
                        onClick={() => selectCommandSuggestion(index)}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.03 }}
                      >
                        <div className={cn("flex h-5 w-5 items-center justify-center", isLight ? "text-slate-500" : "text-white/60")}>
                          {suggestion.icon}
                        </div>
                        <div className="font-medium">{suggestion.label}</div>
                        <div className={cn("ml-1 text-xs", isLight ? "text-slate-400" : "text-white/40")}>
                          {suggestion.prefix}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

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
                placeholder="Ask zap a question..."
                containerClassName="w-full"
                className={cn(
                  "min-h-[60px] w-full resize-none bg-transparent px-4 py-3 text-sm",
                  "border-none focus:outline-none",
                  isLight ? "text-slate-900 placeholder:text-slate-500" : "text-white/90 placeholder:text-white/20",
                )}
                style={{
                  overflow: "hidden",
                }}
                showRing={false}
              />
            </div>

            <AnimatePresence>
              {attachments.length > 0 && (
                <motion.div
                  className="flex flex-wrap gap-2 px-4 pb-3"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  {attachments.map((file, index) => (
                    <motion.div
                      key={`${file}-${index}`}
                      className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-3 py-1.5 text-xs text-white/70"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                    >
                      <span>{file}</span>
                      <button
                        onClick={() => removeAttachment(index)}
                        className={cn("transition-colors", isLight ? "text-slate-400 hover:text-slate-700" : "text-white/40 hover:text-white")}
                      >
                        <XIcon className="h-3 w-3" />
                      </button>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <div
              className={cn(
                "flex items-center justify-between gap-4 border-t p-4",
                isLight ? "border-slate-300/70" : "border-white/[0.05]",
              )}
            >
              <div className="flex items-center gap-3">
                <motion.button
                  type="button"
                  onClick={handleAttachFile}
                  whileTap={{ scale: 0.94 }}
                  className={cn(
                    "group relative rounded-lg p-2 transition-colors",
                    isLight ? "text-slate-500 hover:text-slate-900" : "text-white/40 hover:text-white/90",
                  )}
                >
                  <Paperclip className="h-4 w-4" />
                  <motion.span
                    className={cn(
                      "absolute inset-0 rounded-lg opacity-0 transition-opacity group-hover:opacity-100",
                      isLight ? "bg-slate-200/60" : "bg-white/[0.05]",
                    )}
                    layoutId="button-highlight"
                  />
                </motion.button>
                <motion.button
                  type="button"
                  data-command-button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowCommandPalette((prev) => !prev);
                  }}
                  whileTap={{ scale: 0.94 }}
                  className={cn(
                    "group relative rounded-lg p-2 text-white/40 transition-colors hover:text-white/90",
                    isLight
                      ? "text-slate-500 hover:text-slate-900"
                      : "text-white/40 hover:text-white/90",
                    showCommandPalette &&
                      (isLight ? "bg-slate-200/80 text-slate-900" : "bg-white/10 text-white/90"),
                  )}
                >
                  <Command className="h-4 w-4" />
                  <motion.span
                    className={cn(
                      "absolute inset-0 rounded-lg opacity-0 transition-opacity group-hover:opacity-100",
                      isLight ? "bg-slate-200/60" : "bg-white/[0.05]",
                    )}
                    layoutId="button-highlight"
                  />
                </motion.button>
              </div>

              <motion.button
                type="button"
                onClick={handleSendMessage}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                disabled={isTyping || !value.trim()}
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
                {isTyping ? (
                  <LoaderIcon className="h-4 w-4 animate-[spin_2s_linear_infinite]" />
                ) : (
                  <SendIcon className="h-4 w-4" />
                )}
                <span>Send</span>
              </motion.button>
            </div>
          </motion.div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {commandSuggestions.map((suggestion, index) => (
              <motion.button
                key={suggestion.prefix}
                onClick={() => selectCommandSuggestion(index)}
                className={cn(
                  "group relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all",
                  isLight
                    ? "bg-white/80 text-slate-600 hover:bg-white hover:text-slate-900 border border-slate-200"
                    : "bg-white/[0.02] text-white/60 hover:bg-white/[0.05] hover:text-white/90",
                )}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                {suggestion.icon}
                <span>{suggestion.label}</span>
                <motion.div
                  className={cn(
                    "absolute inset-0 rounded-lg border",
                    isLight ? "border-slate-200" : "border-white/[0.05]",
                  )}
                  initial={false}
                  animate={{
                    opacity: [0, 1],
                    scale: [0.98, 1],
                  }}
                  transition={{
                    duration: 0.3,
                    ease: "easeOut",
                  }}
                />
              </motion.button>
            ))}
          </div>
          {recentCommand && (
            <p className={cn("text-center text-xs", isLight ? "text-slate-500" : "text-white/40")}>
              Last command: {recentCommand}
            </p>
          )}
        </motion.div>
      </div>

      <AnimatePresence>
        {isTyping && (
          <motion.div
            className="fixed bottom-8 mx-auto -translate-x-1/2 transform rounded-full border border-white/[0.05] bg-white/[0.02] px-4 py-2 shadow-lg backdrop-blur-2xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <div className="flex items-center gap-3">
              <div className={cn("flex h-7 w-8 items-center justify-center rounded-full text-center", isLight ? "bg-slate-200/90" : "bg-white/[0.05]")}>
                <span className={cn("mb-0.5 text-xs font-medium", isLight ? "text-slate-800" : "text-white/90")}>zap</span>
              </div>
              <div className={cn("flex items-center gap-2 text-sm", isLight ? "text-slate-600" : "text-white/70")}>
                <span>Thinking</span>
                <TypingDots />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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

function TypingDots() {
  return (
    <div className="ml-1 flex items-center">
      {[1, 2, 3].map((dot) => (
        <motion.div
          key={dot}
          className="mx-0.5 h-1.5 w-1.5 rounded-full bg-white/90"
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
          style={{
            boxShadow: "0 0 4px rgba(255, 255, 255, 0.3)",
          }}
        />
      ))}
    </div>
  );
}
