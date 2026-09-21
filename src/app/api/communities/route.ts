import { NextResponse } from "next/server";
import { db } from "@/db";
import { communities } from "@/db/schema";
import { and, ilike, or } from "drizzle-orm";
import { z } from "zod";
import { rateLimit, getClientIp } from "@/lib/ratelimit";
import { seedDatabase } from "@/db/seed";

export const dynamic = "force-dynamic";

const communitiesQuerySchema = z.object({
  category: z.string().optional(),
  q: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export async function GET(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = rateLimit(`communities:get:${ip}`, 30, 60_000);
    if (!rl.success) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded. Try again soon." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.reset - Date.now()) / 1000)) } }
      );
    }

    const { searchParams } = new URL(request.url);
    const raw = {
      category: searchParams.get("category") || undefined,
      q: searchParams.get("q") || searchParams.get("search") || undefined,
      limit: searchParams.get("limit") || undefined,
      offset: searchParams.get("offset") || undefined,
    };

    const parsed = communitiesQuerySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid query params", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { category, q, limit, offset } = parsed.data;

    // Seed check
    const check = await db.select().from(communities).limit(1);
    if (check.length === 0) {
      await seedDatabase();
    }

    const conditions: any[] = [];
    if (category && category !== "all") {
      conditions.push(ilike(communities.category, `%${category}%`));
    }
    if (q) {
      const like = `%${q}%`;
      conditions.push(
        or(
          ilike(communities.name, like),
          ilike(communities.tagline, like),
          ilike(communities.city, like),
          ilike(communities.category, like),
          ilike(communities.description, like)
        ) as any
      );
    }

    const whereClause =
      conditions.length === 0 ? undefined : conditions.length === 1 ? conditions[0] : and(...conditions);

    let result: (typeof communities.$inferSelect)[];
    if (whereClause) {
      result = await db.select().from(communities).where(whereClause).limit(limit).offset(offset);
    } else {
      result = await db.select().from(communities).limit(limit).offset(offset);
    }

    return NextResponse.json({
      success: true,
      data: result,
      communities: result,
      limit,
      offset,
      count: result.length,
    });
  } catch (err) {
    console.error("GET /api/communities error:", err);
    return NextResponse.json({ success: false, error: "Failed to fetch communities" }, { status: 500 });
  }
}
