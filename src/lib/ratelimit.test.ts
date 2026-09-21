import { describe, it, expect } from "vitest";
import { rateLimit } from "./ratelimit";

describe("rateLimit", () => {
  it("allows within limit", () => {
    const key = `test:${Date.now()}:${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      const r = rateLimit(key, 5, 60_000);
      expect(r.success).toBe(i < 5 ? true : false);
    }
    // 6th should fail
    const r = rateLimit(key, 5, 60_000);
    expect(r.success).toBe(false);
    expect(r.remaining).toBe(0);
  });

  it("resets after window", async () => {
    const key = `test2:${Date.now()}:${Math.random()}`;
    rateLimit(key, 2, 10);
    const r1 = rateLimit(key, 2, 10);
    expect(r1.success).toBe(true);
    const r2 = rateLimit(key, 2, 10);
    expect(r2.success).toBe(false);
    await new Promise((res) => setTimeout(res, 15));
    const r3 = rateLimit(key, 2, 10);
    expect(r3.success).toBe(true);
  });
});
