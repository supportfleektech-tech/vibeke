import { NextResponse } from "next/server";
import { db } from "@/db";
import { communities, wikiPages, users } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";
import { rateLimit, getClientIp } from "@/lib/ratelimit";
import { getCurrentUserId } from "@/lib/get-user";

export const dynamic = "force-dynamic";

const wikiUpdateSchema = z
  .object({
    title: z.string().min(3, "title must be 3-100 chars").max(100).trim().optional(),
    content: z.string().min(10, "content must be 10-5000 chars").max(5000).trim().optional(),
  })
  .refine((d) => d.title !== undefined || d.content !== undefined, {
    message: "At least one of title or content must be provided",
  });

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string; pageSlug: string }> }
) {
  try {
    const { slug, pageSlug } = await params;

    const [community] = await db.select().from(communities).where(eq(communities.slug, slug)).limit(1);
    if (!community) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }

    const [page] = await db
      .select()
      .from(wikiPages)
      .where(and(eq(wikiPages.communityId, community.id), eq(wikiPages.slug, pageSlug)))
      .limit(1);

    if (!page) {
      return NextResponse.json({ error: "Wiki page not found" }, { status: 404 });
    }

    return NextResponse.json({ page });
  } catch (err) {
    console.error("GET /api/communities/[slug]/wiki/[pageSlug] error:", err);
    return NextResponse.json({ error: "Failed to fetch wiki page" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string; pageSlug: string }> }
) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(`wiki:update:${ip}`, 10, 60_000);
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

    const { slug, pageSlug } = await params;

    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = wikiUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const [community] = await db.select().from(communities).where(eq(communities.slug, slug)).limit(1);
    if (!community) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }

    const [page] = await db
      .select()
      .from(wikiPages)
      .where(and(eq(wikiPages.communityId, community.id), eq(wikiPages.slug, pageSlug)))
      .limit(1);

    if (!page) {
      return NextResponse.json({ error: "Wiki page not found" }, { status: 404 });
    }

    // Auth check: author or admin
    if (page.authorId !== userId) {
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      const role = (user as any)?.role;
      if (role !== "admin") {
        return NextResponse.json({ error: "Forbidden: only author or admin can update" }, { status: 403 });
      }
    }

    const updateData: Record<string, any> = {
      version: sql`${wikiPages.version} + 1`,
      updatedAt: new Date(),
    };
    if (parsed.data.title !== undefined) updateData.title = parsed.data.title.trim();
    if (parsed.data.content !== undefined) updateData.content = parsed.data.content.trim();

    const [updated] = await db
      .update(wikiPages)
      .set(updateData)
      .where(eq(wikiPages.id, page.id))
      .returning();

    return NextResponse.json({ page: updated });
  } catch (err) {
    console.error("PUT /api/communities/[slug]/wiki/[pageSlug] error:", err);
    return NextResponse.json({ error: "Failed to update wiki page" }, { status: 500 });
  }
}
