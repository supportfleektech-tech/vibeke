import { NextResponse } from "next/server";
import { db } from "@/db";
import { events } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { rateLimit, getClientIp } from "@/lib/ratelimit";
import { getCurrentUserId } from "@/lib/get-user";

export const dynamic = "force-dynamic";

const rsvpSchema = z.object({
  action: z.enum(["join", "leave"]),
});

// POST /api/events/[id]/rsvp - {action: "join"|"leave"}
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(`events:rsvp:${ip}`, 20, 60_000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Max 20 RSVPs per minute." },
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
    if (!id || id.trim().length === 0) {
      return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = rsvpSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { action } = parsed.data;

    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [event] = await db.select().from(events).where(eq(events.id, id)).limit(1);
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    let updatedAttendeesCount: number;
    let joined: boolean;

    if (action === "join") {
      if (event.attendeesCount >= event.maxAttendees) {
        return NextResponse.json({ error: "Event is full", attendeesCount: event.attendeesCount, maxAttendees: event.maxAttendees }, { status: 400 });
      }
      const [updated] = await db
        .update(events)
        .set({ attendeesCount: sql`${events.attendeesCount} + 1` })
        .where(eq(events.id, id))
        .returning();
      updatedAttendeesCount = updated?.attendeesCount ?? event.attendeesCount + 1;
      joined = true;
    } else {
      // leave
      const [updated] = await db
        .update(events)
        .set({ attendeesCount: sql`GREATEST(${events.attendeesCount} - 1, 0)` })
        .where(eq(events.id, id))
        .returning();
      updatedAttendeesCount = updated?.attendeesCount ?? Math.max(event.attendeesCount - 1, 0);
      joined = false;
    }

    return NextResponse.json({
      success: true,
      attendeesCount: updatedAttendeesCount,
      joined,
      eventId: id,
    });
  } catch (err) {
    console.error("POST /api/events/[id]/rsvp error:", err);
    return NextResponse.json({ error: "Failed to update RSVP" }, { status: 500 });
  }
}
