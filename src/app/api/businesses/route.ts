import { NextResponse } from "next/server";
import { db } from "@/db";
import { businesses } from "@/db/schema";
import { and, ilike, or } from "drizzle-orm";
import { z } from "zod";
import { rateLimit, getClientIp } from "@/lib/ratelimit";
import { seedDatabase } from "@/db/seed";

export const dynamic = "force-dynamic";

const businessesQuerySchema = z.object({
  city: z.string().optional(),
  category: z.string().optional(),
  q: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export async function GET(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = rateLimit(`businesses:get:${ip}`, 30, 60_000);
    if (!rl.success) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded. Try again soon." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.reset - Date.now()) / 1000)) } }
      );
    }

    const { searchParams } = new URL(request.url);
    const raw = {
      city: searchParams.get("city") || undefined,
      category: searchParams.get("category") || undefined,
      q: searchParams.get("q") || searchParams.get("search") || undefined,
      limit: searchParams.get("limit") || undefined,
      offset: searchParams.get("offset") || undefined,
    };

    const parsed = businessesQuerySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid query params", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { city, category, q, limit, offset } = parsed.data;

    // Seed check
    const check = await db.select().from(businesses).limit(1);
    if (check.length === 0) {
      await seedDatabase();
    }

    const conditions: any[] = [];
    if (city && city !== "all") {
      conditions.push(ilike(businesses.city, `%${city}%`));
    }
    if (category && category !== "all") {
      conditions.push(ilike(businesses.category, `%${category}%`));
    }
    if (q) {
      const like = `%${q}%`;
      conditions.push(
        or(
          ilike(businesses.name, like),
          ilike(businesses.category, like),
          ilike(businesses.city, like),
          ilike(businesses.headline, like),
          ilike(businesses.bio, like)
        ) as any
      );
    }

    const whereClause =
      conditions.length === 0 ? undefined : conditions.length === 1 ? conditions[0] : and(...conditions);

    let result: (typeof businesses.$inferSelect)[];
    if (whereClause) {
      result = await db.select().from(businesses).where(whereClause).limit(limit).offset(offset);
    } else {
      result = await db.select().from(businesses).limit(limit).offset(offset);
    }

    return NextResponse.json({
      success: true,
      data: result,
      businesses: result,
      limit,
      offset,
      count: result.length,
    });
  } catch (err) {
    console.error("GET /api/businesses error:", err);
    return NextResponse.json({ success: false, error: "Failed to fetch businesses" }, { status: 500 });
  }
}
