import { NextResponse } from "next/server";
import { db } from "@/db";
import { reports, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { rateLimit, getClientIp } from "@/lib/ratelimit";
import { getCurrentUserId } from "@/lib/get-user";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const reportStatusEnum = z.enum(["pending", "reviewed", "actioned", "dismissed"]);

const patchSchema = z.object({
  status: reportStatusEnum,
});

// GET /api/reports/[id] - fetch single report
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getClientIp(request);
    const rl = rateLimit(`reports:get:${ip}`, 30, 60_000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Max 30 requests per minute." },
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

    const { id } = await params;
    const reportId = parseInt(id, 10);
    if (isNaN(reportId)) {
      return NextResponse.json({ error: "Invalid report id" }, { status: 400 });
    }

    const [report] = await db.select().from(reports).where(eq(reports.id, reportId)).limit(1);
    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    return NextResponse.json({ report, success: true });
  } catch (err) {
    console.error("GET /api/reports/[id] error:", err);
    return NextResponse.json({ error: "Failed to fetch report" }, { status: 500 });
  }
}

// PATCH /api/reports/[id] - update report status (admin)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getClientIp(request);
    const rl = rateLimit(`reports:update:${ip}`, 10, 60_000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Max 10 updates per minute." },
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

    // Admin check via role - for demo allow but log if not admin
    const [currentUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (currentUser && currentUser.role !== "admin") {
      logger.info({ userId, role: currentUser.role }, "Non-admin attempting report status update (allowed for demo)");
      // In production, uncomment to enforce:
      // return NextResponse.json({ error: "Forbidden - admin only" }, { status: 403 });
    }

    const { id } = await params;
    const reportId = parseInt(id, 10);
    if (isNaN(reportId)) {
      return NextResponse.json({ error: "Invalid report id" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { status } = parsed.data;

    const [existing] = await db.select().from(reports).where(eq(reports.id, reportId)).limit(1);
    if (!existing) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const [updated] = await db
      .update(reports)
      .set({ status })
      .where(eq(reports.id, reportId))
      .returning();

    logger.info({ reportId, status, updatedBy: userId }, "Report status updated");

    return NextResponse.json({ report: updated, success: true });
  } catch (err) {
    console.error("PATCH /api/reports/[id] error:", err);
    return NextResponse.json({ error: "Failed to update report" }, { status: 500 });
  }
}
