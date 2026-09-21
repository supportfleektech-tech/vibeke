import { NextResponse } from "next/server";
import { db, pool, checkDbHealth } from "@/db";
import { users } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const latencyMs = await checkDbHealth();

    // Check if database has been seeded (transaction-safe check, no thundering herd)
    let seeded = false;
    try {
      const existing = await db.select().from(users).limit(1);
      seeded = existing.length > 0;
    } catch {
      seeded = false;
    }

    const poolInfo = {
      totalCount: (pool as any).totalCount ?? 0,
      idleCount: (pool as any).idleCount ?? 0,
      waitingCount: (pool as any).waitingCount ?? 0,
      max: 10,
    };

    return NextResponse.json({
      ok: true,
      version: "3.4.0",
      latencyMs,
      seeded,
      pool: poolInfo,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("GET /api/health error:", err);
    return NextResponse.json(
      {
        ok: false,
        version: "3.4.0",
        latencyMs: null,
        seeded: false,
        pool: { totalCount: 0, idleCount: 0, waitingCount: 0, max: 10 },
        timestamp: new Date().toISOString(),
        error: String(err),
      },
      { status: 500 }
    );
  }
}
