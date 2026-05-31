const WINDOW_MS = 60_000;
const REPORT_LIMIT = 180;

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export function takeRateLimitToken(key: string): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + WINDOW_MS
    });
    return true;
  }

  if (bucket.count >= REPORT_LIMIT) {
    return false;
  }

  bucket.count += 1;
  return true;
}
