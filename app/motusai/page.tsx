"use client";

import { AnimatedAIChat } from "@/components/ui/animated-ai-chat";
import { CTAButton } from "@/components/ui/CTAButton";
import { Brain, MessageSquare, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useUIStore } from "@/lib/store";
import { useWaaP } from "@/lib/contexts/WaaPProvider";
import { useRouter } from "next/navigation";

export default function MotusAIPage() {
  const { role, theme } = useUIStore();
  const isLight = theme === "light";
  const { ready, authenticated, login } = useWaaP();
  const router = useRouter();
  const [pendingQuickAction, setPendingQuickAction] = useState("");

  useEffect(() => {
    if (ready && !authenticated) {
      router.replace("/");
    }
  }, [ready, authenticated, router]);

  if (!ready || !authenticated) {
    return (
      <div className="min-h-screen bg-background px-4 py-8 md:px-6">
        <div className="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center">
          <div
            className={`rounded-2xl border p-8 text-center ${
              isLight ? "border-slate-300 bg-white/80" : "border-white/[0.08] bg-white/[0.02]"
            }`}
          >
            <h2 className={`mb-3 text-2xl font-semibold ${isLight ? "text-slate-900" : "text-white/90"}`}>
              Acceso requerido
            </h2>
            <p className={`mb-6 text-sm ${isLight ? "text-slate-600" : "text-white/60"}`}>
              Inicia sesión con WaaP para usar el chat.
            </p>
            <CTAButton onClick={() => void login()}>Entrar con WaaP</CTAButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 md:px-6">
        <div className="w-full max-w-2xl">
          <div
            className={`mb-3 rounded-xl border px-4 py-2 text-xs ${
              isLight
                ? "border-amber-400/40 bg-amber-100 text-amber-900"
                : "border-amber-400/20 bg-amber-400/10 text-amber-200"
            }`}
          >
            Aviso experimental: pronto agregaremos aquí el disclaimer clínico completo.
          </div>
          <AnimatedAIChat fullScreen={false} />
          {pendingQuickAction && (
            <p className="mt-3 text-center text-sm text-muted-foreground">
              Accion seleccionada: {pendingQuickAction}. Te la dejo lista para
              pegar en el chat.
            </p>
          )}
        </div>
      </div>

      <div
        className={`mt-auto border-t px-4 py-6 backdrop-blur-sm md:px-6 ${
          isLight ? "border-slate-300/70 bg-white/50" : "border-white/[0.012] bg-black/20"
        }`}
      >
        <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-6 md:grid-cols-2">
          <div
            className={`rounded-2xl border p-6 backdrop-blur-2xl ${
              isLight
                ? "border-slate-300/70 bg-white/70 shadow-[0_10px_30px_rgba(15,23,42,0.08)]"
                : "border-white/[0.006] bg-white/[0.015] shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
            }`}
          >
            <h3 className={`mb-4 flex items-center font-semibold ${isLight ? "text-slate-900" : "text-white/90"}`}>
              <Sparkles className={`mr-2 h-5 w-5 ${isLight ? "text-slate-600" : "text-white/70"}`} />
              Acciones Rapidas
            </h3>
            <div className="space-y-2">
              {role === "usuario" && (
                <>
                  <CTAButton
                    variant="ghost"
                    size="sm"
                    className={`w-full justify-start rounded-lg border ${
                      isLight
                        ? "border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900"
                        : "border-white/[0.003] bg-white/[0.01] text-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.015)] hover:border-white/[0.008] hover:bg-white/[0.035] hover:text-white"
                    }`}
                    onClick={() => setPendingQuickAction("Como puedo manejar la ansiedad?")}
                  >
                    <Brain className="mr-2 h-4 w-4" />
                    Manejar Ansiedad
                  </CTAButton>
                  <CTAButton
                    variant="ghost"
                    size="sm"
                    className={`w-full justify-start rounded-lg border ${
                      isLight
                        ? "border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900"
                        : "border-white/[0.003] bg-white/[0.01] text-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.015)] hover:border-white/[0.008] hover:bg-white/[0.035] hover:text-white"
                    }`}
                    onClick={() => setPendingQuickAction("Necesito tecnicas de relajacion")}
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Tecnicas de Relajacion
                  </CTAButton>
                </>
              )}
              {role === "psm" && (
                <CTAButton
                  variant="ghost"
                  size="sm"
                  className={`w-full justify-start rounded-lg border ${
                    isLight
                      ? "border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900"
                      : "border-white/[0.003] bg-white/[0.01] text-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.015)] hover:border-white/[0.008] hover:bg-white/[0.035] hover:text-white"
                  }`}
                  onClick={() => setPendingQuickAction("Activa Modo Supervisor")}
                >
                  <Brain className="mr-2 h-4 w-4" />
                  Modo Supervisor
                </CTAButton>
              )}
            </div>
          </div>

          <div
            className={`rounded-2xl border p-6 backdrop-blur-2xl ${
              isLight
                ? "border-slate-300/70 bg-white/70 shadow-[0_10px_30px_rgba(15,23,42,0.08)]"
                : "border-white/[0.006] bg-white/[0.015] shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
            }`}
          >
            <h3 className={`mb-4 font-semibold ${isLight ? "text-slate-900" : "text-white/90"}`}>Historial de Chats</h3>
            <div className="space-y-2">
              <div
                className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                  isLight
                    ? "border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50"
                    : "border-white/[0.003] bg-white/[0.01] shadow-[inset_0_1px_0_rgba(255,255,255,0.015)] hover:border-white/[0.008] hover:bg-white/[0.035]"
                }`}
              >
                <p className={`text-sm font-medium ${isLight ? "text-slate-800" : "text-white/85"}`}>Conversacion de hoy</p>
                <p className={`text-xs ${isLight ? "text-slate-500" : "text-white/45"}`}>Hace 2 horas</p>
              </div>
              <div
                className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                  isLight
                    ? "border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50"
                    : "border-white/[0.003] bg-white/[0.01] shadow-[inset_0_1px_0_rgba(255,255,255,0.015)] hover:border-white/[0.008] hover:bg-white/[0.035]"
                }`}
              >
                <p className={`text-sm font-medium ${isLight ? "text-slate-800" : "text-white/85"}`}>Tecnicas de respiracion</p>
                <p className={`text-xs ${isLight ? "text-slate-500" : "text-white/45"}`}>Ayer</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

