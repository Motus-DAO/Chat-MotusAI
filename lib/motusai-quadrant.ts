export type SupervisionLogicFields = {
  detected_demand: string | null;
  primary_signifier: string | null;
  secondary_signifier: string | null;
  logical_position: string | null;
  observed_pattern: string | null;
};

export type LogicalPositionInfo = {
  formula: string;
  label: string;
  axis: string;
  description: string;
};

const QUADRANT: LogicalPositionInfo[] = [
  {
    formula: "∃x ¬φx",
    label: "Necesario",
    axis: "Existencia",
    description:
      "Hay al menos una excepción: algo que no entra bajo φ. Modalidad de lo necesario (existencia de lo que niega la regla).",
  },
  {
    formula: "∀x φx",
    label: "Posible",
    axis: "Universalidad",
    description:
      "Para todo x, φx. Modalidad de lo posible como universalidad afirmada (todo cae bajo la función).",
  },
  {
    formula: "¬∀x φx",
    label: "Contingente",
    axis: "Universalidad negada",
    description:
      "No-todo: la universalidad no se sostiene. Modalidad de lo contingente (falla del ∀).",
  },
  {
    formula: "¬∃x ¬φx",
    label: "Imposible",
    axis: "Existencia negada",
    description:
      "No hay excepción que niegue φ. Modalidad de lo imposible (inexistencia de ¬φ).",
  },
];

/** Collapse whitespace and map common unicode/ASCII variants to canonical symbols. */
function normalizeFormulaKey(raw: string): string {
  return raw
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, "")
    .replace(/[∼˜˷⁓~]/g, "¬")
    .replace(/[ϕ𝜑𝜙Φ]/g, "φ")
    .toLowerCase();
}

const FORMULA_BY_KEY = new Map(
  QUADRANT.map((q) => [normalizeFormulaKey(q.formula), q]),
);

/**
 * Map a logical_position formula string to clinician-facing Spanish labels.
 * Returns null if empty or unrecognized.
 */
export function describeLogicalPosition(
  formula: string | null,
): LogicalPositionInfo | null {
  if (formula == null) return null;
  const trimmed = formula.trim();
  if (!trimmed) return null;

  const match = FORMULA_BY_KEY.get(normalizeFormulaKey(trimmed));
  if (!match) return null;

  return {
    formula: match.formula,
    label: match.label,
    axis: match.axis,
    description: match.description,
  };
}

function isNonEmpty(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

/** True when any supervision logic field has a non-empty value. */
export function hasLogicFields(
  fields?: Partial<SupervisionLogicFields> | null,
): boolean {
  if (!fields) return false;
  return (
    isNonEmpty(fields.detected_demand) ||
    isNonEmpty(fields.primary_signifier) ||
    isNonEmpty(fields.secondary_signifier) ||
    isNonEmpty(fields.logical_position) ||
    isNonEmpty(fields.observed_pattern)
  );
}
