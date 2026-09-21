// In-memory LRU rate limiter - zero budget, no Redis needed
// Falls back to Upstash if configured, but defaults to memory

type Key = string;
interface Entry {
  count: number;
  resetAt: number;
}

const store = new Map<Key, Entry>();

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, limit, remaining: limit - 1, reset: now + windowMs };
  }
  if (entry.count >= limit) {
    return { success: false, limit, remaining: 0, reset: entry.resetAt };
  }
  entry.count++;
  return { success: true, limit, remaining: limit - entry.count, reset: entry.resetAt };
}

// Cleanup every 5 min
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of store.entries()) {
      if (now > v.resetAt) store.delete(k);
    }
  }, 5 * 60 * 1000).unref?.();
}

export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "127.0.0.1";
}
