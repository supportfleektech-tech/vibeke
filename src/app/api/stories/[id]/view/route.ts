import { NextResponse } from "next/server";
import { db } from "@/db";
import { stories } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

function parseStoryId(id: string): number | null {
  const n = parseInt(id, 10);
  if (isNaN(n) || n <= 0) return null;
  return n;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { rateLimit, getClientIp } = await import("@/lib/ratelimit");
    const { getCurrentUserId } = await import("@/lib/get-user");

    const ip = getClientIp(request);
    const rl = await rateLimit(`stories:view:${ip}`, 30, 60_000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again soon." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil((rl.reset - Date.now()) / 1000)) },
        }
      );
    }

    const { id } = await params;
    const storyId = parseStoryId(id);
    if (storyId === null) {
      return NextResponse.json({ error: "Invalid story ID - must be numeric" }, { status: 400 });
    }

    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [story] = await db.select().from(stories).where(eq(stories.id, storyId)).limit(1);
    if (!story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    const viewedBy: string[] = (story.viewedBy as string[]) || [];
    const alreadyViewed = viewedBy.includes(userId);

    if (alreadyViewed) {
      return NextResponse.json({ viewed: true, success: true, alreadyViewed: true });
    }

    // Fetch then set - simpler jsonb manipulation
    const newViewedBy = [...viewedBy, userId];
    const [updated] = await db
      .update(stories)
      .set({ viewedBy: newViewedBy })
      .where(eq(stories.id, storyId))
      .returning();

    return NextResponse.json({ viewed: true, success: true, alreadyViewed: false, story: updated });
  } catch (err) {
    console.error("POST /api/stories/[id]/view error:", err);
    return NextResponse.json({ error: "Failed to mark story as viewed" }, { status: 500 });
  }
}
