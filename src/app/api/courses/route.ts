import { NextResponse } from "next/server";
import { db } from "@/db";
import { courses } from "@/db/schema";
import { eq, and, or, ilike, desc } from "drizzle-orm";
import { z } from "zod";
import { rateLimit, getClientIp } from "@/lib/ratelimit";
import { getCurrentUserId } from "@/lib/get-user";

export const dynamic = "force-dynamic";

const lessonSchema = z.object({
  title: z.string().min(1, "lesson title required").max(100).trim(),
  duration: z.string().min(1, "duration required").max(50).trim(),
  videoUrl: z.string().url("videoUrl must be a valid URL"),
});

const courseCreateSchema = z.object({
  title: z.string().min(3, "title must be 3-100 chars").max(100).trim(),
  description: z.string().min(10, "description must be 10-500 chars").max(500).trim(),
  banner: z.string().url("banner must be a valid URL"),
  category: z.string().min(1, "category required").max(50).trim(),
  price: z.coerce.number().min(0, "price must be >= 0"),
  lessons: z.array(lessonSchema).default([]),
});

const querySchema = z.object({
  category: z.string().max(50).optional(),
  q: z.string().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

function generateId(title: string): string {
  const base = title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "course";
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
      offset: searchParams.get("offset") || undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query params", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { category, q, limit, offset } = parsed.data;

    const conditions: any[] = [];
    if (category && category !== "all") {
      conditions.push(eq(courses.category, category));
    }
    if (q && q.trim().length > 0) {
      const term = `%${q.trim()}%`;
      conditions.push(or(ilike(courses.title, term), ilike(courses.description, term)) as any);
    }

    const whereClause = conditions.length === 0 ? undefined : conditions.length === 1 ? conditions[0] : and(...conditions);

    let result: (typeof courses.$inferSelect)[];
    if (whereClause) {
      result = await db.select().from(courses).where(whereClause).orderBy(desc(courses.createdAt)).limit(limit).offset(offset);
    } else {
      result = await db.select().from(courses).orderBy(desc(courses.createdAt)).limit(limit).offset(offset);
    }

    return NextResponse.json({ courses: result });
  } catch (err) {
    console.error("GET /api/courses error:", err);
    return NextResponse.json({ error: "Failed to fetch courses" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = rateLimit(`courses:create:${ip}`, 10, 60_000);
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
    const parsed = courseCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { title, description, banner, category, price, lessons } = parsed.data;
    const id = generateId(title);

    const [course] = await db
      .insert(courses)
      .values({
        id,
        title: title.trim(),
        description: description.trim(),
        banner,
        category: category.trim(),
        price: Math.round(price),
        lessons: lessons || [],
        instructorId: userId,
        enrolledCount: 0,
      })
      .returning();

    return NextResponse.json({ course }, { status: 201 });
  } catch (err) {
    console.error("POST /api/courses error:", err);
    return NextResponse.json({ error: "Failed to create course" }, { status: 500 });
  }
}
