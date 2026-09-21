import { NextResponse } from "next/server";
import { db } from "@/db";
import { hashtags } from "@/db/schema";
import { desc } from "drizzle-orm";
import { z } from "zod";
import { rateLimit, getClientIp } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(10),
});

// GET /api/hashtags/trending?limit 1-20 default 10 - orderBy trendingScore desc
export async function GET(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = rateLimit(`hashtags:trending:${ip}`, 30, 60_000);
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
    const rawLimit = searchParams.get("limit");

    const parsed = querySchema.safeParse({
      limit: rawLimit ? Number(rawLimit) : undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query params", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { limit } = parsed.data;

    const items = await db
      .select()
      .from(hashtags)
      .orderBy(desc(hashtags.trendingScore))
      .limit(limit);

    return NextResponse.json({
      success: true,
      hashtags: items,
      data: items,
      count: items.length,
      limit,
    });
  } catch (err) {
    console.error("GET /api/hashtags/trending error:", err);
    return NextResponse.json({ error: "Failed to fetch trending hashtags" }, { status: 500 });
  }
}
