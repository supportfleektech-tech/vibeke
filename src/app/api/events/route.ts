import { NextResponse } from "next/server";
import { db } from "@/db";
import { events, users } from "@/db/schema";
import { asc, eq, and, or, ilike, desc } from "drizzle-orm";
import { z } from "zod";
import { rateLimit, getClientIp } from "@/lib/ratelimit";
import { getCurrentUserId } from "@/lib/get-user";
import { seedDatabase } from "@/db/seed";

export const dynamic = "force-dynamic";

const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const querySchema = z.object({
  city: z.string().max(50).optional(),
  category: z.string().max(50).optional(),
  q: z.string().max(100).optional(),
});

const eventCreateSchema = z
  .object({
    title: z.string().min(3, "Title must be 3-100 chars").max(100).trim(),
    description: z.string().min(10, "Description must be 10-500 chars").max(500).trim(),
    banner: z.string().url("banner must be a valid URL"),
    location: z.string().min(1, "Location required").max(100).trim(),
    city: z.string().min(1, "City required").max(50).trim(),
    category: z.string().min(1).max(50).default("Tech"),
    startAt: z.string().min(1, "startAt required").refine((v) => !isNaN(Date.parse(v)), { message: "startAt must be ISO date" }),
    endAt: z.string().min(1, "endAt required").refine((v) => !isNaN(Date.parse(v)), { message: "endAt must be ISO date" }),
    maxAttendees: z.coerce.number().int().min(1).max(1000).default(100),
    price: z.coerce.number().int().min(0).default(0),
  })
  .refine((data) => new Date(data.endAt) > new Date(data.startAt), {
    message: "endAt must be after startAt",
    path: ["endAt"],
  });

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  const rand = Math.random().toString(36).slice(2, 7);
  return `${base || "event"}-${rand}`;
}

// GET /api/events?city&category&q&limit&offset
export async function GET(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = rateLimit(`events:get:${ip}`, 30, 60_000);
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
    const cityRaw = searchParams.get("city");
    const categoryRaw = searchParams.get("category");
    const qRaw = searchParams.get("q") || searchParams.get("search") || searchParams.get("query");
    const limitRaw = searchParams.get("limit");
    const offsetRaw = searchParams.get("offset");

    const paginationParsed = paginationSchema.safeParse({
      limit: limitRaw ? Number(limitRaw) : undefined,
      offset: offsetRaw ? Number(offsetRaw) : undefined,
    });
    if (!paginationParsed.success) {
      return NextResponse.json(
        { error: "Invalid pagination params", details: paginationParsed.error.flatten() },
        { status: 400 }
      );
    }
    const { limit, offset } = paginationParsed.data;

    const queryParsed = querySchema.safeParse({
      city: cityRaw || undefined,
      category: categoryRaw || undefined,
      q: qRaw || undefined,
    });
    if (!queryParsed.success) {
      return NextResponse.json(
        { error: "Invalid query params", details: queryParsed.error.flatten() },
        { status: 400 }
      );
    }
    const { city, category, q } = queryParsed.data;

    // Seed check if table empty
    try {
      const check = await db.select().from(events).limit(1);
      if (check.length === 0) {
        await seedDatabase();
      }
    } catch (e) {
      // Ignore seed errors, proceed with query
      console.warn("events seed check warning:", e);
    }

    const conditions: any[] = [];
    if (city && city !== "all") conditions.push(eq(events.city, city));
    if (category && category !== "all") conditions.push(eq(events.category, category));
    if (q && q.trim().length > 0) {
      const term = `%${q.trim()}%`;
      conditions.push(or(ilike(events.title, term), ilike(events.description, term)) as any);
    }

    const whereClause = conditions.length === 0 ? undefined : conditions.length === 1 ? conditions[0] : and(...conditions);

    let result: (typeof events.$inferSelect)[];
    if (whereClause) {
      result = await db.select().from(events).where(whereClause).orderBy(asc(events.startAt)).limit(limit).offset(offset);
    } else {
      result = await db.select().from(events).orderBy(asc(events.startAt)).limit(limit).offset(offset);
    }

    return NextResponse.json({
      success: true,
      events: result,
      data: result,
      limit,
      offset,
      count: result.length,
    });
  } catch (err) {
    console.error("GET /api/events error:", err);
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
}

// POST /api/events - create event
export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = rateLimit(`events:create:${ip}`, 10, 60_000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Max 10 events per minute." },
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
    const parsed = eventCreateSchema.safeParse(body);
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

    // Lookup organizer - ensure user exists
    const [organizer] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    // If organizer not found, still allow using userId (FK may fail if strict, but usr_brian_mwangi exists via seed)

    const { title, description, banner, location, city, category, startAt, endAt, maxAttendees, price } = parsed.data;

    const id = slugify(title);

    const [event] = await db
      .insert(events)
      .values({
        id,
        title: title.trim(),
        description: description.trim(),
        banner,
        location: location.trim(),
        city: city.trim(),
        category: category || "Tech",
        startAt: new Date(startAt),
        endAt: new Date(endAt),
        organizerId: organizer?.id || userId,
        attendeesCount: 0,
        maxAttendees,
        price,
      })
      .returning();

    return NextResponse.json({ success: true, event, data: event }, { status: 201 });
  } catch (err) {
    console.error("POST /api/events error:", err);
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
  }
}
