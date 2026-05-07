"use client";

import { AnimatedAIChat } from "@/components/ui/animated-ai-chat";
import { CTAButton } from "@/components/ui/CTAButton";
import { useEffect } from "react";
import { useUIStore } from "@/lib/store";
import { useWaaP } from "@/lib/contexts/WaaPProvider";
import { useRouter } from "next/navigation";

export default function MotusAIPage() {
  const { theme } = useUIStore();
  const isLight = theme === "light";
  const { ready, authenticated, login } = useWaaP();
  const router = useRouter();

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
            Esta IA es experimental y de apoyo a la supervisión clínica para profesionales capacitados. Úsala con criterio ético y profesional: no sustituye juicio clínico, diagnóstico ni intervención de emergencia.
          </div>
          <AnimatedAIChat fullScreen={false} />
        </div>
      </div>
    </div>
  );
}

