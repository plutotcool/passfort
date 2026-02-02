/**
 * In-memory rate limiter for password attempts per client IP.
 * Best-effort in Edge: each isolate has its own memory, so limits are per-instance.
 * For strict global limits use Vercel Firewall or a KV store (e.g. Upstash).
 */

export interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

/** Max age for entries before prune (2x window). */
const PRUNE_AFTER_MS = 120_000;

let lastPrune = 0;

function prune(): void {
  const now = Date.now();
  if (now - lastPrune < PRUNE_AFTER_MS) return;
  lastPrune = now;
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) store.delete(key);
  }
}

/**
 * Check whether the client is over the rate limit. If not, increment and return null.
 * If over limit, return seconds until reset (for Retry-After).
 */
export function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number
): number | null {
  if (maxAttempts <= 0 || windowMs <= 0) return null;
  prune();
  const now = Date.now();
  const entry = store.get(key);
  if (!entry) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }
  if (entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }
  entry.count += 1;
  if (entry.count > maxAttempts) {
    const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
    return Math.max(1, retryAfterSec);
  }
  return null;
}

/**
 * Reset rate limit state. For testing only.
 */
export function resetRateLimitForTesting(): void {
  store.clear();
  lastPrune = 0;
}
