import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, posts, clips, reports, escrowTransactions, lives, events } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { rateLimit, getClientIp } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

// GET /api/admin/stats - admin dashboard stats
export async function GET(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = rateLimit(`admin:stats:${ip}`, 30, 60_000);
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

    // No auth for demo, but ideally check admin role
    // const userId = await getCurrentUserId();
    // const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    // if (user?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Count queries via db.select - use sql count for efficiency, fallback to array length
    // Using drizzle count via sql
    const [
      usersCountResult,
      postsCountResult,
      clipsCountResult,
      reportsPendingResult,
      escrowHeldResult,
      livesActiveResult,
      eventsCountResult,
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(users),
      db.select({ count: sql<number>`count(*)` }).from(posts),
      db.select({ count: sql<number>`count(*)` }).from(clips),
      db.select({ count: sql<number>`count(*)` }).from(reports).where(eq(reports.status, "pending")),
      db.select({ count: sql<number>`count(*)` }).from(escrowTransactions).where(eq(escrowTransactions.status, "held")),
      db.select({ count: sql<number>`count(*)` }).from(lives).where(eq(lives.status, "live")),
      db.select({ count: sql<number>`count(*)` }).from(events),
    ]);

    const stats = {
      usersCount: Number(usersCountResult[0]?.count ?? 0),
      postsCount: Number(postsCountResult[0]?.count ?? 0),
      clipsCount: Number(clipsCountResult[0]?.count ?? 0),
      reportsPending: Number(reportsPendingResult[0]?.count ?? 0),
      escrowHeld: Number(escrowHeldResult[0]?.count ?? 0),
      livesActive: Number(livesActiveResult[0]?.count ?? 0),
      eventsCount: Number(eventsCountResult[0]?.count ?? 0),
    };

    return NextResponse.json({ stats, success: true });
  } catch (err) {
    console.error("GET /api/admin/stats error:", err);
    return NextResponse.json({ error: "Failed to fetch admin stats" }, { status: 500 });
  }
}
