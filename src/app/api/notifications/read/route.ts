import { NextResponse } from "next/server";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { z } from "zod";
import { rateLimit, getClientIp } from "@/lib/ratelimit";
import { getCurrentUserId } from "@/lib/get-user";

export const dynamic = "force-dynamic";

const markReadSchema = z.object({
  ids: z.union([z.array(z.coerce.number().int().positive()), z.literal("all")]),
});

async function handleMarkRead(request: Request) {
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
  const parsed = markReadSchema.safeParse(body);
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

  try {
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
    console.error("POST /api/notifications/read error:", err);
    return NextResponse.json({ error: "Failed to mark notifications read" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return handleMarkRead(request);
}

export async function PATCH(request: Request) {
  return handleMarkRead(request);
}
