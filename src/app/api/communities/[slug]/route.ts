import { NextResponse } from "next/server";
import { db } from "@/db";
import { communities, communityMembers } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { rateLimit, getClientIp } from "@/lib/ratelimit";
import { getCurrentUserId } from "@/lib/get-user";
import { z } from "zod";

export const dynamic = "force-dynamic";

const actionSchema = z.enum(["join", "leave"]);
const slugSchema = z
  .string()
  .min(1, "slug required")
  .max(100, "slug too long")
  .regex(/^[a-z0-9-]+$/, "slug must be lowercase alphanumeric with hyphens");

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const parsedSlug = slugSchema.safeParse(slug);
    if (!parsedSlug.success) {
      return NextResponse.json({ error: "Invalid community slug" }, { status: 400 });
    }

    const community = await db.select().from(communities).where(eq(communities.slug, slug)).limit(1);

    if (community.length === 0) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }

    return NextResponse.json({ community: community[0] });
  } catch (err) {
    console.error("GET /api/communities/[slug] error:", err);
    return NextResponse.json({ error: "Failed to fetch community" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Validate slug
    const slugParsed = slugSchema.safeParse(slug);
    if (!slugParsed.success) {
      return NextResponse.json({ error: "Invalid community slug", details: slugParsed.error.flatten() }, { status: 400 });
    }

    // Rate limit: 20/min per IP
    const ip = getClientIp(request);
    const rl = await rateLimit(`communities:join:${ip}`, 20, 60_000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Max 20 join/leave per minute." },
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

    // Auth
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const actionRaw = body?.action ?? "join";
    const actionParsed = actionSchema.safeParse(actionRaw);
    if (!actionParsed.success) {
      return NextResponse.json({ error: 'Invalid action - must be "join" or "leave"', details: actionParsed.error.flatten() }, { status: 400 });
    }
    const action = actionParsed.data;

    // Check community exists
    const [community] = await db.select().from(communities).where(eq(communities.slug, slug)).limit(1);
    if (!community) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }

    // Check existing membership
    const existing = await db
      .select()
      .from(communityMembers)
      .where(and(eq(communityMembers.communityId, community.id), eq(communityMembers.userId, userId)))
      .limit(1);
    const isMember = existing.length > 0;

    // Transactional join/leave
    if (action === "join") {
      if (isMember) {
        // Idempotent: already joined
        return NextResponse.json({
          joined: true,
          membersCount: community.membersCount,
          success: true,
          message: "Already a member",
        });
      }

      const result = await db.transaction(async (tx) => {
        try {
          await tx.insert(communityMembers).values({
            communityId: community.id,
            userId,
            role: "member",
          });
        } catch (e: any) {
          const isUnique =
            e?.code === "23505" ||
            e?.cause?.code === "23505" ||
            /unique|duplicate|community_members_unique/i.test(e?.message || "");
          if (isUnique) {
            // Race: already inserted by concurrent request
            const [current] = await tx.select().from(communities).where(eq(communities.id, community.id)).limit(1);
            return { joined: true, membersCount: current?.membersCount ?? community.membersCount };
          }
          throw e;
        }

        const [updated] = await tx
          .update(communities)
          .set({
            membersCount: sql`${communities.membersCount} + 1`,
          })
          .where(eq(communities.id, community.id))
          .returning();

        return { joined: true, membersCount: updated?.membersCount ?? community.membersCount + 1 };
      });

      return NextResponse.json({
        joined: result.joined,
        membersCount: result.membersCount,
        success: true,
      });
    } else {
      // leave
      if (!isMember) {
        return NextResponse.json({
          joined: false,
          membersCount: community.membersCount,
          success: true,
          message: "Not a member",
        });
      }

      const result = await db.transaction(async (tx) => {
        await tx
          .delete(communityMembers)
          .where(and(eq(communityMembers.communityId, community.id), eq(communityMembers.userId, userId)));

        const [updated] = await tx
          .update(communities)
          .set({
            membersCount: sql`GREATEST(${communities.membersCount} - 1, 0)`,
          })
          .where(eq(communities.id, community.id))
          .returning();

        return { joined: false, membersCount: updated?.membersCount ?? Math.max(community.membersCount - 1, 0) };
      });

      return NextResponse.json({
        joined: result.joined,
        membersCount: result.membersCount,
        success: true,
      });
    }
  } catch (err: any) {
    if (err?.code === "23505" || /unique|duplicate/i.test(err?.message || "")) {
      console.warn("Community membership race unique violation:", err?.message);
      return NextResponse.json({ error: "Concurrent membership update, please retry" }, { status: 409 });
    }
    console.error("POST /api/communities/[slug] error:", err);
    return NextResponse.json({ error: "Failed to update membership" }, { status: 500 });
  }
}
