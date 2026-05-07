"use client";

import { AnimatedAIChat } from "@/components/ui/animated-ai-chat";
import { CTAButton } from "@/components/ui/CTAButton";
import { Brain, MessageSquare, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useUIStore } from "@/lib/store";
import { useWaaP } from "@/lib/contexts/WaaPProvider";
import { useRouter } from "next/navigation";

export default function MotusAIPage() {
  const { role } = useUIStore();
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
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8 text-center">
            <h2 className="mb-3 text-2xl font-semibold text-white/90">Acceso requerido</h2>
            <p className="mb-6 text-sm text-white/60">
              Inicia sesión con WaaP para usar el chat.
            </p>
            <CTAButton onClick={() => void login()}>Entrar con WaaP</CTAButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6 md:px-6">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <div className="mb-3 rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-2 text-xs text-amber-200">
            Aviso experimental: pronto agregaremos aquí el disclaimer clínico completo.
          </div>
          <AnimatedAIChat fullScreen={false} />
          {pendingQuickAction && (
            <p className="mt-3 text-sm text-muted-foreground">
              Accion seleccionada: {pendingQuickAction}. Te la dejo lista para
              pegar en el chat.
            </p>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.015] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
            <h3 className="mb-4 flex items-center font-semibold text-white/90">
              <Sparkles className="mr-2 h-5 w-5 text-white/70" />
              Acciones Rapidas
            </h3>
            <div className="space-y-2">
              {role === "usuario" && (
                <>
                  <CTAButton
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start rounded-lg border border-white/[0.025] bg-white/[0.01] text-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.015)] hover:border-white/[0.045] hover:bg-white/[0.035] hover:text-white"
                    onClick={() => setPendingQuickAction("Como puedo manejar la ansiedad?")}
                  >
                    <Brain className="mr-2 h-4 w-4" />
                    Manejar Ansiedad
                  </CTAButton>
                  <CTAButton
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start rounded-lg border border-white/[0.025] bg-white/[0.01] text-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.015)] hover:border-white/[0.045] hover:bg-white/[0.035] hover:text-white"
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
                  className="w-full justify-start rounded-lg border border-white/[0.025] bg-white/[0.01] text-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.015)] hover:border-white/[0.045] hover:bg-white/[0.035] hover:text-white"
                  onClick={() => setPendingQuickAction("Activa Modo Supervisor")}
                >
                  <Brain className="mr-2 h-4 w-4" />
                  Modo Supervisor
                </CTAButton>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.015] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
            <h3 className="mb-4 font-semibold text-white/90">Historial de Chats</h3>
            <div className="space-y-2">
              <div className="cursor-pointer rounded-lg border border-white/[0.025] bg-white/[0.01] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.015)] transition-colors hover:border-white/[0.045] hover:bg-white/[0.035]">
                <p className="text-sm font-medium text-white/85">Conversacion de hoy</p>
                <p className="text-xs text-white/45">Hace 2 horas</p>
              </div>
              <div className="cursor-pointer rounded-lg border border-white/[0.025] bg-white/[0.01] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.015)] transition-colors hover:border-white/[0.045] hover:bg-white/[0.035]">
                <p className="text-sm font-medium text-white/85">Tecnicas de respiracion</p>
                <p className="text-xs text-white/45">Ayer</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

