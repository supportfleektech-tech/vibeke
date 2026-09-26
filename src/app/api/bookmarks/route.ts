import { NextResponse } from "next/server";
import { db } from "@/db";
import { bookmarks, clips } from "@/db/schema";
import { desc, eq, and, sql } from "drizzle-orm";
import { z } from "zod";
import { rateLimit, getClientIp } from "@/lib/ratelimit";
import { getCurrentUserId } from "@/lib/get-user";

export const dynamic = "force-dynamic";

const entityTypeEnum = z.enum(["post", "clip", "marketplace", "job"]);

const querySchema = z.object({
  entityType: entityTypeEnum.optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const toggleSchema = z.object({
  entityType: entityTypeEnum,
  entityId: z.string().min(1, "entityId required").max(100),
});

// GET /api/bookmarks?entityType=post|clip|marketplace|job&limit&offset
export async function GET(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(`bookmarks:get:${ip}`, 30, 60_000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again soon." },
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

    const { searchParams } = new URL(request.url);
    const raw = {
      entityType: searchParams.get("entityType") || undefined,
      limit: searchParams.get("limit") || undefined,
      offset: searchParams.get("offset") || undefined,
    };

    // Validate entityType if provided and not "all"
    if (raw.entityType && raw.entityType !== "all") {
      const eParsed = entityTypeEnum.safeParse(raw.entityType);
      if (!eParsed.success) {
        return NextResponse.json(
          { error: "Invalid entityType", details: eParsed.error.flatten() },
          { status: 400 }
        );
      }
    } else if (raw.entityType === "all") {
      raw.entityType = undefined;
    }

    const parsed = querySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query params", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { entityType, limit, offset } = parsed.data;

    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const conditions: any[] = [eq(bookmarks.userId, userId)];
    if (entityType) conditions.push(eq(bookmarks.entityType, entityType));

    const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);

    const items = await db
      .select()
      .from(bookmarks)
      .where(whereClause)
      .orderBy(desc(bookmarks.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      success: true,
      bookmarks: items,
      data: items,
      count: items.length,
      limit,
      offset,
    });
  } catch (err) {
    console.error("GET /api/bookmarks error:", err);
    return NextResponse.json({ error: "Failed to fetch bookmarks" }, { status: 500 });
  }
}

// POST /api/bookmarks - toggle bookmark
export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(`bookmarks:toggle:${ip}`, 20, 60_000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Max 20 toggles per minute." },
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

    const body = await request.json().catch(() => ({}));
    const parsed = toggleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { entityType, entityId } = parsed.data;

    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existing = await db
      .select()
      .from(bookmarks)
      .where(and(eq(bookmarks.userId, userId), eq(bookmarks.entityType, entityType), eq(bookmarks.entityId, entityId)))
      .limit(1);

    if (existing.length > 0) {
      // Delete bookmark + decrement clip bookmarksCount if applicable
      await db
        .delete(bookmarks)
        .where(and(eq(bookmarks.userId, userId), eq(bookmarks.entityType, entityType), eq(bookmarks.entityId, entityId)));

      if (entityType === "clip") {
        const clipId = parseInt(entityId, 10);
        if (!isNaN(clipId)) {
          try {
            await db
              .update(clips)
              .set({ bookmarksCount: sql`GREATEST(${clips.bookmarksCount} - 1, 0)` })
              .where(eq(clips.id, clipId));
          } catch (e) {
            console.warn("Failed to decrement clip bookmarksCount:", e);
          }
        }
      }

      return NextResponse.json({ success: true, bookmarked: false });
    } else {
      // Insert bookmark + increment clip bookmarksCount if applicable
      try {
        await db.insert(bookmarks).values({
          userId,
          entityType,
          entityId,
        });
      } catch (e: any) {
        // Handle unique violation race
        const code = e?.code || e?.cause?.code;
        const msg = String(e?.message || "");
        if (code === "23505" || /unique|duplicate/i.test(msg)) {
          // Already exists due to race - treat as bookmarked
          return NextResponse.json({ success: true, bookmarked: true });
        }
        throw e;
      }

      if (entityType === "clip") {
        const clipId = parseInt(entityId, 10);
        if (!isNaN(clipId)) {
          try {
            await db
              .update(clips)
              .set({ bookmarksCount: sql`${clips.bookmarksCount} + 1` })
              .where(eq(clips.id, clipId));
          } catch (e) {
            console.warn("Failed to increment clip bookmarksCount:", e);
          }
        }
      }

      return NextResponse.json({ success: true, bookmarked: true });
    }
  } catch (err) {
    console.error("POST /api/bookmarks error:", err);
    return NextResponse.json({ error: "Failed to toggle bookmark" }, { status: 500 });
  }
}
