import { NextResponse } from "next/server";
import { db } from "@/db";
import { communities, wikiPages } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { rateLimit, getClientIp } from "@/lib/ratelimit";
import { getCurrentUserId } from "@/lib/get-user";

export const dynamic = "force-dynamic";

const wikiCreateSchema = z.object({
  slug: z
    .string()
    .min(3, "slug must be 3-50 chars")
    .max(50, "slug must be 3-50 chars")
    .regex(/^[a-z0-9-]+$/, "slug must match ^[a-z0-9-]+$"),
  title: z.string().min(3, "title must be 3-100 chars").max(100, "title must be 3-100 chars").trim(),
  content: z.string().min(10, "content must be 10-5000 chars").max(5000, "content must be 10-5000 chars").trim(),
});

const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

function generateId(): string {
  const g = globalThis as any;
  if (g.crypto && typeof g.crypto.randomUUID === "function") return g.crypto.randomUUID();
  return `wiki_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const { searchParams } = new URL(request.url);
    const parsedPagination = paginationSchema.safeParse({
      limit: searchParams.get("limit") ?? undefined,
      offset: searchParams.get("offset") ?? undefined,
    });
    if (!parsedPagination.success) {
      return NextResponse.json(
        { error: "Invalid pagination params", details: parsedPagination.error.flatten() },
        { status: 400 }
      );
    }
    const { limit, offset } = parsedPagination.data;

    const [community] = await db.select().from(communities).where(eq(communities.slug, slug)).limit(1);
    if (!community) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }

    const pages = await db
      .select()
      .from(wikiPages)
      .where(eq(wikiPages.communityId, community.id))
      .orderBy(desc(wikiPages.updatedAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({ pages });
  } catch (err) {
    console.error("GET /api/communities/[slug]/wiki error:", err);
    return NextResponse.json({ error: "Failed to fetch wiki pages" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const ip = getClientIp(request);
    const rl = rateLimit(`wiki:create:${ip}`, 10, 60_000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Max 10 requests per minute." },
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

    const { slug: communitySlug } = await params;

    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = wikiCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { slug: pageSlug, title, content } = parsed.data;

    const [community] = await db.select().from(communities).where(eq(communities.slug, communitySlug)).limit(1);
    if (!community) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }

    const [existing] = await db
      .select()
      .from(wikiPages)
      .where(and(eq(wikiPages.communityId, community.id), eq(wikiPages.slug, pageSlug)))
      .limit(1);
    if (existing) {
      return NextResponse.json({ error: "Wiki page slug already exists for this community" }, { status: 409 });
    }

    const id = generateId();

    try {
      const [page] = await db
        .insert(wikiPages)
        .values({
          id,
          communityId: community.id,
          slug: pageSlug,
          title: title.trim(),
          content: content.trim(),
          version: 1,
          authorId: userId,
        })
        .returning();

      return NextResponse.json({ page }, { status: 201 });
    } catch (insertErr: any) {
      const msg = String(insertErr?.message || "");
      const code = insertErr?.code;
      if (code === "23505" || /unique|duplicate|wiki_community_slug_unique/i.test(msg)) {
        return NextResponse.json(
          { error: "Wiki page slug already exists for this community" },
          { status: 409 }
        );
      }
      throw insertErr;
    }
  } catch (err) {
    console.error("POST /api/communities/[slug]/wiki error:", err);
    return NextResponse.json({ error: "Failed to create wiki page" }, { status: 500 });
  }
}
