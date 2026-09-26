import { NextResponse } from "next/server";
import { db } from "@/db";
import { stories, users } from "@/db/schema";
import { desc, eq, and, sql } from "drizzle-orm";
import { ensureSeeded } from "@/db/seed";
import { z } from "zod";

export const dynamic = "force-dynamic";

const storyCreateSchema = z.object({
  mediaUrl: z.string().url(),
  mediaType: z.enum(["image", "video"]).default("image"),
  caption: z.string().max(200).default("").optional(),
  durationHours: z.coerce.number().int().min(1).max(24).default(24),
});

export async function GET(request: Request) {
  try {
    const { rateLimit, getClientIp } = await import("@/lib/ratelimit");
    const ip = getClientIp(request);
    const rl = await rateLimit(`stories:get:${ip}`, 30, 60_000);
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
    const authorId = searchParams.get("authorId") || undefined;
    const limitRaw = searchParams.get("limit");
    const offsetRaw = searchParams.get("offset");

    let limit = parseInt(limitRaw || "20", 10);
    if (isNaN(limit)) limit = 20;
    limit = Math.min(Math.max(limit, 1), 50);
    let offset = parseInt(offsetRaw || "0", 10);
    if (isNaN(offset) || offset < 0) offset = 0;

    // Seed check if table empty
    const check = await db.select().from(stories).limit(1);
    if (check.length === 0) {
      await ensureSeeded();
    }

    // Build WHERE: expiresAt > now, authorId eq if provided, orderBy createdAt desc
    const conditions: any[] = [sql`${stories.expiresAt} > now()`];
    if (authorId) {
      conditions.push(eq(stories.authorId, authorId));
    }

    const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);

    const result = await db
      .select()
      .from(stories)
      .where(whereClause)
      .orderBy(desc(stories.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({ stories: result, count: result.length, limit, offset });
  } catch (err) {
    console.error("GET /api/stories error:", err);
    return NextResponse.json({ error: "Failed to fetch stories" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { rateLimit, getClientIp } = await import("@/lib/ratelimit");
    const { getCurrentUserId } = await import("@/lib/get-user");

    const ip = getClientIp(request);
    const rl = await rateLimit(`stories:create:${ip}`, 10, 60_000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again soon." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil((rl.reset - Date.now()) / 1000)) },
        }
      );
    }

    const body = await request.json();
    const parsed = storyCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { mediaUrl, mediaType, caption, durationHours } = parsed.data;

    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const [currentUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const author = currentUser || {
      id: userId,
      name: "Brian Mwangi",
      handle: "brianmwangi",
      avatar: "https://images.pexels.com/photos/14950779/pexels-photo-14950779.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    };

    const expiresAt = new Date(Date.now() + (durationHours ?? 24) * 3600 * 1000);

    const [story] = await db
      .insert(stories)
      .values({
        authorId: author.id,
        authorName: author.name,
        authorHandle: author.handle,
        authorAvatar: author.avatar,
        mediaUrl: mediaUrl!,
        mediaType: mediaType || "image",
        caption: caption || "",
        expiresAt,
        viewedBy: [],
      })
      .returning();

    return NextResponse.json({ story, success: true }, { status: 201 });
  } catch (err) {
    console.error("POST /api/stories error:", err);
    return NextResponse.json({ error: "Failed to create story" }, { status: 500 });
  }
}
