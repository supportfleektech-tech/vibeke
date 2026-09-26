// Rate limiter.
//
// Default: in-process fixed-window store - zero dependencies, per replica.
// Optional: when UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are both set the
// limiter uses Upstash's HTTP API instead, so the same limits hold across serverless
// replicas. Any Upstash failure falls back to the in-process store rather than
// failing the request.

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

function memoryLimit(key: Key, limit: number, windowMs: number): RateLimitResult {
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

const UPSTASH_TIMEOUT_MS = 1500;

/**
 * Fixed window in Upstash Redis over the REST API.
 *
 * `SET key 0 PX <window> NX` only creates the window when it does not already
 * exist, so a hit never refreshes the expiry of a live window; `INCR` then counts
 * within it. Returns `null` whenever the limiter is not configured or the call
 * fails, so callers can fall back to the in-process store.
 */
/**
 * Increment the shared fixed-window counter in Upstash and report the new count.
 * Returns `null` when Upstash is unconfigured or the call fails, so every caller
 * can fall back to the in-process store instead of failing the request.
 *
 * `SET ... NX` only creates the window when it does not already exist, so a hit
 * never refreshs the expiry of a live window.
 */
async function upstashIncr(key: Key, windowMs: number): Promise<{ count: number; ttl: number } | null> {
  const baseUrl = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!baseUrl || !token) return null;

  const redisKey = `kinara:rl:${key}`;
  try {
    const res = await fetch(`${baseUrl.replace(/\/+$/, "")}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        ["SET", redisKey, "0", "PX", String(windowMs), "NX"],
        ["INCR", redisKey],
        ["PTTL", redisKey],
      ]),
      signal: AbortSignal.timeout(UPSTASH_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) return null;

    const payload: unknown = await res.json();
    if (!Array.isArray(payload)) return null;
    // /pipeline replies with [{result: ...}, ...]
    const results = (payload as { result?: unknown }[]).map((r) => r?.result);
    if (results.length < 3) return null;

    const count = Number(results[1]);
    if (!Number.isFinite(count)) return null;

    let ttl = Number(results[2]);
    if (!Number.isFinite(ttl) || ttl < 0) ttl = windowMs;

    return { count, ttl };
  } catch {
    // Network/auth/parse problems must never block traffic - degrade to memory.
    return null;
  }
}

async function upstashLimit(key: Key, limit: number, windowMs: number): Promise<RateLimitResult | null> {
  const incr = await upstashIncr(key, windowMs);
  if (!incr) return null;
  const reset = Date.now() + incr.ttl;
  if (incr.count > limit) return { success: false, limit, remaining: 0, reset };
  return { success: true, limit, remaining: Math.max(0, limit - incr.count), reset };
}

/** Read-only counter lookup. `null` when Upstash is unconfigured or unavailable. */
async function upstashPeek(key: Key): Promise<{ count: number } | null> {
  const baseUrl = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!baseUrl || !token) return null;

  const redisKey = `kinara:rl:${key}`;
  try {
    const res = await fetch(`${baseUrl.replace(/\/+$/, "")}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify([["GET", redisKey], ["PTTL", redisKey]]),
      signal: AbortSignal.timeout(UPSTASH_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const payload: unknown = await res.json();
    if (!Array.isArray(payload)) return null;
    const results = (payload as { result?: unknown }[]).map((r) => r?.result);
    if (results.length < 2) return null;
    // A missing key reads back as null, which is a count of zero.
    const count = results[0] === null ? 0 : Number(results[0]);
    if (!Number.isFinite(count)) return null;
    return { count };
  } catch {
    return null;
  }
}

/** Delete a counter. `null` when Upstash is unconfigured or the call failed. */
async function upstashDelete(key: Key): Promise<boolean | null> {
  const baseUrl = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!baseUrl || !token) return null;

  const redisKey = `kinara:rl:${key}`;
  try {
    const res = await fetch(`${baseUrl.replace(/\/+$/, "")}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify([["DEL", redisKey]]),
      signal: AbortSignal.timeout(UPSTASH_TIMEOUT_MS),
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return null;
  }
}

/**
 * Failed-attempt counters (login lockout). Distinct from `rateLimit`: reading never
 * consumes an attempt, and only `noteFailure` increments.
 */
export interface FailureState {
  /** True once `count` has reached the caller's limit. */
  locked: boolean;
  count: number;
  /** Epoch ms at which the counter expires. */
  reset: number;
}

function memoryPeek(key: Key): number {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || now > entry.resetAt) return 0;
  return entry.count;
}

function memoryNoteFailure(key: Key, limit: number, windowMs: number): FailureState {
  const now = Date.now();
  let entry = store.get(key);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
    store.set(key, entry);
  }
  entry.count++;
  return { locked: entry.count >= limit, count: entry.count, reset: entry.resetAt };
}

/** Current failure count for `key` without consuming an attempt. */
export async function peekFailures(key: string): Promise<number> {
  const distributed = await upstashPeek(key);
  if (distributed) return distributed.count;
  return memoryPeek(key);
}

/**
 * Record one failed attempt. Locks at `limit` (inclusive), so a limit of 10 blocks
 * on the 10th failure. Falls back to memory if Upstash is unavailable.
 */
export async function noteFailure(key: string, limit: number, windowMs: number): Promise<FailureState> {
  const distributed = await upstashIncr(key, windowMs);
  if (distributed) {
    return {
      locked: distributed.count >= limit,
      count: distributed.count,
      reset: Date.now() + distributed.ttl,
    };
  }
  return memoryNoteFailure(key, limit, windowMs);
}

/** Drop a failure counter, e.g. after a successful sign-in. */
export async function clearFailures(key: string): Promise<void> {
  await upstashDelete(key);
  // Always clear the local copy too: memory may still hold counts from a period
  // when Upstash was unreachable, and a stale count must not lock a good password.
  store.delete(key);
}

export async function rateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const distributed = await upstashLimit(key, limit, windowMs);
  if (distributed) return distributed;
  return memoryLimit(key, limit, windowMs);
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

/**
 * Best-effort client IP for rate-limit bucketing.
 *
 * Trust model: proxies append the peer address they accepted the connection from,
 * so the LAST `X-Forwarded-For` hop is written by the proxy directly in front of us
 * and is the only trustworthy entry. The FIRST hop is client-supplied, so reading it
 * (the previous behaviour) let a single forged header rotate through unlimited
 * buckets and defeat every rate limit on the box.
 *
 * Platform headers that the edge *sets* rather than forwards take priority.
 *
 * Caveat: if the app is exposed directly with no proxy in front, every one of these
 * headers is attacker-controlled. Terminate TLS at a reverse proxy (or deploy on
 * Vercel/Cloudflare) before relying on IP rate limiting.
 */
export function getClientIp(req: Request): string {
  const platformHeader = req.headers.get("x-vercel-forwarded-for");
  if (platformHeader) {
    const first = platformHeader.split(",")[0]?.trim();
    if (first) return first;
  }

  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const hops = xff
      .split(",")
      .map((h) => h.trim())
      .filter(Boolean);
    const last = hops[hops.length - 1];
    if (last) return last;
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  return "127.0.0.1";
}
