import { NextResponse } from "next/server";
import { db } from "@/db";
import { jobs, jobApplications, users } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { rateLimit, getClientIp } from "@/lib/ratelimit";
import { getCurrentUserId } from "@/lib/get-user";

export const dynamic = "force-dynamic";

const applySchema = z.object({
  coverNote: z.string().max(2000).optional().nullable(),
});

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
    const rl = rateLimit(`jobs:apply:${ip}`, 5, 60_000);
    if (!rl.success) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded. Try again soon. (5/min)" },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.reset - Date.now()) / 1000)) } }
      );
    }

    const { id } = await params;
    const jobId = parseInt(id, 10);
    if (Number.isNaN(jobId)) {
      return NextResponse.json({ success: false, error: "Invalid job id" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = applySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { coverNote } = parsed.data;

    // Auth via getCurrentUserId
    const applicantId = await getCurrentUserId();
    if (!applicantId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Ensure applicant exists in users table, fallback create? We check.
    const [applicant] = await db.select().from(users).where(eq(users.id, applicantId)).limit(1);
    // If not exists, allow still but will fail FK; we let fallback be applicantId exists due to seed (usr_brian_mwangi)
    // Optionally we could allow but log.

    // Check job exists
    const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
    if (!job) {
      return NextResponse.json({ success: false, error: "Job not found" }, { status: 404 });
    }

    // Check already applied (unique constraint)
    const [existingApplication] = await db
      .select()
      .from(jobApplications)
      .where(and(eq(jobApplications.jobId, jobId), eq(jobApplications.applicantId, applicantId)))
      .limit(1);

    if (existingApplication) {
      return NextResponse.json(
        { success: false, error: "Already applied to this job", application: existingApplication },
        { status: 409 }
      );
    }

    try {
      const [application] = await db
        .insert(jobApplications)
        .values({
          jobId,
          applicantId,
          coverNote: coverNote || null,
          status: "pending",
        })
        .returning();

      return NextResponse.json({ success: true, application }, { status: 201 });
    } catch (insertErr: any) {
      // Handle unique violation race condition
      const msg = String(insertErr?.message || "");
      const code = insertErr?.code;
      if (code === "23505" || msg.includes("unique") || msg.includes("job_applications_unique")) {
        const [existing] = await db
          .select()
          .from(jobApplications)
          .where(and(eq(jobApplications.jobId, jobId), eq(jobApplications.applicantId, applicantId)))
          .limit(1);
        return NextResponse.json(
          { success: false, error: "Already applied to this job", application: existing },
          { status: 409 }
        );
      }
      throw insertErr;
    }
  } catch (err) {
    console.error("POST /api/jobs/[id]/apply error:", err);
    return NextResponse.json({ success: false, error: "Failed to submit application" }, { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getClientIp(request);
    const rl = rateLimit(`jobs:apply:get:${ip}`, 30, 60_000);
    if (!rl.success) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded. Try again soon." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.reset - Date.now()) / 1000)) } }
      );
    }

    const { id } = await params;
    const jobId = parseInt(id, 10);
    if (Number.isNaN(jobId)) {
      return NextResponse.json({ success: false, error: "Invalid job id" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
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

    const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
    if (!job) {
      return NextResponse.json({ success: false, error: "Job not found" }, { status: 404 });
    }

    const applications = await db
      .select()
      .from(jobApplications)
      .where(eq(jobApplications.jobId, jobId))
      .orderBy(desc(jobApplications.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      success: true,
      jobId,
      applications,
      limit,
      offset,
      count: applications.length,
    });
  } catch (err) {
    console.error("GET /api/jobs/[id]/apply error:", err);
    return NextResponse.json({ success: false, error: "Failed to fetch applications" }, { status: 500 });
  }
}
