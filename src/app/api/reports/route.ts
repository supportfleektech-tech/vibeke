import { NextResponse } from "next/server";
import { db } from "@/db";
import { reports } from "@/db/schema";
import { desc, eq, and } from "drizzle-orm";
import { z } from "zod";
import { rateLimit, getClientIp } from "@/lib/ratelimit";
import { getCurrentUserId } from "@/lib/get-user";
import { requireAdmin } from "@/lib/require-admin";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const reportCreateSchema = z.object({
  entityType: z.enum(["post", "clip", "user", "community", "comment"]),
  entityId: z.string().min(1, "entityId required").max(100, "entityId max 100 chars").trim(),
  reason: z.enum(["spam", "abuse", "fraud", "other"]),
  details: z.string().max(500, "details max 500 chars").optional().default(""),
});

const reportStatusEnum = z.enum(["pending", "reviewed", "actioned", "dismissed"]);

const querySchema = z.object({
  status: reportStatusEnum.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

// POST /api/reports - create report
export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(`reports:create:${ip}`, 10, 60_000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Max 10 reports per minute." },
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
    const parsed = reportCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { entityType, entityId, reason, details } = parsed.data;

    const [report] = await db
      .insert(reports)
      .values({
        reporterId: userId,
        entityType,
        entityId,
        reason,
        details: details || "",
        status: "pending",
      })
      .returning();

    logger.info({ reportId: report.id, entityType, entityId, reason }, "Report created");

    return NextResponse.json({ report, success: true }, { status: 201 });
  } catch (err) {
    console.error("POST /api/reports error:", err);
    return NextResponse.json({ error: "Failed to create report" }, { status: 500 });
  }
}

// GET /api/reports?status=pending|reviewed|actioned|dismissed&limit&offset
export async function GET(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(`reports:list:${ip}`, 30, 60_000);
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

    const { searchParams } = new URL(request.url);
    const statusRaw = searchParams.get("status");
    const limitRaw = searchParams.get("limit");
    const offsetRaw = searchParams.get("offset");

    // Validate status if provided and not "all"
    let status: z.infer<typeof reportStatusEnum> | undefined;
    if (statusRaw && statusRaw !== "all" && statusRaw !== "") {
      const sParsed = reportStatusEnum.safeParse(statusRaw);
      if (!sParsed.success) {
        return NextResponse.json(
          { error: "Invalid status - must be pending|reviewed|actioned|dismissed", details: sParsed.error.flatten() },
          { status: 400 }
        );
      }
      status = sParsed.data;
    }

    const paginationParsed = querySchema.safeParse({
      status: status || undefined,
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
    const validatedStatus = status;

    // Moderation queue: admin/moderator only.
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const conditions: any[] = [];
    if (validatedStatus) conditions.push(eq(reports.status, validatedStatus));

    const whereClause = conditions.length === 0 ? undefined : conditions.length === 1 ? conditions[0] : and(...conditions);

    let result: (typeof reports.$inferSelect)[];
    if (whereClause) {
      result = await db.select().from(reports).where(whereClause).orderBy(desc(reports.createdAt)).limit(limit).offset(offset);
    } else {
      result = await db.select().from(reports).orderBy(desc(reports.createdAt)).limit(limit).offset(offset);
    }

    return NextResponse.json({
      reports: result,
      count: result.length,
      limit,
      offset,
      status: validatedStatus || "all",
    });
  } catch (err) {
    console.error("GET /api/reports error:", err);
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
  }
}
