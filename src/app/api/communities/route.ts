import { NextResponse } from "next/server";
import { db } from "@/db";
import { communities } from "@/db/schema";
import { seedDatabase } from "@/db/seed";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const search = searchParams.get("q");

    let allCommunities = await db.select().from(communities);

    if (allCommunities.length === 0) {
      await seedDatabase();
      allCommunities = await db.select().from(communities);
    }

    let filtered = allCommunities;
    if (category && category !== "all") {
      filtered = filtered.filter((c) => c.category.toLowerCase().includes(category.toLowerCase()));
    }
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (c) => c.name.toLowerCase().includes(q) || c.tagline.toLowerCase().includes(q) || c.city.toLowerCase().includes(q)
      );
    }

    return NextResponse.json({ communities: filtered });
  } catch (err) {
    console.error("GET /api/communities error:", err);
    return NextResponse.json({ error: "Failed to fetch communities" }, { status: 500 });
  }
}
