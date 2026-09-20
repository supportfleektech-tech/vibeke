import { NextResponse } from "next/server";
import { db } from "@/db";
import { businesses } from "@/db/schema";
import { seedDatabase } from "@/db/seed";

export async function GET() {
  try {
    let allBusinesses = await db.select().from(businesses);

    if (allBusinesses.length === 0) {
      await seedDatabase();
      allBusinesses = await db.select().from(businesses);
    }

    return NextResponse.json({ businesses: allBusinesses });
  } catch (err) {
    console.error("GET /api/businesses error:", err);
    return NextResponse.json({ error: "Failed to fetch businesses" }, { status: 500 });
  }
}
