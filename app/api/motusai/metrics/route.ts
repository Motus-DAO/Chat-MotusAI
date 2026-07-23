import { NextResponse } from "next/server";
import { getMotusAiTelemetrySnapshot } from "@/lib/motusai-telemetry";
import { getMotusAiRateLimits } from "@/lib/motusai-rate-limit";
import { isMotusAiAuthRequired } from "@/lib/motusai-auth";
import { MOTUSAI_INFERENCE } from "@/lib/motusai-constants";

/**
 * Lightweight ops snapshot for MotusAI (in-memory; resets on cold start).
 * Protect with MOTUSAI_METRICS_KEY when set.
 */
export async function GET(req: Request) {
  const requiredKey = process.env.MOTUSAI_METRICS_KEY?.trim();
  if (requiredKey) {
    const provided =
      req.headers.get("x-motus-metrics-key")?.trim() ||
      new URL(req.url).searchParams.get("key")?.trim() ||
      "";
    if (provided !== requiredKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Set MOTUSAI_METRICS_KEY to enable metrics in production." },
      { status: 403 },
    );
  }

  return NextResponse.json({
    authRequired: isMotusAiAuthRequired(),
    rateLimits: getMotusAiRateLimits(),
    inference: MOTUSAI_INFERENCE,
    jsonMode: process.env.MOTUSAI_JSON_MODE || "off",
    telemetry: getMotusAiTelemetrySnapshot(),
  });
}
