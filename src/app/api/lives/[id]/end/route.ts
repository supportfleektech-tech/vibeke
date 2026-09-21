import { NextResponse } from "next/server";
import { db } from "@/db";
import { lives } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { rateLimit, getClientIp } = await import("@/lib/ratelimit");
    const { getCurrentUserId } = await import("@/lib/get-user");

    const ip = getClientIp(request);
    const rl = rateLimit(`lives:end:${ip}`, 5, 60_000);
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

    if (live.hostId !== userId) {
      return NextResponse.json({ error: "Forbidden - only host can end live" }, { status: 403 });
    }

    if (live.status === "ended") {
      return NextResponse.json({ live, success: true, message: "Live already ended" });
    }

    const [updated] = await db
      .update(lives)
      .set({ status: "ended", endedAt: new Date() })
      .where(eq(lives.id, id))
      .returning();

    return NextResponse.json({ live: updated || { ...live, status: "ended", endedAt: new Date() }, success: true });
  } catch (err) {
    console.error("POST /api/lives/[id]/end error:", err);
    return NextResponse.json({ error: "Failed to end live" }, { status: 500 });
  }
}
