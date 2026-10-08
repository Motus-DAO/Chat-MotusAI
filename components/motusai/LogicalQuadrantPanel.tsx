"use client";

import { Binary } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  describeLogicalPosition,
  hasLogicFields,
  type SupervisionLogicFields,
} from "@/lib/motusai-quadrant";

type LogicalQuadrantPanelProps = {
  fields: SupervisionLogicFields;
  isLight: boolean;
  clinicalNotes?: string[];
  showNotes?: boolean;
};

function FieldRow({
  label,
  value,
  isLight,
  mono,
}: {
  label: string;
  value: string;
  isLight: boolean;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt
        className={cn(
          "text-[10px] font-medium uppercase tracking-wide",
          isLight ? "text-slate-500" : "text-white/45",
        )}
      >
        {label}
      </dt>
      <dd
        className={cn(
          "mt-0.5 break-words text-xs",
          mono && "font-mono",
          isLight ? "text-slate-800" : "text-white/85",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

export function LogicalQuadrantPanel({
  fields,
  isLight,
  clinicalNotes,
  showNotes = false,
}: LogicalQuadrantPanelProps) {
  const notes =
    showNotes && clinicalNotes && clinicalNotes.length > 0
      ? clinicalNotes
      : null;

  if (!hasLogicFields(fields) && !notes) return null;

  const position = describeLogicalPosition(fields.logical_position);
  const demand = fields.detected_demand?.trim() || null;
  const primary = fields.primary_signifier?.trim() || null;
  const secondary = fields.secondary_signifier?.trim() || null;
  const pattern = fields.observed_pattern?.trim() || null;

  const positionValue = position
    ? `${position.formula} · ${position.label}`
    : fields.logical_position?.trim() || null;

  return (
    <details
      className={cn(
        "mt-2 rounded-lg border px-2 py-1.5 text-xs",
        isLight
          ? "border-slate-200 bg-slate-50 text-slate-700"
          : "border-white/10 bg-white/[0.04] text-white/75",
      )}
    >
      <summary className="flex cursor-pointer list-none items-center gap-1.5 font-medium">
        <Binary className="h-3.5 w-3.5 shrink-0" />
        Análisis estructurado (hipótesis del modelo)
      </summary>

      <dl className="mt-2 grid gap-2 sm:grid-cols-2">
        {demand && (
          <FieldRow label="Demanda propuesta" value={demand} isLight={isLight} />
        )}
        {primary && (
          <FieldRow
            label="Significante primario"
            value={primary}
            isLight={isLight}
          />
        )}
        {secondary && (
          <FieldRow
            label="Significante secundario"
            value={secondary}
            isLight={isLight}
          />
        )}
        {positionValue && (
          <div className="min-w-0 sm:col-span-2">
            <FieldRow
              label="Posición lógica"
              value={positionValue}
              isLight={isLight}
              mono
            />
            {position && (
              <p
                className={cn(
                  "mt-1 text-[11px] leading-snug",
                  isLight ? "text-slate-500" : "text-white/50",
                )}
              >
                {position.axis}: {position.description}
              </p>
            )}
          </div>
        )}
        {pattern && (
          <FieldRow
            label="Patrón propuesto"
            value={pattern}
            isLight={isLight}
          />
        )}
      </dl>

      {notes && (
        <div
          className={cn(
            "mt-2 border-t pt-2",
            isLight ? "border-slate-200" : "border-white/10",
          )}
        >
          <p
            className={cn(
              "mb-1 text-[10px] font-medium uppercase tracking-wide",
              isLight ? "text-slate-500" : "text-white/45",
            )}
          >
            Notas clínicas
          </p>
          <ul className="list-disc space-y-1 pl-4">
            {notes.map((note, i) => (
              <li key={`logic-note-${i}`}>{note}</li>
            ))}
          </ul>
        </div>
      )}
    </details>
  );
}
