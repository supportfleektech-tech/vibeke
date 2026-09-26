import { NextResponse } from "next/server";
import { db } from "@/db";
import { follows, users } from "@/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { rateLimit, getClientIp } from "@/lib/ratelimit";
import { getCurrentUserId } from "@/lib/get-user";
import { publicUserColumns, type PublicUser } from "@/lib/user-columns";

export const dynamic = "force-dynamic";

// POST /api/users/[id]/follow - toggle follow
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: followingId } = await params;
    if (!followingId || typeof followingId !== "string" || followingId.trim().length === 0) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (userId === followingId) {
      return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });
    }

    const ip = getClientIp(request);
    const rl = await rateLimit(`follow:${userId}:${ip}`, 20, 60_000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Max 20 follows per minute." },
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

    // Validate target user exists
    const [targetUser] = await db.select().from(users).where(eq(users.id, followingId)).limit(1);
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check existing follow
    const existing = await db
      .select()
      .from(follows)
      .where(and(eq(follows.followerId, userId), eq(follows.followingId, followingId)))
      .limit(1);

    if (existing.length > 0) {
      // Unfollow: delete + decrement via GREATEST
      await db
        .delete(follows)
        .where(and(eq(follows.followerId, userId), eq(follows.followingId, followingId)));

      try {
        await db
          .update(users)
          .set({ followersCount: sql`GREATEST(${users.followersCount} - 1, 0)` })
          .where(eq(users.id, followingId));
      } catch (e) {
        console.warn("Failed to decrement followersCount:", e);
      }
      try {
        await db
          .update(users)
          .set({ followingCount: sql`GREATEST(${users.followingCount} - 1, 0)` })
          .where(eq(users.id, userId));
      } catch (e) {
        console.warn("Failed to decrement followingCount:", e);
      }

      const [updated] = await db.select().from(users).where(eq(users.id, followingId)).limit(1);
      return NextResponse.json({
        following: false,
        followersCount: updated?.followersCount ?? Math.max((targetUser.followersCount ?? 1) - 1, 0),
      });
    } else {
      // Follow: insert + increment, handle race 23505
      try {
        await db.insert(follows).values({
          followerId: userId,
          followingId,
        });
      } catch (e: any) {
        const code = e?.code || e?.cause?.code;
        const msg = String(e?.message || "");
        if (code === "23505" || /unique|duplicate|follows_unique/i.test(msg)) {
          // Race: already exists, treat as unfollow to toggle
          await db
            .delete(follows)
            .where(and(eq(follows.followerId, userId), eq(follows.followingId, followingId)));
          try {
            await db
              .update(users)
              .set({ followersCount: sql`GREATEST(${users.followersCount} - 1, 0)` })
              .where(eq(users.id, followingId));
            await db
              .update(users)
              .set({ followingCount: sql`GREATEST(${users.followingCount} - 1, 0)` })
              .where(eq(users.id, userId));
          } catch {}
          const [updated] = await db.select().from(users).where(eq(users.id, followingId)).limit(1);
          return NextResponse.json({
            following: false,
            followersCount: updated?.followersCount ?? targetUser.followersCount,
          });
        }
        throw e;
      }

      try {
        await db
          .update(users)
          .set({ followersCount: sql`${users.followersCount} + 1` })
          .where(eq(users.id, followingId));
      } catch (e) {
        console.warn("Failed to increment followersCount:", e);
      }
      try {
        await db
          .update(users)
          .set({ followingCount: sql`${users.followingCount} + 1` })
          .where(eq(users.id, userId));
      } catch (e) {
        console.warn("Failed to increment followingCount:", e);
      }

      const [updated] = await db.select().from(users).where(eq(users.id, followingId)).limit(1);
      return NextResponse.json({
        following: true,
        followersCount: updated?.followersCount ?? (targetUser.followersCount ?? 0) + 1,
      });
    }
  } catch (err: any) {
    if (err?.code === "23505" || /unique|duplicate/i.test(err?.message || "")) {
      return NextResponse.json({ error: "Concurrent follow conflict, please retry" }, { status: 409 });
    }
    console.error("POST /api/users/[id]/follow error:", err);
    return NextResponse.json({ error: "Failed to toggle follow" }, { status: 500 });
  }
}

// GET /api/users/[id]/follow?type=followers|following&limit&offset - list users via join
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: targetId } = await params;
    if (!targetId || typeof targetId !== "string" || targetId.trim().length === 0) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const type = (searchParams.get("type") || "followers") as "followers" | "following";
    if (type !== "followers" && type !== "following") {
      return NextResponse.json({ error: "Invalid type - must be followers or following" }, { status: 400 });
    }

    const limitRaw = searchParams.get("limit");
    const offsetRaw = searchParams.get("offset");
    const parsedLimit = parseInt(limitRaw || "20", 10);
    const parsedOffset = parseInt(offsetRaw || "0", 10);
    const limit = Math.min(Math.max(isNaN(parsedLimit) ? 20 : parsedLimit, 1), 50);
    const offset = Math.max(isNaN(parsedOffset) ? 0 : parsedOffset, 0);

    // Verify target exists
    const [targetUser] = await db
      .select({ id: users.id, followersCount: users.followersCount })
      .from(users)
      .where(eq(users.id, targetId))
      .limit(1);
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let resultUsers: PublicUser[] = [];

    if (type === "followers") {
      // Find users who follow targetId: follows.followingId = targetId -> join users on followerId
      const rows = await db
        .select({ user: publicUserColumns })
        .from(follows)
        .innerJoin(users, eq(users.id, follows.followerId))
        .where(eq(follows.followingId, targetId))
        .orderBy(desc(follows.createdAt))
        .limit(limit)
        .offset(offset);
      resultUsers = rows.map((r) => r.user);
    } else {
      // Find users that targetId follows: follows.followerId = targetId -> join users on followingId
      const rows = await db
        .select({ user: publicUserColumns })
        .from(follows)
        .innerJoin(users, eq(users.id, follows.followingId))
        .where(eq(follows.followerId, targetId))
        .orderBy(desc(follows.createdAt))
        .limit(limit)
        .offset(offset);
      resultUsers = rows.map((r) => r.user);
    }

    return NextResponse.json({
      users: resultUsers,
      data: resultUsers,
      count: resultUsers.length,
      limit,
      offset,
      type,
    });
  } catch (err) {
    console.error("GET /api/users/[id]/follow error:", err);
    return NextResponse.json({ error: "Failed to fetch follows" }, { status: 500 });
  }
}
