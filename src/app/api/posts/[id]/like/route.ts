import { NextResponse } from "next/server";
import { db } from "@/db";
import { posts, likes } from "@/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { rateLimit, getClientIp } from "@/lib/ratelimit";
import { getCurrentUserId } from "@/lib/get-user";

export const dynamic = "force-dynamic";

// Helper: validate numeric id
function parsePostId(id: string): number | null {
  const n = parseInt(id, 10);
  if (isNaN(n) || String(n) !== String(parseInt(id, 10)) || n <= 0) return null;
  if (!Number.isInteger(n)) return null;
  return n;
}

// GET /api/posts/[id]/like -> return likes list for post
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
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10) || 20, 100);
    const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10) || 0, 0);

    // Verify post exists
    const [post] = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const likesList = await db
      .select()
      .from(likes)
      .where(eq(likes.postId, postId))
      .orderBy(desc(likes.createdAt))
      .limit(limit)
      .offset(offset);

    // Determine if current user liked
    let likedByMe = false;
    try {
      const userId = await getCurrentUserId();
      if (userId) {
        likedByMe = likesList.some((l) => l.userId === userId);
        // If not in current page, check explicitly
        if (!likedByMe) {
          const [mine] = await db
            .select()
            .from(likes)
            .where(and(eq(likes.postId, postId), eq(likes.userId, userId)))
            .limit(1);
          likedByMe = !!mine;
        }
      }
    } catch {}

    return NextResponse.json({
      likes: likesList,
      count: likesList.length,
      totalLikes: post.likes,
      postId,
      liked: likedByMe,
      limit,
      offset,
    });
  } catch (err) {
    console.error("GET /api/posts/[id]/like error:", err);
    return NextResponse.json({ error: "Failed to fetch likes" }, { status: 500 });
  }
}

// POST /api/posts/[id]/like -> toggle like/unlike
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

    // Rate limit: 10/min per IP
    const ip = getClientIp(request);
    const rl = await rateLimit(`like:${ip}`, 10, 60_000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Max 10 likes per minute." },
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

    // Verify post exists
    const [post] = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Transactional toggle
    const result = await db.transaction(async (tx) => {
      const existing = await tx
        .select()
        .from(likes)
        .where(and(eq(likes.postId, postId), eq(likes.userId, userId)))
        .limit(1);

      if (existing.length > 0) {
        // Unlike: delete and decrement
        await tx.delete(likes).where(and(eq(likes.postId, postId), eq(likes.userId, userId)));
        const [updated] = await tx
          .update(posts)
          .set({
            likes: sql`GREATEST(${posts.likes} - 1, 0)`,
            updatedAt: new Date(),
          })
          .where(eq(posts.id, postId))
          .returning();
        return { liked: false, likes: updated?.likes ?? Math.max((post.likes ?? 1) - 1, 0) };
      } else {
        // Like: insert and increment, handle race with unique constraint
        try {
          await tx.insert(likes).values({
            postId,
            userId,
          });
        } catch (e: any) {
          // Unique violation (race) - Postgres code 23505
          const isUnique =
            e?.code === "23505" ||
            e?.cause?.code === "23505" ||
            /unique|duplicate|LikesUnique|likes_unique/i.test(e?.message || "");
          if (isUnique) {
            // Another concurrent request inserted; treat as already liked -> rollback like, do unlike
            // Since we are in tx, delete and decrement instead
            await tx.delete(likes).where(and(eq(likes.postId, postId), eq(likes.userId, userId)));
            const [updated] = await tx
              .update(posts)
              .set({
                likes: sql`GREATEST(${posts.likes} - 1, 0)`,
                updatedAt: new Date(),
              })
              .where(eq(posts.id, postId))
              .returning();
            return { liked: false, likes: updated?.likes ?? post.likes };
          }
          throw e;
        }
        const [updated] = await tx
          .update(posts)
          .set({
            likes: sql`${posts.likes} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(posts.id, postId))
          .returning();
        return { liked: true, likes: updated?.likes ?? (post.likes ?? 0) + 1 };
      }
    });

    return NextResponse.json(result);
  } catch (err: any) {
    // Handle outer unique violation if transaction failed after commit attempt
    if (err?.code === "23505" || /unique|duplicate/i.test(err?.message || "")) {
      console.warn("Like race unique violation caught outer:", err?.message);
      return NextResponse.json({ error: "Concurrent like conflict, please retry" }, { status: 409 });
    }
    console.error("POST /api/posts/[id]/like error:", err);
    return NextResponse.json({ error: "Failed to toggle like" }, { status: 500 });
  }
}
