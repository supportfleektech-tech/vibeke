import { NextResponse } from "next/server";
import { db } from "@/db";
import { jobs } from "@/db/schema";
import { eq, ilike, and, or, desc } from "drizzle-orm";
import { z } from "zod";
import { rateLimit, getClientIp } from "@/lib/ratelimit";
import { seedDatabase } from "@/db/seed";

export const dynamic = "force-dynamic";

const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const querySchema = z.object({
  category: z.string().max(100).optional(),
  location: z.string().max(100).optional(),
  q: z.string().max(100).optional(),
});

export async function GET(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = rateLimit(`jobs:get:${ip}`, 30, 60_000);
    if (!rl.success) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded. Try again soon." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.reset - Date.now()) / 1000)) } }
      );
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const location = searchParams.get("location");
    const q = searchParams.get("q") || searchParams.get("search") || searchParams.get("query");
    const limitRaw = searchParams.get("limit");
    const offsetRaw = searchParams.get("offset");

    const paginationParsed = paginationSchema.safeParse({
      limit: limitRaw ? Number(limitRaw) : undefined,
      offset: offsetRaw ? Number(offsetRaw) : undefined,
    });
    if (!paginationParsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid pagination params", details: paginationParsed.error.flatten() },
        { status: 400 }
      );
    }
    const { limit, offset } = paginationParsed.data;

    const queryParsed = querySchema.safeParse({
      category: category || undefined,
      location: location || undefined,
      q: q || undefined,
    });
    if (!queryParsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid query params", details: queryParsed.error.flatten() },
        { status: 400 }
      );
    }

    // Seed check if table empty
    const check = await db.select().from(jobs).limit(1);
    if (check.length === 0) {
      await seedDatabase();
    }

    const conditions: any[] = [];

    if (category && category !== "all") {
      // Exact match via eq - indexed
      conditions.push(eq(jobs.category, category));
    }

    if (location && location !== "all") {
      // Location contains search via ilike - supports "Nairobi (Kilimani) / Remote" style data
      conditions.push(ilike(jobs.location, `%${location}%`));
    }

    if (q && q.trim().length > 0) {
      const term = `%${q.trim()}%`;
      // Search across title, company, and category via ilike
      conditions.push(
        // Use OR for q search but need to combine with other AND conditions; create a sql workaround if needed
        // We'll push an or condition wrapped; drizzle allows nesting via or()
        // Drizzle typing: or(...) returns SQL, need to handle via any
        // We'll handle q as a separate condition that is itself an OR
        // To satisfy type, cast to any
        or(ilike(jobs.title, term), ilike(jobs.company, term), ilike(jobs.category, term)) as any
      );
    }

    const whereClause = conditions.length === 0 ? undefined : conditions.length === 1 ? conditions[0] : and(...conditions);

    let result: (typeof jobs.$inferSelect)[];
    if (whereClause) {
      result = await db.select().from(jobs).where(whereClause).orderBy(desc(jobs.postedAt)).limit(limit).offset(offset);
    } else {
      result = await db.select().from(jobs).orderBy(desc(jobs.postedAt)).limit(limit).offset(offset);
    }

    return NextResponse.json({
      success: true,
      jobs: result,
      limit,
      offset,
      count: result.length,
    });
  } catch (err) {
    console.error("GET /api/jobs error:", err);
    return NextResponse.json({ success: false, error: "Failed to fetch jobs" }, { status: 500 });
  }
}
