import { NextResponse } from "next/server";
import { db } from "@/db";
import { lives } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { rateLimit, getClientIp } = await import("@/lib/ratelimit");
    const { getCurrentUserId } = await import("@/lib/get-user");

    const ip = getClientIp(request);
    const rl = rateLimit(`lives:join:${ip}`, 20, 60_000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again soon." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil((rl.reset - Date.now()) / 1000)) },
        }
      );
    }

    const { id } = await params;
    if (!id || id.trim().length === 0) {
      return NextResponse.json({ error: "Invalid live ID" }, { status: 400 });
    }

    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [live] = await db.select().from(lives).where(eq(lives.id, id)).limit(1);
    if (!live) {
      return NextResponse.json({ error: "Live not found" }, { status: 404 });
    }

    if (live.status !== "live") {
      return NextResponse.json({ error: "Live has ended" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    let updated: typeof live | undefined;

    if (action === "leave") {
      const [row] = await db
        .update(lives)
        .set({ viewersCount: sql`GREATEST(${lives.viewersCount} - 1, 0)` })
        .where(eq(lives.id, id))
        .returning();
      updated = row;
    } else {
      const [row] = await db
        .update(lives)
        .set({ viewersCount: sql`${lives.viewersCount} + 1` })
        .where(eq(lives.id, id))
        .returning();
      updated = row;
    }

    // Fallback if returning failed
    const viewersCount = updated?.viewersCount ?? (action === "leave" ? Math.max((live.viewersCount ?? 1) - 1, 0) : (live.viewersCount ?? 0) + 1);

    return NextResponse.json({ viewersCount, success: true, live: updated || { ...live, viewersCount } });
  } catch (err) {
    console.error("POST /api/lives/[id]/join error:", err);
    return NextResponse.json({ error: "Failed to join live" }, { status: 500 });
  }
}
