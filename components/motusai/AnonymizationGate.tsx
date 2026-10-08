"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { setAnonymizationAck } from "@/lib/motusai-anon-ack";

type AnonymizationGateProps = {
  isLight: boolean;
  onProceed: () => void;
};

export function AnonymizationGate({
  isLight,
  onProceed,
}: AnonymizationGateProps) {
  const [confirmed, setConfirmed] = useState(false);

  function handleProceed() {
    if (!confirmed) return;
    setAnonymizationAck();
    onProceed();
  }

  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-4 text-sm",
        isLight
          ? "border-slate-200 bg-white/90 text-slate-800"
          : "border-white/10 bg-white/[0.04] text-white/85",
      )}
    >
      <div className="mb-3 flex items-start gap-2">
        <ShieldCheck
          className={cn(
            "mt-0.5 h-5 w-5 shrink-0",
            isLight ? "text-slate-600" : "text-white/70",
          )}
        />
        <div>
          <h3
            className={cn(
              "font-semibold",
              isLight ? "text-slate-900" : "text-white/90",
            )}
          >
            Antes de continuar
          </h3>
          <p
            className={cn(
              "mt-1 text-xs",
              isLight ? "text-slate-600" : "text-white/55",
            )}
          >
            MotusAI es una herramienta de apoyo reflexivo y educativo para
            profesionales y estudiantes adultos. No es diagnóstico, tratamiento,
            psicoterapia, servicio de emergencia ni sustituto del juicio
            profesional.
          </p>
        </div>
      </div>

      <label
        className={cn(
          "flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2 text-xs transition-colors",
          isLight
            ? "border-slate-200 hover:bg-slate-50"
            : "border-white/10 hover:bg-white/[0.06]",
        )}
      >
        <input
          type="checkbox"
          className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-violet-600"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
        />
        <span>
          Confirmo que el material que compartiré fue previamente disociado y
          que eliminé información que permita identificar al paciente.
        </span>
      </label>

      <p
        className={cn(
          "mt-3 text-xs",
          isLight ? "text-slate-600" : "text-white/55",
        )}
      >
        No compartas nombres, teléfonos, emails, direcciones, documentos,
        fechas precisas u otros datos que identifiquen a pacientes o terceros.
        Este checkbox no anonimiza ni detecta datos automáticamente. Las
        respuestas de IA pueden ser incorrectas y deben revisarse.
      </p>

      <button
        type="button"
        disabled={!confirmed}
        onClick={handleProceed}
        className={cn(
          "mt-4 w-full rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
          confirmed
            ? isLight
              ? "bg-slate-900 text-white hover:bg-slate-800"
              : "bg-white text-black hover:bg-white/90"
            : isLight
              ? "cursor-not-allowed bg-slate-200 text-slate-400"
              : "cursor-not-allowed bg-white/10 text-white/35",
        )}
      >
        Continuar
      </button>
    </div>
  );
}
