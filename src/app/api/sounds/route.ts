import { NextResponse } from "next/server";
import { db } from "@/db";
import { sounds } from "@/db/schema";
import { eq, and, or, ilike, desc } from "drizzle-orm";
import { z } from "zod";
import { rateLimit, getClientIp } from "@/lib/ratelimit";
import { getCurrentUserId } from "@/lib/get-user";

export const dynamic = "force-dynamic";

const soundCreateSchema = z.object({
  title: z.string().min(1, "title required").max(100).trim(),
  artist: z.string().min(1, "artist required").max(100).trim(),
  cover: z.string().url("cover must be a valid URL"),
  audioUrl: z.string().url("audioUrl must be a valid URL"),
  durationSec: z.coerce.number().int().min(1, "durationSec must be 1-60").max(60, "durationSec must be 1-60"),
  category: z.string().min(1, "category required").max(50).trim().default("Afrobeats"),
});

const querySchema = z.object({
  category: z.string().max(50).optional(),
  q: z.string().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

function generateId(title: string): string {
  const base = title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "sound";
  const rand = Math.random().toString(36).slice(2, 7);
  const g = globalThis as any;
  if (g.crypto && typeof g.crypto.randomUUID === "function") return g.crypto.randomUUID();
  return `${base}-${rand}-${Date.now().toString(36)}`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({
      category: searchParams.get("category") || undefined,
      q: searchParams.get("q") || undefined,
      limit: searchParams.get("limit") || undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query params", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { category, q, limit } = parsed.data;

    const conditions: any[] = [];
    if (category && category !== "all") {
      conditions.push(eq(sounds.category, category));
    }
    if (q && q.trim().length > 0) {
      const term = `%${q.trim()}%`;
      conditions.push(or(ilike(sounds.title, term), ilike(sounds.artist, term)) as any);
    }

    const whereClause = conditions.length === 0 ? undefined : conditions.length === 1 ? conditions[0] : and(...conditions);

    let result: (typeof sounds.$inferSelect)[];
    if (whereClause) {
      result = await db.select().from(sounds).where(whereClause).orderBy(desc(sounds.usesCount)).limit(limit);
    } else {
      result = await db.select().from(sounds).orderBy(desc(sounds.usesCount)).limit(limit);
    }

    return NextResponse.json({ sounds: result });
  } catch (err) {
    console.error("GET /api/sounds error:", err);
    return NextResponse.json({ error: "Failed to fetch sounds" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(`sounds:create:${ip}`, 10, 60_000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Max 10 requests per minute." },
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
    const parsed = soundCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { title, artist, cover, audioUrl, durationSec, category } = parsed.data;
    const id = generateId(title);

    const [sound] = await db
      .insert(sounds)
      .values({
        id,
        title: title.trim(),
        artist: artist.trim(),
        cover,
        audioUrl,
        durationSec,
        category: category.trim(),
        usesCount: 0,
      })
      .returning();

    return NextResponse.json({ sound }, { status: 201 });
  } catch (err) {
    console.error("POST /api/sounds error:", err);
    return NextResponse.json({ error: "Failed to create sound" }, { status: 500 });
  }
}
