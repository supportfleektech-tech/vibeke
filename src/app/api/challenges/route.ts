import { NextResponse } from "next/server";
import { db } from "@/db";
import { challenges, hashtags } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { z } from "zod";
import { rateLimit, getClientIp } from "@/lib/ratelimit";
import { getCurrentUserId } from "@/lib/get-user";

export const dynamic = "force-dynamic";

const challengeCreateSchema = z.object({
  tag: z.string().min(1, "tag required").max(50).trim(),
  title: z.string().min(3, "title must be 3-100 chars").max(100).trim(),
  banner: z.string().url("banner must be a valid URL"),
  description: z.string().min(10, "description must be 10-500 chars").max(500).trim(),
  prize: z.string().min(1, "prize required").max(200).trim().default("Featured on KINARA"),
  endsAt: z.string().min(1, "endsAt required").refine((v) => !isNaN(Date.parse(v)), { message: "endsAt must be ISO date" }),
});

const querySchema = z.object({
  tag: z.string().max(50).optional(),
  active: z
    .string()
    .optional()
    .transform((v) => {
      if (v === undefined) return undefined;
      if (v === "true" || v === "1") return true;
      if (v === "false" || v === "0") return false;
      return undefined;
    }),
});

function generateId(title: string): string {
  const base = title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "challenge";
  const rand = Math.random().toString(36).slice(2, 7);
  const g = globalThis as any;
  if (g.crypto && typeof g.crypto.randomUUID === "function") return g.crypto.randomUUID();
  return `${base}-${rand}-${Date.now().toString(36)}`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({
      tag: searchParams.get("tag") || undefined,
      active: searchParams.get("active") || undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query params", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { tag, active } = parsed.data;

    const conditions: any[] = [];
    if (tag) {
      conditions.push(eq(challenges.tag, tag));
    }
    if (active === true) {
      conditions.push(gt(challenges.endsAt, new Date()));
    }

    const whereClause = conditions.length === 0 ? undefined : conditions.length === 1 ? conditions[0] : and(...conditions);

    let result: (typeof challenges.$inferSelect)[];
    if (whereClause) {
      result = await db.select().from(challenges).where(whereClause);
    } else {
      result = await db.select().from(challenges);
    }

    return NextResponse.json({ challenges: result });
  } catch (err) {
    console.error("GET /api/challenges error:", err);
    return NextResponse.json({ error: "Failed to fetch challenges" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = rateLimit(`challenges:create:${ip}`, 5, 60_000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Max 5 requests per minute." },
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

    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = challengeCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { tag, title, banner, description, prize, endsAt } = parsed.data;

    // Check hashtag exists
    const normalizedTag = tag.replace(/^#/, "").trim();
    const [hashtag] = await db.select().from(hashtags).where(eq(hashtags.tag, normalizedTag)).limit(1);
    if (!hashtag) {
      return NextResponse.json({ error: "Hashtag not found" }, { status: 404 });
    }

    const id = generateId(title);

    const [challenge] = await db
      .insert(challenges)
      .values({
        id,
        tag: normalizedTag,
        title: title.trim(),
        banner,
        description: description.trim(),
        prize: prize?.trim() || "Featured on KINARA",
        endsAt: new Date(endsAt),
        participantsCount: 0,
      })
      .returning();

    return NextResponse.json({ challenge }, { status: 201 });
  } catch (err) {
    console.error("POST /api/challenges error:", err);
    return NextResponse.json({ error: "Failed to create challenge" }, { status: 500 });
  }
}
