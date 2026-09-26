import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUserId } from "@/lib/get-user";

/** Roles allowed to reach moderation / admin endpoints. */
const ADMIN_ROLES = new Set(["admin", "moderator"]);

export type AdminCheck =
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse };

/**
 * Resolves the caller and asserts they hold an admin/moderator role.
 *
 * Always returns a ready-to-send response on failure so callers cannot forget to
 * short-circuit - the pattern is:
 *
 *   const auth = await requireAdmin();
 *   if (!auth.ok) return auth.response;
 *
 * 401 (no session) is deliberately distinct from 403 (session but no privilege) so
 * the client can tell "sign in" apart from "not allowed".
 */
export async function requireAdmin(): Promise<AdminCheck> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const [row] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!row || !ADMIN_ROLES.has(row.role)) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { ok: true, userId };
}
