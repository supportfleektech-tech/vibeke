import { NextResponse } from "next/server";
import { db } from "@/db";
import { clips, hashtags, users } from "@/db/schema";
import { desc, eq, and, sql } from "drizzle-orm";
import { seedDatabase } from "@/db/seed";
import { rateLimit, getClientIp } from "@/lib/ratelimit";
import { getCurrentUserId } from "@/lib/get-user";
import { z } from "zod";

export const dynamic = "force-dynamic";

const clipCreateSchema = z.object({
  title: z.string().min(3, "Title min 3 chars").max(100, "Title max 100 chars").trim(),
  description: z.string().min(3, "Description min 3 chars").max(500, "Description max 500 chars").trim(),
  videoUrl: z.string().url("videoUrl must be a valid URL"),
  thumbnailUrl: z.string().url("thumbnailUrl must be a valid URL"),
  sound: z.string().max(120).optional().default("Original • Kinara"),
  durationSec: z.coerce.number().int().min(1).max(60).default(15),
  hashtags: z.array(z.string().max(30)).max(10).optional().default([]),
  city: z.string().min(1).max(50).default("Nairobi"),
  featured: z.boolean().optional().default(false),
});

export async function GET(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = rateLimit(`clips:list:${ip}`, 30, 60_000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Max 30 requests per minute." },
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
    const city = searchParams.get("city");
    const hashtag = searchParams.get("hashtag");
    const authorId = searchParams.get("authorId");
    const featuredParam = searchParams.get("featured");
    const sort = (searchParams.get("sort") || "trending") as "trending" | "recent" | "following";

    const limitRaw = searchParams.get("limit");
    const offsetRaw = searchParams.get("offset");
    const parsedLimit = parseInt(limitRaw || "10", 10);
    const parsedOffset = parseInt(offsetRaw || "0", 10);
    const limit = Math.min(Math.max(isNaN(parsedLimit) ? 10 : parsedLimit, 1), 50);
    const offset = Math.max(isNaN(parsedOffset) ? 0 : parsedOffset, 0);

    const conditions: any[] = [];
    if (city && city !== "all") conditions.push(eq(clips.city, city));
    if (authorId) conditions.push(eq(clips.authorId, authorId));
    if (featuredParam === "true") conditions.push(eq(clips.featured, true));
    if (hashtag) {
      // jsonb containment: hashtags @> '["tag"]'::jsonb
      conditions.push(sql`${clips.hashtags} @> ${JSON.stringify([hashtag])}::jsonb`);
    }

    const whereClause = conditions.length === 0 ? undefined : conditions.length === 1 ? conditions[0] : and(...conditions);

    // Determine ordering
    let orderBy: any;
    if (sort === "recent" || sort === "following") {
      orderBy = desc(clips.createdAt);
    } else {
      // trending default: likes desc, views desc, then createdAt desc
      orderBy = [desc(clips.likes), desc(clips.views), desc(clips.createdAt)];
    }
    const orderByArray = Array.isArray(orderBy) ? orderBy : [orderBy];

    // Build query with optional where
    let result;
    if (whereClause) {
      result = await db
        .select()
        .from(clips)
        .where(whereClause)
        .orderBy(...orderByArray)
        .limit(limit)
        .offset(offset);
    } else {
      result = await db.select().from(clips).orderBy(...orderByArray).limit(limit).offset(offset);
    }

    // Seed check if empty and no filters or filtered empty due to no data
    if (result.length === 0) {
      const check = await db.select().from(clips).limit(1);
      if (check.length === 0) {
        // Seed only once; check posts/users as indicator as well
        const postCheck = await db.select().from(users).limit(1);
        if (postCheck.length === 0) {
          await seedDatabase();
        } else {
          // users exist but clips empty — seed will skip due to existing users; insert minimal clips fallback is handled inside seed or we just re-query
          // Try calling seed anyway (no-op if users exist) then re-query
          try {
            await seedDatabase();
          } catch {}
        }
        // Re-query after seed attempt
        if (whereClause) {
          result = await db
            .select()
            .from(clips)
            .where(whereClause)
            .orderBy(...orderByArray)
            .limit(limit)
            .offset(offset);
        } else {
          result = await db.select().from(clips).orderBy(...orderByArray).limit(limit).offset(offset);
        }
        // If still empty and no filters, it means seed doesn't create clips — return empty correctly
      }
    }

    // Cursor is next offset if more results possibly exist
    const nextCursor = result.length === limit ? String(offset + limit) : null;

    return NextResponse.json({
      clips: result,
      nextCursor,
      limit,
      offset,
      count: result.length,
    });
  } catch (err) {
    console.error("GET /api/clips error:", err);
    return NextResponse.json({ error: "Failed to fetch clips" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = rateLimit(`clips:create:${ip}`, 10, 60_000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Max 10 clips per minute." },
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
    const parsed = clipCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }
    const { title, description, videoUrl, thumbnailUrl, sound, durationSec, hashtags: tagList, city, featured } = parsed.data;

    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [author] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const authorName = author?.name || "Brian Mwangi";
    const authorHandle = author?.handle || "brianmwangi";
    const authorAvatar =
      author?.avatar ||
      "https://images.pexels.com/photos/14950779/pexels-photo-14950779.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";
    const authorVerified = author?.verified ?? true;

    const [newClip] = await db
      .insert(clips)
      .values({
        authorId: userId,
        authorName,
        authorHandle,
        authorAvatar,
        authorVerified,
        title: title.trim(),
        description: description.trim(),
        videoUrl,
        thumbnailUrl,
        sound: sound || "Original • Kinara",
        soundTitle: sound || "Original sound",
        durationSec,
        hashtags: tagList || [],
        city: city || "Nairobi",
        featured: featured || false,
        likes: 0,
        commentsCount: 0,
        views: 0,
      })
      .returning();

    // Upsert hashtags: increment count & trendingScore
    if (tagList && tagList.length > 0) {
      for (const rawTag of tagList) {
        const tag = rawTag.replace(/^#/, "").trim();
        if (!tag) continue;
        try {
          await db
            .insert(hashtags)
            .values({
              tag,
              count: 1,
              trendingScore: 1,
              category: "general",
              updatedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: hashtags.tag,
              set: {
                count: sql`${hashtags.count} + 1`,
                trendingScore: sql`${hashtags.trendingScore} + 1`,
                updatedAt: new Date(),
              },
            });
        } catch (e) {
          console.warn(`hashtag upsert failed for ${tag}:`, e);
        }
      }
    }

    // Optional: create notifications for followers — best-effort, no-op if no followers table
    // Skipped: requires followers relationship; keep lightweight

    return NextResponse.json({ clip: newClip, success: true }, { status: 201 });
  } catch (err) {
    console.error("POST /api/clips error:", err);
    return NextResponse.json({ error: "Failed to create clip" }, { status: 500 });
  }
}
