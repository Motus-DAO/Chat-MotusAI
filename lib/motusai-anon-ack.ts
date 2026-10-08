// v2 intentionally requires all existing users to acknowledge the MVP policy.
export const ANON_ACK_KEY = "motusai.disassociated-material.ack.v2";

export function hasAnonymizationAck(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const value = window.localStorage.getItem(ANON_ACK_KEY);
    return typeof value === "string" && value.trim().length > 0;
  } catch {
    return false;
  }
}

/** Persist acknowledgment as an ISO date string. */
export function setAnonymizationAck(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ANON_ACK_KEY, new Date().toISOString());
  } catch {
    // Quota / private mode — ignore
  }
}

/** Clear ack (tests / dev). */
export function clearAnonymizationAck(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(ANON_ACK_KEY);
  } catch {
    // ignore
  }
}
