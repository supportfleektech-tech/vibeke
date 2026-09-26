import { NextResponse } from "next/server";
import { db } from "@/db";
import { businesses, bookings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { bookingSchema } from "@/lib/validators";
import { rateLimit, getClientIp } from "@/lib/ratelimit";
import { getCurrentUserId } from "@/lib/get-user";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(`businesses:book:${ip}`, 10, 60_000);
    if (!rl.success) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded. Try again soon." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.reset - Date.now()) / 1000)) } }
      );
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const parsed = bookingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { serviceName, date, timeSlot, notes } = parsed.data;

    const [business] = await db.select().from(businesses).where(eq(businesses.id, id)).limit(1);
    if (!business) {
      return NextResponse.json({ success: false, error: "Business not found" }, { status: 404 });
    }

    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const bookingRef = `BK-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const bookingId = crypto.randomUUID();

    const [booking] = await db
      .insert(bookings)
      .values({
        id: bookingId,
        businessId: business.id,
        userId,
        serviceName,
        date,
        timeSlot,
        notes: notes || null,
        status: "confirmed",
        bookingRef,
      })
      .returning();

    return NextResponse.json(
      {
        success: true,
        data: { bookingRef, booking },
        bookingRef,
        booking,
        businessName: business.name,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/businesses/[id]/book error:", err);
    return NextResponse.json({ success: false, error: "Failed to book appointment" }, { status: 500 });
  }
}
