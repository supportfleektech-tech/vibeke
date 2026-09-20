import { NextResponse } from "next/server";
import { db } from "@/db";
import { localRadar } from "@/db/schema";
import { seedDatabase } from "@/db/seed";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const city = searchParams.get("city");

    let allRadar = await db.select().from(localRadar);

    if (allRadar.length === 0) {
      await seedDatabase();
      allRadar = await db.select().from(localRadar);
    }

    let filtered = allRadar;
    if (type && type !== "all") {
      filtered = filtered.filter((r) => r.type.toLowerCase() === type.toLowerCase());
    }
    if (city && city !== "all") {
      filtered = filtered.filter((r) => r.city.toLowerCase() === city.toLowerCase());
    }

    return NextResponse.json({ radar: filtered });
  } catch (err) {
    console.error("GET /api/radar error:", err);
    return NextResponse.json({ error: "Failed to fetch local radar" }, { status: 500 });
  }
}
