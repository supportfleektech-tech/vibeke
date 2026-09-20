import { NextResponse } from "next/server";
import { db } from "@/db";
import { posts, users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { seedDatabase } from "@/db/seed";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const city = searchParams.get("city");

    let allPosts = await db.select().from(posts).orderBy(desc(posts.pinned), desc(posts.createdAt));

    // If empty, auto-seed
    if (allPosts.length === 0) {
      await seedDatabase();
      allPosts = await db.select().from(posts).orderBy(desc(posts.pinned), desc(posts.createdAt));
    }

    let filtered = allPosts;
    if (category && category !== "all") {
      filtered = filtered.filter((p) => p.category.toLowerCase() === category.toLowerCase());
    }
    if (city && city !== "all") {
      filtered = filtered.filter((p) => p.city.toLowerCase() === city.toLowerCase());
    }

    return NextResponse.json({ posts: filtered });
  } catch (err) {
    console.error("GET /api/posts error:", err);
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { content, category = "trending", city = "Nairobi", mediaUrl = null, mediaType = "text", tags = [] } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Post content is required" }, { status: 400 });
    }

    // Default user is Brian Mwangi
    const currentUser = await db.select().from(users).where(eq(users.id, "usr_brian_mwangi")).limit(1);
    const author = currentUser[0] || {
      id: "usr_brian_mwangi",
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
        authorTrust: author.trustScore,
        authorVerified: author.verified,
        content: content.trim(),
        category,
        city,
        mediaUrl,
        mediaType,
        tags: JSON.stringify(tags.length ? tags : ["Kinara", "SovereignTech"]),
        likes: 1,
        commentsCount: 0,
        sharesCount: 0,
        pinned: false,
      })
      .returning();

    return NextResponse.json({ post: newPost, success: true });
  } catch (err) {
    console.error("POST /api/posts error:", err);
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}
