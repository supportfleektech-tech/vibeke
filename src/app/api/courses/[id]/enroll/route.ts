import { NextResponse } from "next/server";
import { db } from "@/db";
import { courses, enrollments } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { z } from "zod";
import { rateLimit, getClientIp } from "@/lib/ratelimit";
import { getCurrentUserId } from "@/lib/get-user";

export const dynamic = "force-dynamic";

const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getClientIp(request);
    const rl = rateLimit(`courses:enroll:${ip}`, 10, 60_000);
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

    const { id: courseId } = await params;
    if (!courseId) {
      return NextResponse.json({ error: "Course id required" }, { status: 400 });
    }

    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [course] = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const [existing] = await db
      .select()
      .from(enrollments)
      .where(and(eq(enrollments.courseId, courseId), eq(enrollments.userId, userId)))
      .limit(1);
    if (existing) {
      return NextResponse.json({ error: "Already enrolled", enrollment: existing }, { status: 409 });
    }

    try {
      const [enrollment] = await db
        .insert(enrollments)
        .values({
          courseId,
          userId,
          progress: 0,
        })
        .returning();

      await db
        .update(courses)
        .set({ enrolledCount: sql`${courses.enrolledCount} + 1` })
        .where(eq(courses.id, courseId));

      return NextResponse.json({ enrollment }, { status: 201 });
    } catch (insertErr: any) {
      const msg = String(insertErr?.message || "");
      const code = insertErr?.code;
      if (code === "23505" || /unique|duplicate|enrollments_unique/i.test(msg)) {
        const [existingAfter] = await db
          .select()
          .from(enrollments)
          .where(and(eq(enrollments.courseId, courseId), eq(enrollments.userId, userId)))
          .limit(1);
        return NextResponse.json(
          { error: "Already enrolled", enrollment: existingAfter },
          { status: 409 }
        );
      }
      throw insertErr;
    }
  } catch (err) {
    console.error("POST /api/courses/[id]/enroll error:", err);
    return NextResponse.json({ error: "Failed to enroll" }, { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;
    if (!courseId) {
      return NextResponse.json({ error: "Course id required" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const parsedPagination = paginationSchema.safeParse({
      limit: searchParams.get("limit") || undefined,
      offset: searchParams.get("offset") || undefined,
    });
    if (!parsedPagination.success) {
      return NextResponse.json(
        { error: "Invalid pagination params", details: parsedPagination.error.flatten() },
        { status: 400 }
      );
    }
    const { limit, offset } = parsedPagination.data;

    const userIdFilter = searchParams.get("userId") || searchParams.get("user_id");

    // Verify course exists
    const [course] = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    let result: (typeof enrollments.$inferSelect)[];
    if (userIdFilter) {
      result = await db
        .select()
        .from(enrollments)
        .where(and(eq(enrollments.courseId, courseId), eq(enrollments.userId, userIdFilter)))
        .orderBy(desc(enrollments.createdAt))
        .limit(limit)
        .offset(offset);
    } else {
      result = await db
        .select()
        .from(enrollments)
        .where(eq(enrollments.courseId, courseId))
        .orderBy(desc(enrollments.createdAt))
        .limit(limit)
        .offset(offset);
    }

    return NextResponse.json({ enrollments: result, count: result.length, limit, offset });
  } catch (err) {
    console.error("GET /api/courses/[id]/enroll error:", err);
    return NextResponse.json({ error: "Failed to fetch enrollments" }, { status: 500 });
  }
}
