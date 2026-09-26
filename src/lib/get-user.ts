import { auth } from "@/lib/auth";

/**
 * Resolves the caller's user id.
 *
 * Returns `null` when there is no valid session. Callers MUST branch on the result -
 * every mutating route guards with:
 *
 *   const userId = await getCurrentUserId();
 *   if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 *
 * There is deliberately no demo/fallback identity: a silent default here would make
 * all of those 401 branches unreachable and let anonymous requests act as a real user.
 */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const session = await auth();
    const id = (session as { userId?: unknown } | null)?.userId;
    if (typeof id === "string" && id.length > 0) return id;
  } catch (error) {
    // Never swallow silently - an auth-layer failure must be visible in logs.
    console.error("[auth] session lookup failed:", error);
  }
  return null;
}
