import { NextResponse } from "next/server";
import { db } from "@/db";
import { posts, users } from "@/db/schema";
import { desc, eq, and, sql } from "drizzle-orm";
import { seedDatabase } from "@/db/seed";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const city = searchParams.get("city");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");
    const cursor = searchParams.get("cursor");

    // Build WHERE with SQL filtering (indexed)
    const conditions: any[] = [];
    if (category && category !== "all") conditions.push(eq(posts.category, category));
    if (city && city !== "all") conditions.push(eq(posts.city, city));
    if (cursor) conditions.push(sql`${posts.id} > ${parseInt(cursor)}`);

    let query = db.select().from(posts).orderBy(desc(posts.pinned), desc(posts.createdAt)).limit(limit).offset(offset);
    // drizzle where chaining
    if (conditions.length > 0) {
      query = db.select().from(posts).where(conditions.length === 1 ? conditions[0] : and(...conditions)).orderBy(desc(posts.pinned), desc(posts.createdAt)).limit(limit).offset(offset) as any;
    }

    let result = await query;

    if (result.length === 0) {
      const check = await db.select().from(posts).limit(1);
      if (check.length === 0) {
        await seedDatabase();
        result = await db.select().from(posts).orderBy(desc(posts.pinned), desc(posts.createdAt)).limit(limit).offset(offset);
        if (conditions.length > 0) {
          result = await (db.select().from(posts).where(conditions.length === 1 ? conditions[0] : and(...conditions)).orderBy(desc(posts.pinned), desc(posts.createdAt)).limit(limit).offset(offset) as any);
        }
      }
    }

    const nextCursor = result.length === limit ? String(result[result.length - 1].id) : null;

    return NextResponse.json({ posts: result, nextCursor, limit, offset });
  } catch (err) {
    console.error("GET /api/posts error:", err);
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { postCreateSchema } = await import("@/lib/validators");
    const { rateLimit, getClientIp } = await import("@/lib/ratelimit");
    const { getCurrentUserId } = await import("@/lib/get-user");

    const ip = getClientIp(request);
    const rl = rateLimit(`posts:create:${ip}`, 10, 60_000);
    if (!rl.success) {
      return NextResponse.json({ error: "Rate limit exceeded. Try again soon." }, { status: 429, headers: { "Retry-After": String(Math.ceil((rl.reset - Date.now()) / 1000)) } });
    }

    const body = await request.json();
    const parsed = postCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }
    const { content, category, city, mediaUrl, mediaType, tags, pinned } = parsed.data;

    const userId = await getCurrentUserId();
    const currentUser = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const author = currentUser[0] || {
      id: userId,
      name: "Brian Mwangi",
      handle: "brianmwangi",
      avatar: "https://images.pexels.com/photos/14950779/pexels-photo-14950779.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
      trustScore: 98,
      verified: true,
    };

    const [newPost] = await db
      .insert(posts)
      .values({
        authorId: author.id,
        authorName: author.name,
        authorHandle: author.handle,
        authorAvatar: author.avatar,
        authorTrust: (author as any).trustScore ?? 98,
        authorVerified: (author as any).verified ?? true,
        content: content.trim(),
        category: category || "trending",
        city: city || "Nairobi",
        mediaUrl: mediaUrl || null,
        mediaType: mediaType || "text",
        tags: tags && tags.length ? tags : ["Kinara", "SovereignTech"],
        likes: 0,
        commentsCount: 0,
        sharesCount: 0,
        pinned: pinned || false,
      })
      .returning();

    return NextResponse.json({ post: newPost, success: true });
  } catch (err) {
    console.error("POST /api/posts error:", err);
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}
