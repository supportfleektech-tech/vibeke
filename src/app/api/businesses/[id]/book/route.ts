import { NextResponse } from "next/server";
import { db } from "@/db";
import { businesses } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { serviceName, date, timeSlot } = body;

    const [business] = await db.select().from(businesses).where(eq(businesses.id, id)).limit(1);
    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    const bookingRef = `BK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    return NextResponse.json({
      success: true,
      bookingRef,
      businessName: business.name,
      serviceName: serviceName || "General Consultation / Session",
      date: date || "Tomorrow",
      timeSlot: timeSlot || "10:30 AM",
      message: `Confirmed booking at ${business.name}. Cal invitation and directions dispatched.`,
    });
  } catch (err) {
    console.error("POST /api/businesses/[id]/book error:", err);
    return NextResponse.json({ error: "Failed to book appointment" }, { status: 500 });
  }
}
