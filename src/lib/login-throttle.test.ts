import { describe, it, expect } from "vitest";
import { peekFailures } from "./ratelimit";
import {
  isLoginThrottled,
  noteLoginFailure,
  noteLoginSuccess,
  runLoginAttempt,
  LOGIN_HANDLE_LIMIT,
  LOGIN_IP_LIMIT,
} from "./login-throttle";

/** Mirror of the module's internal key scheme, so assertions read as intent. */
const loginHandleKey = (h: string) => `login:handle:${h.trim().toLowerCase()}`;
const loginIpKey = (ip: string) => `login:ip:${ip.trim().toLowerCase()}`;

/** Unique-ish buckets so repeated runs (and parallel tests) never share counters. */
function unique(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

describe("login throttle", () => {
  it("does not throttle below the per-handle limit, throttles at it", async () => {
    const handle = unique("handle");
    const ip = unique("ip");

    for (let i = 0; i < LOGIN_HANDLE_LIMIT - 1; i++) {
      await noteLoginFailure(handle, ip);
      expect(await isLoginThrottled(handle, ip)).toBe(false);
    }

    await noteLoginFailure(handle, ip);
    expect(await isLoginThrottled(handle, ip)).toBe(true);
  });

  it("counts an unknown handle exactly like a known one (no user enumeration)", async () => {
    const unknown = unique("no-such-user");
    const ip = unique("ip");

    for (let i = 0; i < LOGIN_HANDLE_LIMIT; i++) {
      await noteLoginFailure(unknown, ip);
    }

    // If only existing accounts could be throttled, reaching this state would prove
    // the handle exists. It must behave identically for handles that do not exist.
    expect(await isLoginThrottled(unknown, ip)).toBe(true);
  });

  it("treats handles case-insensitively", async () => {
    const handle = unique("MixedCase");
    const ip = unique("ip");

    for (let i = 0; i < LOGIN_HANDLE_LIMIT; i++) {
      await noteLoginFailure(handle, ip);
    }

    expect(await isLoginThrottled(handle.toUpperCase(), ip)).toBe(true);
    expect(await isLoginThrottled(handle.toLowerCase(), ip)).toBe(true);
  });

  it("does not let one handle's failures throttle a different handle", async () => {
    const a = unique("a");
    const b = unique("b");
    const ip = unique("ip");

    for (let i = 0; i < LOGIN_HANDLE_LIMIT; i++) {
      await noteLoginFailure(a, ip);
    }

    expect(await isLoginThrottled(a, ip)).toBe(true);
    expect(await isLoginThrottled(b, ip)).toBe(false);
  });

  it("clears the handle counter after a successful sign-in", async () => {
    const handle = unique("clear");
    const ip = unique("ip");

    for (let i = 0; i < LOGIN_HANDLE_LIMIT - 1; i++) {
      await noteLoginFailure(handle, ip);
    }
    await noteLoginSuccess(handle, ip);

    expect(await isLoginThrottled(handle, ip)).toBe(false);

    // The full allowance must apply again from scratch, not resume from 9.
    for (let i = 0; i < LOGIN_HANDLE_LIMIT - 1; i++) {
      await noteLoginFailure(handle, ip);
      expect(await isLoginThrottled(handle, ip)).toBe(false);
    }
    await noteLoginFailure(handle, ip);
    expect(await isLoginThrottled(handle, ip)).toBe(true);
  });

  it("throttles an IP that spreads its guesses across many handles", async () => {
    const ip = unique("ip-spray");

    for (let i = 0; i < LOGIN_IP_LIMIT - 1; i++) {
      await noteLoginFailure(unique("sprayed"), ip);
      expect(await isLoginThrottled(unique("bystander"), ip)).toBe(false);
    }

    // The final allowed attempt tips the IP bucket over.
    await noteLoginFailure(unique("sprayed"), ip);
    expect(await isLoginThrottled(unique("innocent-handle"), ip)).toBe(true);
  });

  it("keeps the two buckets independent: a throttled IP does not throttle another IP", async () => {
    const blockedIp = unique("ip-blocked");
    const otherIp = unique("ip-other");
    const handle = unique("shared-handle");

    for (let i = 0; i < LOGIN_IP_LIMIT; i++) {
      await noteLoginFailure(unique("x"), blockedIp);
    }

    expect(await isLoginThrottled(handle, blockedIp)).toBe(true);
    expect(await isLoginThrottled(handle, otherIp)).toBe(false);
  });

  it("a successful sign-in also clears the IP counter", async () => {
    const ip = unique("ip-clear");
    for (let i = 0; i < LOGIN_IP_LIMIT; i++) {
      await noteLoginFailure(unique("y"), ip);
    }
    expect(await isLoginThrottled(unique("z"), ip)).toBe(true);

    await noteLoginSuccess(unique("winner"), ip);

    expect(await isLoginThrottled(unique("after"), ip)).toBe(false);
  });
});

describe("runLoginAttempt", () => {
  it("returns the verifier's value and clears counters on success", async () => {
    const handle = unique("ok");
    const ip = unique("ip");

    // Burn most of the allowance first, so success has something to clear.
    for (let i = 0; i < LOGIN_HANDLE_LIMIT - 1; i++) {
      await noteLoginFailure(handle, ip);
    }

    const result = await runLoginAttempt(handle, ip, async () => ({ id: "usr_1" }));

    expect(result).toEqual({ id: "usr_1" });
    expect(await isLoginThrottled(handle, ip)).toBe(false);

    // Full allowance restored.
    for (let i = 0; i < LOGIN_HANDLE_LIMIT - 1; i++) {
      expect(await isLoginThrottled(handle, ip)).toBe(false);
      await noteLoginFailure(handle, ip);
    }
    expect(await isLoginThrottled(handle, ip)).toBe(false);
  });

  it("records a failure when the verifier rejects, and returns null", async () => {
    const handle = unique("bad");
    const ip = unique("ip");

    const result = await runLoginAttempt(handle, ip, async () => null);

    expect(result).toBeNull();
    expect(await peekFailures(loginHandleKey(handle))).toBe(1);
    expect(await peekFailures(loginIpKey(ip))).toBe(1);
  });

  it("counts a rejected attempt for a handle that does not exist", async () => {
    const unknown = unique("ghost");
    const ip = unique("ip");

    for (let i = 0; i < LOGIN_HANDLE_LIMIT; i++) {
      const r = await runLoginAttempt(unknown, ip, async () => null);
      expect(r).toBeNull();
    }

    // If unknown handles were not counted, reaching "locked" here would prove the
    // handle exists - an enumeration oracle.
    expect(await isLoginThrottled(unknown, ip)).toBe(true);
  });

  it("does not run the verifier at all once throttled", async () => {
    const handle = unique("locked");
    const ip = unique("ip");

    for (let i = 0; i < LOGIN_HANDLE_LIMIT; i++) {
      await noteLoginFailure(handle, ip);
    }

    let verifierCalls = 0;
    const result = await runLoginAttempt(handle, ip, async () => {
      verifierCalls++;
      return { id: "usr_should_never_happen" };
    });

    expect(result).toBeNull();
    expect(verifierCalls).toBe(0);
  });

  it("a valid password still fails while the handle is throttled", async () => {
    const handle = unique("locked-valid");
    const ip = unique("ip");

    for (let i = 0; i < LOGIN_HANDLE_LIMIT; i++) {
      await runLoginAttempt(handle, ip, async () => null);
    }

    const result = await runLoginAttempt(handle, ip, async () => ({ id: "usr_valid" }));

    expect(result).toBeNull();
  });
});
