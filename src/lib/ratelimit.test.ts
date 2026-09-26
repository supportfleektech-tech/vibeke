import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { rateLimit, getClientIp, noteFailure, peekFailures, clearFailures } from "./ratelimit";

describe("rateLimit (in-process fallback)", () => {
  it("allows within limit", async () => {
    const key = `test:${Date.now()}:${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      const r = await rateLimit(key, 5, 60_000);
      expect(r.success).toBe(i < 5 ? true : false);
    }
    // 6th should fail
    const r = await rateLimit(key, 5, 60_000);
    expect(r.success).toBe(false);
    expect(r.remaining).toBe(0);
  });

  it("resets after window", async () => {
    const key = `test2:${Date.now()}:${Math.random()}`;
    await rateLimit(key, 2, 10);
    const r1 = await rateLimit(key, 2, 10);
    expect(r1.success).toBe(true);
    const r2 = await rateLimit(key, 2, 10);
    expect(r2.success).toBe(false);
    await new Promise((res) => setTimeout(res, 15));
    const r3 = await rateLimit(key, 2, 10);
    expect(r3.success).toBe(true);
  });
});

describe("rateLimit (Upstash REST)", () => {
  beforeEach(() => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("uses the distributed counter and blocks over the limit", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ result: "OK" }, { result: 6 }, { result: 42_000 }],
    });
    vi.stubGlobal("fetch", fetchMock);

    const r = await rateLimit("upstash:over", 5, 60_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(r.success).toBe(false);
    expect(r.remaining).toBe(0);
    expect(r.reset).toBeGreaterThan(Date.now());
  });

  it("reports remaining headroom under the limit", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ result: null }, { result: 2 }, { result: 59_000 }],
      })
    );

    const r = await rateLimit("upstash:under", 5, 60_000);
    expect(r.success).toBe(true);
    expect(r.remaining).toBe(3);
  });

  it("falls back to memory when Upstash errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down"))
    );

    const key = `fallback:${Date.now()}:${Math.random()}`;
    const r1 = await rateLimit(key, 1, 60_000);
    const r2 = await rateLimit(key, 1, 60_000);
    expect(r1.success).toBe(true);
    expect(r2.success).toBe(false);
  });

  it("falls back to memory when Upstash replies with a non-2xx status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) })
    );

    const key = `fallback500:${Date.now()}:${Math.random()}`;
    const r = await rateLimit(key, 1, 60_000);
    expect(r.success).toBe(true);
  });
});

describe("getClientIp", () => {
  it("uses the LAST X-Forwarded-For hop, never the client-supplied first one", () => {
    // A client can forge the first entry; only the proxy-added last entry is ours.
    const req = new Request("http://localhost/api", {
      headers: { "x-forwarded-for": "1.2.3.4, 10.0.0.7" },
    });
    expect(getClientIp(req)).toBe("10.0.0.7");
  });

  it("prefers the Vercel edge header when present", () => {
    const req = new Request("http://localhost/api", {
      headers: {
        "x-vercel-forwarded-for": "203.0.113.9",
        "x-forwarded-for": "9.9.9.9, 10.0.0.7",
      },
    });
    expect(getClientIp(req)).toBe("203.0.113.9");
  });

  it("falls back to x-real-ip, then a loopback default", () => {
    expect(getClientIp(new Request("http://localhost/api", { headers: { "x-real-ip": "5.5.5.5" } }))).toBe(
      "5.5.5.5"
    );
    expect(getClientIp(new Request("http://localhost/api"))).toBe("127.0.0.1");
  });

  it("does not return an empty string for a blank header", () => {
    const req = new Request("http://localhost/api", { headers: { "x-forwarded-for": " , " } });
    expect(getClientIp(req)).toBe("127.0.0.1");
  });
});

describe("failure counters (noteFailure / peekFailures / clearFailures)", () => {
  it("only counts when noteFailure is called, and locks at the limit", async () => {
    const key = `fail:${Date.now()}:${Math.random()}`;

    // Reading must never consume an attempt.
    expect(await peekFailures(key)).toBe(0);
    expect(await peekFailures(key)).toBe(0);

    for (let i = 1; i < 3; i++) {
      const r = await noteFailure(key, 3, 60_000);
      expect(r.count).toBe(i);
      expect(r.locked).toBe(false);
    }

    const r = await noteFailure(key, 3, 60_000);
    expect(r.count).toBe(3);
    expect(r.locked).toBe(true);
    expect(await peekFailures(key)).toBe(3);
  });

  it("clearFailures resets the counter back to zero", async () => {
    const key = `failclear:${Date.now()}:${Math.random()}`;
    for (let i = 0; i < 3; i++) await noteFailure(key, 3, 60_000);
    expect((await noteFailure(key, 3, 60_000)).locked).toBe(true);

    await clearFailures(key);

    expect(await peekFailures(key)).toBe(0);
    expect((await noteFailure(key, 3, 60_000)).locked).toBe(false);
  });

  it("counters expire with their window", async () => {
    const key = `failexp:${Date.now()}:${Math.random()}`;
    await noteFailure(key, 2, 10);
    expect(await peekFailures(key)).toBe(1);

    await new Promise((res) => setTimeout(res, 20));

    // The window expired: the count must be gone entirely, not merely allowed again.
    expect(await peekFailures(key)).toBe(0);

    // ...so the next attempt starts over at 1 instead of resuming from 2.
    const r = await noteFailure(key, 2, 60_000);
    expect(r.count).toBe(1);
    expect(r.locked).toBe(false);
  });

  it("uses Upstash for counting and survives Upstash failure", async () => {
    const base = "https://example.upstash.io";
    const token = "test-token";
    vi.stubEnv("UPSTASH_REDIS_REST_URL", base);
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", token);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ result: null }, { result: 4 }, { result: 59_000 }],
    });
    vi.stubGlobal("fetch", fetchMock);

    const r = await noteFailure("upstash-fail", 5, 60_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(r.count).toBe(4);
    expect(r.locked).toBe(false);

    // Any transport failure must fall back to memory rather than throwing.
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const r2 = await noteFailure("upstash-fail-2", 5, 60_000);
    expect(r2.count).toBe(1);

    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("clearFailures issues a delete against Upstash", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ result: 1 }) });
    vi.stubGlobal("fetch", fetchMock);

    await clearFailures("upstash-clear");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("example.upstash.io");
    expect(String(init.body)).toContain("DEL");

    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });
});
