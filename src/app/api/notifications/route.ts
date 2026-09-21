import { NextResponse } from "next/server";
import { db } from "@/db";
import { notifications, users } from "@/db/schema";
import { desc, eq, and, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { rateLimit, getClientIp } from "@/lib/ratelimit";
import { getCurrentUserId } from "@/lib/get-user";

export const dynamic = "force-dynamic";

const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const notificationTypeEnum = z.enum([
  "like",
  "comment",
  "follow",
  "mention",
  "escrow",
  "live",
  "clip",
  "story",
  "job",
  "system",
]);

const notificationCreateSchema = z.object({
  userId: z.string().min(1, "userId required").max(100),
  actorName: z.string().min(1).max(100),
  actorAvatar: z.string().min(1).max(500),
  type: notificationTypeEnum,
  entityType: z.string().min(1).max(50).default("post"),
  entityId: z.string().min(1).max(100),
  message: z.string().min(1).max(500),
});

const markReadBodySchema = z.object({
  ids: z.union([z.array(z.coerce.number().int().positive()), z.literal("all")]),
});

// GET /api/notifications?unreadOnly=bool&limit&offset&type
export async function GET(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = rateLimit(`notifications:get:${ip}`, 30, 60_000);
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
    const unreadOnlyRaw = searchParams.get("unreadOnly");
    const typeRaw = searchParams.get("type");
    const limitRaw = searchParams.get("limit");
    const offsetRaw = searchParams.get("offset");

    const unreadOnly = unreadOnlyRaw === "true" || unreadOnlyRaw === "1";

    const paginationParsed = paginationSchema.safeParse({
      limit: limitRaw ? Number(limitRaw) : undefined,
      offset: offsetRaw ? Number(offsetRaw) : undefined,
    });
    if (!paginationParsed.success) {
      return NextResponse.json(
        { error: "Invalid pagination params", details: paginationParsed.error.flatten() },
        { status: 400 }
      );
    }
    const { limit, offset } = paginationParsed.data;

    if (typeRaw !== null && typeRaw !== "" && typeRaw !== "all") {
      const typeParsed = notificationTypeEnum.safeParse(typeRaw);
      if (!typeParsed.success) {
        return NextResponse.json(
          { error: "Invalid type", details: typeParsed.error.flatten() },
          { status: 400 }
        );
      }
    }

    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const conditions: any[] = [eq(notifications.userId, userId)];
    if (unreadOnly) conditions.push(eq(notifications.read, false));
    if (typeRaw && typeRaw !== "all" && typeRaw !== "") conditions.push(eq(notifications.type, typeRaw));

    const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);

    const items = await db
      .select()
      .from(notifications)
      .where(whereClause)
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);

    // unreadCount for current user (global, not filtered by type/unreadOnly except userId)
    const unreadRows = await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));

    return NextResponse.json({
      success: true,
      notifications: items,
      unreadCount: unreadRows.length,
      count: items.length,
      limit,
      offset,
    });
  } catch (err) {
    console.error("GET /api/notifications error:", err);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

// POST /api/notifications - create notification (internal)
export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = rateLimit(`notifications:create:${ip}`, 30, 60_000);
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

    const body = await request.json().catch(() => ({}));
    const parsed = notificationCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // For security, actor is current user - override actorId, but keep provided actorName/avatar as display if valid
    // Optionally fetch current user to enrich
    const [actor] = await db.select().from(users).where(eq(users.id, currentUserId)).limit(1);
    const actorName = actor?.name || parsed.data.actorName;
    const actorAvatar =
      actor?.avatar || parsed.data.actorAvatar || "https://api.dicebear.com/7.x/initials/svg?seed=" + encodeURIComponent(currentUserId);

    const [notification] = await db
      .insert(notifications)
      .values({
        userId: parsed.data.userId,
        actorId: currentUserId,
        actorName,
        actorAvatar,
        type: parsed.data.type,
        entityType: parsed.data.entityType || "post",
        entityId: parsed.data.entityId,
        message: parsed.data.message,
        read: false,
      })
      .returning();

    return NextResponse.json({ success: true, notification }, { status: 201 });
  } catch (err) {
    console.error("POST /api/notifications error:", err);
    return NextResponse.json({ error: "Failed to create notification" }, { status: 500 });
  }
}

// PATCH /api/notifications - mark read (alternative to /read)
export async function PATCH(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = rateLimit(`notifications:read:${ip}`, 30, 60_000);
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

    const body = await request.json().catch(() => ({}));
    const parsed = markReadBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { ids } = parsed.data;
    let updated: any[] = [];

    if (ids === "all") {
      updated = await db
        .update(notifications)
        .set({ read: true })
        .where(and(eq(notifications.userId, userId), eq(notifications.read, false)))
        .returning();
    } else {
      if (ids.length === 0) {
        return NextResponse.json({ success: true, updated: 0, count: 0 });
      }
      updated = await db
        .update(notifications)
        .set({ read: true })
        .where(and(eq(notifications.userId, userId), inArray(notifications.id, ids)))
        .returning();
    }

    return NextResponse.json({ success: true, updated: updated.length, count: updated.length });
  } catch (err) {
    console.error("PATCH /api/notifications error:", err);
    return NextResponse.json({ error: "Failed to mark notifications read" }, { status: 500 });
  }
}
