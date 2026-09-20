import { NextResponse } from "next/server";
import { db } from "@/db";
import { jobs } from "@/db/schema";
import { desc } from "drizzle-orm";
import { seedDatabase } from "@/db/seed";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    let allJobs = await db.select().from(jobs).orderBy(desc(jobs.id));

    if (allJobs.length === 0) {
      await seedDatabase();
      allJobs = await db.select().from(jobs).orderBy(desc(jobs.id));
    }

    if (category && category !== "all") {
      allJobs = allJobs.filter((j) => j.category.toLowerCase().includes(category.toLowerCase()));
    }

    return NextResponse.json({ jobs: allJobs });
  } catch (err) {
    console.error("GET /api/jobs error:", err);
    return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
  }
}
