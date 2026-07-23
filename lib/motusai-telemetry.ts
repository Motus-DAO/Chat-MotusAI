export type MotusAiTelemetryEvent = {
  event: "motusai.turn";
  at: string;
  mode: "supervision" | "qa";
  stream: boolean;
  ok: boolean;
  latencyMs: number;
  ragEnabled: boolean;
  ragHits: number;
  parseOk?: boolean;
  riskLevel?: string;
  rateLimited?: boolean;
  authSubject?: string;
  errorKind?: string;
  jsonMode?: string;
};

type Aggregate = {
  turns: number;
  ok: number;
  errors: number;
  parseFail: number;
  rateLimited: number;
  latencySumMs: number;
  ragHitSum: number;
  ragTurns: number;
  byRisk: Record<string, number>;
  byMode: Record<string, number>;
};

const aggregate: Aggregate = {
  turns: 0,
  ok: 0,
  errors: 0,
  parseFail: 0,
  rateLimited: 0,
  latencySumMs: 0,
  ragHitSum: 0,
  ragTurns: 0,
  byRisk: {},
  byMode: {},
};

export function recordMotusAiTelemetry(event: MotusAiTelemetryEvent): void {
  aggregate.turns += 1;
  if (event.ok) aggregate.ok += 1;
  else aggregate.errors += 1;
  if (event.parseOk === false) aggregate.parseFail += 1;
  if (event.rateLimited) aggregate.rateLimited += 1;
  aggregate.latencySumMs += event.latencyMs;
  aggregate.ragHitSum += event.ragHits;
  if (event.ragEnabled) aggregate.ragTurns += 1;
  if (event.riskLevel) {
    aggregate.byRisk[event.riskLevel] =
      (aggregate.byRisk[event.riskLevel] ?? 0) + 1;
  }
  aggregate.byMode[event.mode] = (aggregate.byMode[event.mode] ?? 0) + 1;

  // Structured log for Vercel / log drains
  console.info(JSON.stringify(event));
}

export function getMotusAiTelemetrySnapshot() {
  return {
    ...aggregate,
    avgLatencyMs:
      aggregate.turns > 0
        ? Math.round(aggregate.latencySumMs / aggregate.turns)
        : 0,
    parseFailRate:
      aggregate.turns > 0 ? aggregate.parseFail / aggregate.turns : 0,
    avgRagHits:
      aggregate.ragTurns > 0 ? aggregate.ragHitSum / aggregate.ragTurns : 0,
  };
}
