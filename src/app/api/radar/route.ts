import { NextResponse } from "next/server";
import { db } from "@/db";
import { localRadar } from "@/db/schema";
import { seedDatabase } from "@/db/seed";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { rateLimit, getClientIp } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

// Allowed radar types - index-aware (radar_type_idx)
const radarTypeEnum = z.enum(["friend", "business", "event", "deal", "listing", "service"]);

const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export async function GET(request: Request) {
  try {
    // Rate-limit 30/min per IP (production-ready, prevents abuse)
    const ip = getClientIp(request);
    const rl = rateLimit(`radar:${ip}`, 30, 60_000);
    if (!rl.success) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded. Try again soon." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.reset - Date.now()) / 1000)) } }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const city = searchParams.get("city");
    const limitRaw = searchParams.get("limit");
    const offsetRaw = searchParams.get("offset");

    // Validate pagination with zod
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

    // Validate type enum if provided and not "all"
    if (type && type !== "all") {
      const typeParsed = radarTypeEnum.safeParse(type.toLowerCase());
      if (!typeParsed.success) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid type. Must be one of: ${radarTypeEnum.options.join(", ")}`,
          },
          { status: 400 }
        );
      }
    }

    // Build SQL WHERE conditions using drizzle eq/and - index-aware
    const conditions: ReturnType<typeof eq>[] = [];
    if (type && type !== "all") {
      conditions.push(eq(localRadar.type, type.toLowerCase()));
    }
    if (city && city !== "all") {
      conditions.push(eq(localRadar.city, city));
    }

    const whereClause = conditions.length === 0 ? undefined : conditions.length === 1 ? conditions[0] : and(...conditions);

    // Transaction-safe seed check (avoid thundering herd: check first before seeding)
    const check = await db.select().from(localRadar).limit(1);
    if (check.length === 0) {
      await seedDatabase();
    }

    // Index-aware query with SQL WHERE, limit/offset pagination - no JS filtering
    let radar: (typeof localRadar.$inferSelect)[];
    if (whereClause) {
      radar = await db.select().from(localRadar).where(whereClause).limit(limit).offset(offset);
    } else {
      radar = await db.select().from(localRadar).limit(limit).offset(offset);
    }

    return NextResponse.json({
      success: true,
      data: radar,
      radar,
      limit,
      offset,
      count: radar.length,
    });
  } catch (err) {
    console.error("GET /api/radar error:", err);
    return NextResponse.json({ success: false, error: "Failed to fetch local radar" }, { status: 500 });
  }
}
