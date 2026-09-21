import { NextResponse } from "next/server";
import { seedDatabase } from "@/db/seed";
import { db } from "@/db";
import { users } from "@/db/schema";
import { rateLimit, getClientIp } from "@/lib/ratelimit";
import { z } from "zod";

export const dynamic = "force-dynamic";

function checkSeedSecret(request: Request): NextResponse | null {
  const seedSecret = process.env.SEED_SECRET;
  if (seedSecret) {
    const provided = request.headers.get("x-seed-secret");
    if (!provided || provided !== seedSecret) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: invalid or missing x-seed-secret" },
        { status: 401 }
      );
    }
  }
  return null;
}

async function handleSeed(request: Request, isDeprecatedGet = false) {
  const ip = getClientIp(request);
  const rl = rateLimit(`seed:${ip}`, 3, 60_000);
  if (!rl.success) {
    return NextResponse.json(
      { success: false, error: "Rate limit exceeded. Try again soon." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil((rl.reset - Date.now()) / 1000)) },
      }
    );
  }

  if (isDeprecatedGet) {
    console.warn("[DEPRECATED] GET /api/seed is deprecated. Use POST /api/seed with x-seed-secret header.");
  } else {
    const authError = checkSeedSecret(request);
    if (authError) return authError;
  }

  // db transaction check - only seed if not already seeded (idempotent, avoids thundering herd)
  const existing = await db.select().from(users).limit(1);
  if (existing.length === 0) {
    await seedDatabase();
  } else {
    console.log("Database already seeded, skipping seed operation.");
  }

  if (isDeprecatedGet) {
    return NextResponse.json({
      success: true,
      message: "Kinara database seeded successfully. (GET deprecated - use POST with x-seed-secret)",
      deprecated: true,
    });
  }

  return NextResponse.json({ success: true, message: "Kinara database seeded successfully." });
}

export async function GET(request: Request) {
  try {
    return await handleSeed(request, true);
  } catch (error) {
    console.error("Seed GET error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    return await handleSeed(request, false);
  } catch (error) {
    console.error("Seed POST error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
