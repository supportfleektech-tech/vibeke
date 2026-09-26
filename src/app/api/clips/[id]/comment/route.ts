import { NextResponse } from "next/server";
import { db } from "@/db";
import { clips, clipComments, users } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { rateLimit, getClientIp } from "@/lib/ratelimit";
import { getCurrentUserId } from "@/lib/get-user";
import { z } from "zod";

export const dynamic = "force-dynamic";

const commentSchema = z.object({
  content: z.string().min(1, "Content required").max(500, "Max 500 chars").trim(),
});

function parseClipId(id: string): number | null {
  const n = parseInt(id, 10);
  if (isNaN(n) || n <= 0) return null;
  return n;
}

// GET /api/clips/[id]/comment -> list comments for clip
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const clipId = parseClipId(id);
    if (clipId === null) {
      return NextResponse.json({ error: "Invalid clip ID - must be numeric" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const limitRaw = searchParams.get("limit");
    const offsetRaw = searchParams.get("offset");
    const limit = Math.min(Math.max(parseInt(limitRaw || "20", 10) || 20, 1), 100);
    const offset = Math.max(parseInt(offsetRaw || "0", 10) || 0, 0);

    const [clip] = await db.select().from(clips).where(eq(clips.id, clipId)).limit(1);
    if (!clip) {
      return NextResponse.json({ error: "Clip not found" }, { status: 404 });
    }

    const commentsList = await db
      .select()
      .from(clipComments)
      .where(eq(clipComments.clipId, clipId))
      .orderBy(desc(clipComments.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      comments: commentsList,
      count: commentsList.length,
      totalComments: clip.commentsCount,
      clipId,
      limit,
      offset,
    });
  } catch (err) {
    console.error("GET /api/clips/[id]/comment error:", err);
    return NextResponse.json({ error: "Failed to fetch clip comments" }, { status: 500 });
  }
}

// POST /api/clips/[id]/comment -> create comment, increment clips.commentsCount
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const clipId = parseClipId(id);
    if (clipId === null) {
      return NextResponse.json({ error: "Invalid clip ID - must be numeric" }, { status: 400 });
    }

    const ip = getClientIp(request);
    const rl = await rateLimit(`clip-comments:${ip}`, 20, 60_000);
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

    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = commentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }
    const { content } = parsed.data;

    const [clip] = await db.select().from(clips).where(eq(clips.id, clipId)).limit(1);
    if (!clip) {
      return NextResponse.json({ error: "Clip not found" }, { status: 404 });
    }

    const [author] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const authorName = author?.name || "Brian Mwangi";
    const authorAvatar =
      author?.avatar ||
      "https://images.pexels.com/photos/14950779/pexels-photo-14950779.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";

    const result = await db.transaction(async (tx) => {
      const [newComment] = await tx
        .insert(clipComments)
        .values({
          clipId,
          authorId: userId,
          authorName,
          authorAvatar,
          content: content.trim(),
        })
        .returning();

      const [updatedClip] = await tx
        .update(clips)
        .set({
          commentsCount: sql`${clips.commentsCount} + 1`,
        })
        .where(eq(clips.id, clipId))
        .returning();

      return { comment: newComment, clip: updatedClip };
    });

    return NextResponse.json(
      {
        comment: result.comment,
        success: true,
        commentsCount: result.clip?.commentsCount ?? clip.commentsCount + 1,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/clips/[id]/comment error:", err);
    return NextResponse.json({ error: "Failed to create clip comment" }, { status: 500 });
  }
}
