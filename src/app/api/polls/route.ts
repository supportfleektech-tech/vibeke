import { NextResponse } from "next/server";
import { db } from "@/db";
import { polls, posts, clips } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { rateLimit, getClientIp } from "@/lib/ratelimit";
import { getCurrentUserId } from "@/lib/get-user";

export const dynamic = "force-dynamic";

const pollCreateSchema = z.object({
  postId: z.coerce.number().int().positive().optional().nullable(),
  clipId: z.coerce.number().int().positive().optional().nullable(),
  question: z.string().min(5, "Question min 5 chars").max(200, "Question max 200 chars").trim(),
  options: z
    .array(z.string().min(1, "Option min 1 char").max(50, "Option max 50 chars").trim())
    .min(2, "At least 2 options required")
    .max(4, "At most 4 options allowed"),
});

// GET /api/polls?postId&clipId - return polls for post/clip
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const postIdRaw = searchParams.get("postId");
    const clipIdRaw = searchParams.get("clipId");

    const postId = postIdRaw ? parseInt(postIdRaw, 10) : null;
    const clipId = clipIdRaw ? parseInt(clipIdRaw, 10) : null;

    if (postId !== null && (isNaN(postId) || postId <= 0)) {
      return NextResponse.json({ error: "Invalid postId" }, { status: 400 });
    }
    if (clipId !== null && (isNaN(clipId) || clipId <= 0)) {
      return NextResponse.json({ error: "Invalid clipId" }, { status: 400 });
    }

    if (postId === null && clipId === null) {
      return NextResponse.json({ error: "postId or clipId required" }, { status: 400 });
    }

    const conditions: any[] = [];
    if (postId !== null) conditions.push(eq(polls.postId, postId));
    if (clipId !== null) conditions.push(eq(polls.clipId, clipId));

    const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);

    const result = await db
      .select()
      .from(polls)
      .where(whereClause)
      .orderBy(desc(polls.createdAt));

    return NextResponse.json({ polls: result, count: result.length });
  } catch (err) {
    console.error("GET /api/polls error:", err);
    return NextResponse.json({ error: "Failed to fetch polls" }, { status: 500 });
  }
}

// POST /api/polls - create poll
export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const userId = await getCurrentUserId();
    const rlKey = userId ? `polls:create:${userId}` : `polls:create:${ip}`;
    const rl = await rateLimit(rlKey, 10, 60_000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Max 10 polls per minute." },
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

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = pollCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { postId, clipId, question, options } = parsed.data;

    if (!postId && !clipId) {
      return NextResponse.json({ error: "postId or clipId required" }, { status: 400 });
    }

    // Check post/clip exists if provided
    if (postId) {
      const [post] = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
      if (!post) {
        return NextResponse.json({ error: "Post not found" }, { status: 404 });
      }
    }
    if (clipId) {
      const [clip] = await db.select().from(clips).where(eq(clips.id, clipId)).limit(1);
      if (!clip) {
        return NextResponse.json({ error: "Clip not found" }, { status: 404 });
      }
    }

    const [poll] = await db
      .insert(polls)
      .values({
        postId: postId || null,
        clipId: clipId || null,
        question: question.trim(),
        options,
        votes: [0, 0, 0, 0],
        votedBy: [],
        createdBy: userId,
      })
      .returning();

    return NextResponse.json({ poll, success: true }, { status: 201 });
  } catch (err) {
    console.error("POST /api/polls error:", err);
    return NextResponse.json({ error: "Failed to create poll" }, { status: 500 });
  }
}
