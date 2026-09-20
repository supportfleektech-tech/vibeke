import { NextResponse } from "next/server";
import { db } from "@/db";
import { communities } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const community = await db.select().from(communities).where(eq(communities.slug, slug)).limit(1);

    if (community.length === 0) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }

    return NextResponse.json({ community: community[0] });
  } catch (err) {
    console.error("GET /api/communities/[slug] error:", err);
    return NextResponse.json({ error: "Failed to fetch community" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json().catch(() => ({}));
    const { action = "join" } = body;

    const delta = action === "join" ? 1 : -1;

    const updated = await db
      .update(communities)
      .set({
        membersCount: sql`${communities.membersCount} + ${delta}`,
      })
      .where(eq(communities.slug, slug))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      action,
      membersCount: updated[0].membersCount,
    });
  } catch (err) {
    console.error("POST /api/communities/[slug] error:", err);
    return NextResponse.json({ error: "Failed to update membership" }, { status: 500 });
  }
}
