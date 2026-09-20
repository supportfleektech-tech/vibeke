import { NextResponse } from "next/server";
import { db } from "@/db";
import { posts } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const postId = parseInt(id, 10);
    if (isNaN(postId)) {
      return NextResponse.json({ error: "Invalid post ID" }, { status: 400 });
    }

    const updated = await db
      .update(posts)
      .set({
        likes: sql`${posts.likes} + 1`,
      })
      .where(eq(posts.id, postId))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, likes: updated[0].likes });
  } catch (err) {
    console.error("POST /api/posts/[id]/like error:", err);
    return NextResponse.json({ error: "Failed to like post" }, { status: 500 });
  }
}
