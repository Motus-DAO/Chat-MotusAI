type Bucket = {
  windowStartMs: number;
  count: number;
  dayStartMs: number;
  dayCount: number;
};

const buckets = new Map<string, Bucket>();

function readInt(name: string, fallback: number): number {
  const n = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function getMotusAiRateLimits() {
  return {
    perMinute: readInt("MOTUSAI_RATE_LIMIT_PER_MIN", 20),
    perDay: readInt("MOTUSAI_RATE_LIMIT_PER_DAY", 200),
  };
}

/**
 * Simple in-memory sliding/minute + calendar-day limiter.
 * Good enough for single-region beta; not a distributed quota store.
 */
export function checkMotusAiRateLimit(subjectKey: string): {
  allowed: boolean;
  retryAfterSec?: number;
  remainingMinute: number;
  remainingDay: number;
} {
  const { perMinute, perDay } = getMotusAiRateLimits();
  const now = Date.now();
  const minuteMs = 60_000;
  const dayMs = 24 * 60 * 60_000;

  let bucket = buckets.get(subjectKey);
  if (!bucket) {
    bucket = {
      windowStartMs: now,
      count: 0,
      dayStartMs: now,
      dayCount: 0,
    };
    buckets.set(subjectKey, bucket);
  }

  if (now - bucket.windowStartMs >= minuteMs) {
    bucket.windowStartMs = now;
    bucket.count = 0;
  }
  if (now - bucket.dayStartMs >= dayMs) {
    bucket.dayStartMs = now;
    bucket.dayCount = 0;
  }

  if (bucket.dayCount >= perDay) {
    const retryAfterSec = Math.max(
      1,
      Math.ceil((bucket.dayStartMs + dayMs - now) / 1000),
    );
    return {
      allowed: false,
      retryAfterSec,
      remainingMinute: Math.max(0, perMinute - bucket.count),
      remainingDay: 0,
    };
  }

  if (bucket.count >= perMinute) {
    const retryAfterSec = Math.max(
      1,
      Math.ceil((bucket.windowStartMs + minuteMs - now) / 1000),
    );
    return {
      allowed: false,
      retryAfterSec,
      remainingMinute: 0,
      remainingDay: Math.max(0, perDay - bucket.dayCount),
    };
  }

  bucket.count += 1;
  bucket.dayCount += 1;

  return {
    allowed: true,
    remainingMinute: Math.max(0, perMinute - bucket.count),
    remainingDay: Math.max(0, perDay - bucket.dayCount),
  };
}
