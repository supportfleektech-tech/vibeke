import { NextResponse } from "next/server";
import { db } from "@/db";
import { lives, users } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { ensureSeeded } from "@/db/seed";
import { z } from "zod";

export const dynamic = "force-dynamic";

const liveCreateSchema = z.object({
  title: z.string().min(3).max(100),
  category: z.string().min(1).max(50).default("General"),
  description: z.string().max(500).default("").optional(),
  thumbnail: z.string().url(),
});

const statusEnum = z.enum(["live", "ended", "all"]);

export async function GET(request: Request) {
  try {
    const { rateLimit, getClientIp } = await import("@/lib/ratelimit");
    const ip = getClientIp(request);
    const rl = await rateLimit(`lives:get:${ip}`, 30, 60_000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again soon." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil((rl.reset - Date.now()) / 1000)) },
        }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "all";
    const limitRaw = searchParams.get("limit");
    const offsetRaw = searchParams.get("offset");

    let limit = parseInt(limitRaw || "20", 10);
    if (isNaN(limit)) limit = 20;
    limit = Math.min(Math.max(limit, 1), 50);
    let offset = parseInt(offsetRaw || "0", 10);
    if (isNaN(offset) || offset < 0) offset = 0;

    const statusParsed = statusEnum.safeParse(status);
    if (!statusParsed.success) {
      return NextResponse.json(
        { error: "Invalid status - must be live|ended|all", details: statusParsed.error.flatten() },
        { status: 400 }
      );
    }
    const validatedStatus = statusParsed.data;

    // Seed check
    const check = await db.select().from(lives).limit(1);
    if (check.length === 0) {
      await ensureSeeded();
    }

    let result: (typeof lives.$inferSelect)[];
    if (validatedStatus === "all") {
      result = await db
        .select()
        .from(lives)
        .orderBy(desc(lives.startedAt))
        .limit(limit)
        .offset(offset);
    } else {
      result = await db
        .select()
        .from(lives)
        .where(eq(lives.status, validatedStatus))
        .orderBy(desc(lives.startedAt))
        .limit(limit)
        .offset(offset);
    }

    return NextResponse.json({ lives: result, count: result.length, limit, offset, status: validatedStatus });
  } catch (err) {
    console.error("GET /api/lives error:", err);
    return NextResponse.json({ error: "Failed to fetch lives" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { rateLimit, getClientIp } = await import("@/lib/ratelimit");
    const { getCurrentUserId } = await import("@/lib/get-user");

    const ip = getClientIp(request);
    const rl = await rateLimit(`lives:create:${ip}`, 5, 60_000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Max 5 go-live per minute." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil((rl.reset - Date.now()) / 1000)) },
        }
      );
    }

    const body = await request.json();
    const parsed = liveCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { title, category, description, thumbnail } = parsed.data;

    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [currentUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const host = currentUser || {
      id: userId,
      name: "Brian Mwangi",
      handle: "brianmwangi",
      avatar: "https://images.pexels.com/photos/14950779/pexels-photo-14950779.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    };

    const [live] = await db
      .insert(lives)
      .values({
        hostId: host.id,
        hostName: host.name,
        hostHandle: host.handle,
        hostAvatar: host.avatar,
        title: title.trim(),
        category: category || "General",
        description: description || "",
        thumbnail: thumbnail!,
        status: "live",
        viewersCount: 0,
        likes: 0,
        startedAt: new Date(),
      })
      .returning();

    return NextResponse.json({ live, success: true }, { status: 201 });
  } catch (err) {
    console.error("POST /api/lives error:", err);
    return NextResponse.json({ error: "Failed to create live" }, { status: 500 });
  }
}
