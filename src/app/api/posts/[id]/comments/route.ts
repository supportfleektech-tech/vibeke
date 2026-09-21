import { NextResponse } from "next/server";
import { db } from "@/db";
import { posts, comments, users } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { rateLimit, getClientIp } from "@/lib/ratelimit";
import { getCurrentUserId } from "@/lib/get-user";
import { z } from "zod";

export const dynamic = "force-dynamic";

const commentCreateSchema = z.object({
  content: z.string().min(1, "Content required").max(1000, "Max 1000 chars").trim(),
});

function parsePostId(id: string): number | null {
  const n = parseInt(id, 10);
  if (isNaN(n) || n <= 0) return null;
  return n;
}

// GET /api/posts/[id]/comments?limit=&offset=  -> paginated comments
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const postId = parsePostId(id);
    if (postId === null) {
      return NextResponse.json({ error: "Invalid post ID - must be numeric" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const limitRaw = searchParams.get("limit");
    const offsetRaw = searchParams.get("offset");

    const limit = Math.min(Math.max(parseInt(limitRaw || "20", 10) || 20, 1), 100);
    const offset = Math.max(parseInt(offsetRaw || "0", 10) || 0, 0);

    // Verify post exists
    const [post] = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const commentsList = await db
      .select()
      .from(comments)
      .where(eq(comments.postId, postId))
      .orderBy(desc(comments.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      comments: commentsList,
      count: commentsList.length,
      totalComments: post.commentsCount,
      postId,
      limit,
      offset,
    });
  } catch (err) {
    console.error("GET /api/posts/[id]/comments error:", err);
    return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 });
  }
}

// POST /api/posts/[id]/comments -> create comment, increment posts.commentsCount
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const postId = parsePostId(id);
    if (postId === null) {
      return NextResponse.json({ error: "Invalid post ID - must be numeric" }, { status: 400 });
    }

    // Rate limit 20/min per IP
    const ip = getClientIp(request);
    const rl = rateLimit(`comments:${ip}`, 20, 60_000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Max 20 comments per minute." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((rl.reset - Date.now()) / 1000)),
            "X-RateLimit-Limit": String(rl.limit),
            "X-RateLimit-Remaining": String(rl.remaining),
            "X-RateLimit-Reset": String(rl.reset),
          },
        }
      );
    }

    // Auth
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate body
    const body = await request.json().catch(() => ({}));
    const parsed = commentCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { content } = parsed.data;

    // Verify post exists
    const [post] = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Fetch author info from users table
    const [author] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const authorName = author?.name || "Brian Mwangi";
    const authorAvatar =
      author?.avatar ||
      "https://images.pexels.com/photos/14950779/pexels-photo-14950779.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";

    // Transaction: insert comment + increment count
    const result = await db.transaction(async (tx) => {
      const [newComment] = await tx
        .insert(comments)
        .values({
          postId,
          authorId: userId,
          authorName,
          authorAvatar,
          content: content.trim(),
        })
        .returning();

      const [updatedPost] = await tx
        .update(posts)
        .set({
          commentsCount: sql`${posts.commentsCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(posts.id, postId))
        .returning();

      return { comment: newComment, post: updatedPost };
    });

    return NextResponse.json({
      comment: result.comment,
      success: true,
      commentsCount: result.post?.commentsCount ?? post.commentsCount + 1,
    });
  } catch (err) {
    console.error("POST /api/posts/[id]/comments error:", err);
    return NextResponse.json({ error: "Failed to create comment" }, { status: 500 });
  }
}
