import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { rateLimit, getClientIp } from "@/lib/ratelimit";
import { userPatchSchema } from "@/lib/validators";
import { getCurrentUserId } from "@/lib/get-user";
import { publicUserColumns, privateUserColumns } from "@/lib/user-columns";

export const dynamic = "force-dynamic";

/**
 * GET /api/user        -> the signed-in user's own profile (401 when anonymous)
 * GET /api/user?id=... -> that user's public profile (never includes email/hash)
 */
export async function GET(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(`user:get:${ip}`, 60, 60_000);
    if (!rl.success) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded. Try again soon." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil((rl.reset - Date.now()) / 1000)) },
        }
      );
    }

    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get("id");

    let columns: typeof publicUserColumns | typeof privateUserColumns = publicUserColumns;
    let userId: string | null = idParam;

    if (!idParam) {
      userId = await getCurrentUserId();
      if (!userId) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
      }
      columns = privateUserColumns;
    }

    const rows = await db.select(columns).from(users).where(eq(users.id, userId!)).limit(1);

    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: rows[0], user: rows[0] });
  } catch (err) {
    console.error("GET /api/user error:", err);
    return NextResponse.json({ success: false, error: "Failed to fetch user" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(`user:patch:${ip}`, 20, 60_000);
    if (!rl.success) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded. Try again soon." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil((rl.reset - Date.now()) / 1000)) },
        }
      );
    }

    const body = await request.json().catch(() => null);
    if (body === null) {
      return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = userPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { bio, location, name } = parsed.data;

    const updates: Partial<typeof users.$inferInsert> = {};
    if (bio !== undefined) updates.bio = bio;
    if (location !== undefined) updates.location = location;
    if (name !== undefined) updates.name = name;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: false, error: "No valid fields to update" }, { status: 400 });
    }

    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const updated = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning(privateUserColumns);

    if (!updated[0]) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated[0], user: updated[0] });
  } catch (err) {
    console.error("PATCH /api/user error:", err);
    return NextResponse.json({ success: false, error: "Failed to update user" }, { status: 500 });
  }
}
