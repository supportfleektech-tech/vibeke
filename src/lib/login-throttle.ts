import { noteFailure, peekFailures, clearFailures } from "./ratelimit";

/**
 * Failed-login throttling for the credentials provider.
 *
 * Why this exists: `/api/auth/*` is the raw NextAuth handler, so none of the
 * per-route `rateLimit()` calls in this repo ever ran on sign-in — password
 * guessing was completely unbounded.
 *
 * Two independent buckets:
 *   * per handle — stops targeted brute force against one account
 *   * per IP     — stops credential stuffing that sprays one password over many
 *                 handles from one source
 *
 * Attempt counts are kept for handles that do not exist as well as real ones.
 * Otherwise, reaching the "locked" state would prove the handle exists and turn
 * this into a user-enumeration oracle.
 *
 * Both buckets are cleared on a successful sign-in, and both expire on their own,
 * so a legitimate user always has a way back in without operator intervention.
 */

/** Failures allowed per handle inside the window before that handle is throttled. */
export const LOGIN_HANDLE_LIMIT = 10;
/** Failures allowed per IP inside the window before that IP is throttled. */
export const LOGIN_IP_LIMIT = 30;
/** Window over which failures accumulate. */
export const LOGIN_WINDOW_MS = 15 * 60_000;

function handleKey(handle: string): string {
  // Handles are compared case-insensitively so `BrianMwangi` cannot be used to
  // start a second bucket next to `brianmwangi`.
  return `login:handle:${(handle ?? "").trim().toLowerCase()}`;
}

function ipKey(ip: string): string {
  return `login:ip:${(ip ?? "").trim().toLowerCase()}`;
}

/** True when either bucket has reached its limit — the attempt must be refused. */
export async function isLoginThrottled(handle: string, ip: string): Promise<boolean> {
  const [handleFailures, ipFailures] = await Promise.all([
    peekFailures(handleKey(handle)),
    peekFailures(ipKey(ip)),
  ]);
  return handleFailures >= LOGIN_HANDLE_LIMIT || ipFailures >= LOGIN_IP_LIMIT;
}

/** Count one failed attempt against both buckets. */
export async function noteLoginFailure(handle: string, ip: string): Promise<void> {
  await Promise.all([
    noteFailure(handleKey(handle), LOGIN_HANDLE_LIMIT, LOGIN_WINDOW_MS),
    noteFailure(ipKey(ip), LOGIN_IP_LIMIT, LOGIN_WINDOW_MS),
  ]);
}

/** Forget every failure recorded for this handle/IP after a successful sign-in. */
export async function noteLoginSuccess(handle: string, ip: string): Promise<void> {
  await Promise.all([clearFailures(handleKey(handle)), clearFailures(ipKey(ip))]);
}

/**
 * Run one sign-in attempt end to end.
 *
 * Order matters and is the whole point of this function:
 *   1. refuse outright once either bucket is full — the verifier (bcrypt) never runs,
 *      so a throttled account costs an attacker no less work than an open one;
 *   2. a rejected verifier records a failure against handle AND IP. Rejects are
 *      counted whether or not the handle exists, otherwise "never throttles" would
 *      itself be an enumeration oracle;
 *   3. an accepted verifier clears both buckets.
 *
 * @param verify Returns the authenticated payload, or `null` to reject.
 */
export async function runLoginAttempt<T>(
  handle: string,
  ip: string,
  verify: () => Promise<T | null>
): Promise<T | null> {
  if (await isLoginThrottled(handle, ip)) {
    // The response stays the generic sign-in failure so the client cannot tell a
    // locked account from a wrong password (no enumeration), which leaves operators
    // as the only ones who ever learn a lockout happened.
    console.warn(`[auth] sign-in refused for "${handle}" from ${ip}: failure limit reached`);
    return null;
  }

  const result = await verify();

  if (result === null || result === undefined) {
    await noteLoginFailure(handle, ip);
    return null;
  }

  await noteLoginSuccess(handle, ip);
  return result;
}
