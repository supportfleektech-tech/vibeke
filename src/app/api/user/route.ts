import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { seedDatabase } from "@/db/seed";

export async function GET() {
  try {
    let userList = await db.select().from(users).where(eq(users.id, "usr_brian_mwangi")).limit(1);

    if (userList.length === 0) {
      await seedDatabase();
      userList = await db.select().from(users).where(eq(users.id, "usr_brian_mwangi")).limit(1);
    }

    return NextResponse.json({ user: userList[0] });
  } catch (err) {
    console.error("GET /api/user error:", err);
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { role, bio, location } = body;

    const updates: Partial<typeof users.$inferInsert> = {};
    if (role) updates.role = role;
    if (bio) updates.bio = bio;
    if (location) updates.location = location;

    const updated = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, "usr_brian_mwangi"))
      .returning();

    return NextResponse.json({ success: true, user: updated[0] });
  } catch (err) {
    console.error("PATCH /api/user error:", err);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
