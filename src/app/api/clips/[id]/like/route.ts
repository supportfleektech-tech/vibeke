import { NextResponse } from "next/server";
import { db } from "@/db";
import { clips, clipLikes } from "@/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { rateLimit, getClientIp } from "@/lib/ratelimit";
import { getCurrentUserId } from "@/lib/get-user";

export const dynamic = "force-dynamic";

function parseClipId(id: string): number | null {
  const n = parseInt(id, 10);
  if (isNaN(n) || String(n) !== String(parseInt(id, 10)) || n <= 0) return null;
  if (!Number.isInteger(n)) return null;
  return n;
}

// GET /api/clips/[id]/like -> list likes for clip, pagination
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const clipId = parseClipId(id);
    if (clipId === null) {
      return NextResponse.json({ error: "Invalid clip ID - must be numeric" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10) || 20, 100);
    const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10) || 0, 0);

    const [clip] = await db.select().from(clips).where(eq(clips.id, clipId)).limit(1);
    if (!clip) {
      return NextResponse.json({ error: "Clip not found" }, { status: 404 });
    }

    const likesList = await db
      .select()
      .from(clipLikes)
      .where(eq(clipLikes.clipId, clipId))
      .orderBy(desc(clipLikes.createdAt))
      .limit(limit)
      .offset(offset);

    let likedByMe = false;
    try {
      const userId = await getCurrentUserId();
      if (userId) {
        likedByMe = likesList.some((l) => l.userId === userId);
        if (!likedByMe) {
          const [mine] = await db
            .select()
            .from(clipLikes)
            .where(and(eq(clipLikes.clipId, clipId), eq(clipLikes.userId, userId)))
            .limit(1);
          likedByMe = !!mine;
        }
      }
    } catch {}

    return NextResponse.json({
      likes: likesList,
      count: likesList.length,
      totalLikes: clip.likes,
      clipId,
      liked: likedByMe,
      limit,
      offset,
    });
  } catch (err) {
    console.error("GET /api/clips/[id]/like error:", err);
    return NextResponse.json({ error: "Failed to fetch clip likes" }, { status: 500 });
  }
}

// POST /api/clips/[id]/like -> toggle like
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const clipId = parseClipId(id);
    if (clipId === null) {
      return NextResponse.json({ error: "Invalid clip ID - must be numeric" }, { status: 400 });
    }

    const ip = getClientIp(request);
    const rl = rateLimit(`clip-like:${ip}`, 10, 60_000);
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

    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [clip] = await db.select().from(clips).where(eq(clips.id, clipId)).limit(1);
    if (!clip) {
      return NextResponse.json({ error: "Clip not found" }, { status: 404 });
    }

    const result = await db.transaction(async (tx) => {
      const existing = await tx
        .select()
        .from(clipLikes)
        .where(and(eq(clipLikes.clipId, clipId), eq(clipLikes.userId, userId)))
        .limit(1);

      if (existing.length > 0) {
        await tx.delete(clipLikes).where(and(eq(clipLikes.clipId, clipId), eq(clipLikes.userId, userId)));
        const [updated] = await tx
          .update(clips)
          .set({
            likes: sql`GREATEST(${clips.likes} - 1, 0)`,
          })
          .where(eq(clips.id, clipId))
          .returning();
        return { liked: false, likes: updated?.likes ?? Math.max((clip.likes ?? 1) - 1, 0) };
      } else {
        try {
          await tx.insert(clipLikes).values({
            clipId,
            userId,
          });
        } catch (e: any) {
          const isUnique =
            e?.code === "23505" ||
            e?.cause?.code === "23505" ||
            /unique|duplicate|clip_likes_unique/i.test(e?.message || "");
          if (isUnique) {
            await tx.delete(clipLikes).where(and(eq(clipLikes.clipId, clipId), eq(clipLikes.userId, userId)));
            const [updated] = await tx
              .update(clips)
              .set({
                likes: sql`GREATEST(${clips.likes} - 1, 0)`,
              })
              .where(eq(clips.id, clipId))
              .returning();
            return { liked: false, likes: updated?.likes ?? clip.likes };
          }
          throw e;
        }
        const [updated] = await tx
          .update(clips)
          .set({
            likes: sql`${clips.likes} + 1`,
          })
          .where(eq(clips.id, clipId))
          .returning();
        return { liked: true, likes: updated?.likes ?? (clip.likes ?? 0) + 1 };
      }
    });

    return NextResponse.json(result);
  } catch (err: any) {
    if (err?.code === "23505" || /unique|duplicate/i.test(err?.message || "")) {
      console.warn("Clip like race unique violation caught outer:", err?.message);
      return NextResponse.json({ error: "Concurrent like conflict, please retry" }, { status: 409 });
    }
    console.error("POST /api/clips/[id]/like error:", err);
    return NextResponse.json({ error: "Failed to toggle clip like" }, { status: 500 });
  }
}
