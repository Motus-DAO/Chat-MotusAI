import type { NextRequest } from "next/server";

export type MotusAuthSubject = {
  key: string;
  waapId: string;
};

/**
 * MotusAI auth is WaaP-based on the client. The browser sends the stable
 * WaaP user id; the API requires it when MOTUSAI_REQUIRE_AUTH is not false.
 */
export function isMotusAiAuthRequired(): boolean {
  if (process.env.MOTUSAI_REQUIRE_AUTH === "false") return false;
  if (process.env.MOTUSAI_REQUIRE_AUTH === "true") return true;
  return process.env.NODE_ENV === "production";
}

export function resolveMotusAuth(
  req: NextRequest,
): { ok: true; subject: MotusAuthSubject } | { ok: false; error: string } {
  const waapId =
    req.headers.get("x-motus-waap-id")?.trim() ||
    req.headers.get("x-waap-id")?.trim() ||
    "";

  if (!waapId) {
    if (!isMotusAiAuthRequired()) {
      const ip =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        req.headers.get("x-real-ip")?.trim() ||
        "anonymous";
      return { ok: true, subject: { key: `anon:${ip}`, waapId: "anonymous" } };
    }
    return {
      ok: false,
      error: "Sesión requerida. Inicia sesión con WaaP para usar MotusAI.",
    };
  }

  if (waapId.length > 200) {
    return { ok: false, error: "Identidad de sesión inválida." };
  }

  return { ok: true, subject: { key: `waap:${waapId}`, waapId } };
}
