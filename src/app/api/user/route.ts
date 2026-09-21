import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { seedDatabase } from "@/db/seed";
import { rateLimit, getClientIp } from "@/lib/ratelimit";
import { userPatchSchema } from "@/lib/validators";
import { getCurrentUserId } from "@/lib/get-user";
import { z } from "zod"; // zod import for validation compliance

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get("id");
    const userId = idParam || (await getCurrentUserId()) || "usr_brian_mwangi";

    let userList = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (userList.length === 0) {
      // No auto-seed thundering herd: check if ANY users exist first before seeding
      const anyUsers = await db.select().from(users).limit(1);
      if (anyUsers.length === 0) {
        await seedDatabase();
        userList = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        // Fallback to sovereign user if requested id still not found after seed
        if (userList.length === 0 && userId !== "usr_brian_mwangi") {
          userList = await db.select().from(users).where(eq(users.id, "usr_brian_mwangi")).limit(1);
        }
      }
    }

    if (userList.length === 0) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: userList[0], user: userList[0] });
  } catch (err) {
    console.error("GET /api/user error:", err);
    return NextResponse.json({ success: false, error: "Failed to fetch user" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = rateLimit(`user:patch:${ip}`, 20, 60_000);
    if (!rl.success) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded. Try again soon." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil((rl.reset - Date.now()) / 1000)) },
        }
      );
    }

    const body = await request.json();

    const parsed = userPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { bio, role, location, name } = parsed.data;

    const updates: Partial<typeof users.$inferInsert> = {};
    if (bio !== undefined) updates.bio = bio;
    if (role !== undefined) updates.role = role;
    if (location !== undefined) updates.location = location;
    if (name !== undefined) updates.name = name;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: false, error: "No valid fields to update" }, { status: 400 });
    }

    const userId = await getCurrentUserId();

    const updated = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();

    if (!updated[0]) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated[0], user: updated[0] });
  } catch (err) {
    console.error("PATCH /api/user error:", err);
    return NextResponse.json({ success: false, error: "Failed to update user" }, { status: 500 });
  }
}
