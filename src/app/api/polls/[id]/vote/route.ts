import { NextResponse } from "next/server";
import { db } from "@/db";
import { polls } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { rateLimit, getClientIp } from "@/lib/ratelimit";
import { getCurrentUserId } from "@/lib/get-user";

export const dynamic = "force-dynamic";

const voteSchema = z.object({
  optionIndex: z.number().int().min(0).max(3),
});

function parsePollId(id: string): number | null {
  const n = parseInt(id, 10);
  if (isNaN(n) || n <= 0 || !Number.isInteger(n)) return null;
  return n;
}

// POST /api/polls/[id]/vote - {optionIndex 0-3}
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const pollId = parsePollId(id);
    if (pollId === null) {
      return NextResponse.json({ error: "Invalid poll ID" }, { status: 400 });
    }

    const ip = getClientIp(request);
    const userId = await getCurrentUserId();
    const rlKey = userId ? `polls:vote:${userId}` : `polls:vote:${ip}`;
    const rl = await rateLimit(rlKey, 10, 60_000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Max 10 votes per minute." },
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

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = voteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { optionIndex } = parsed.data;

    const [poll] = await db.select().from(polls).where(eq(polls.id, pollId)).limit(1);
    if (!poll) {
      return NextResponse.json({ error: "Poll not found" }, { status: 404 });
    }

    if (optionIndex >= poll.options.length) {
      return NextResponse.json({ error: "optionIndex out of bounds" }, { status: 400 });
    }

    const votedBy: string[] = Array.isArray(poll.votedBy) ? (poll.votedBy as string[]) : [];
    if (votedBy.includes(userId)) {
      return NextResponse.json({ error: "Already voted" }, { status: 409 });
    }

    const votes: number[] = Array.isArray(poll.votes) ? [...(poll.votes as number[])] : [0, 0, 0, 0];
    // Ensure length 4
    while (votes.length < 4) votes.push(0);
    votes[optionIndex] = (votes[optionIndex] ?? 0) + 1;

    const newVotedBy = [...votedBy, userId];

    const [updated] = await db
      .update(polls)
      .set({
        votes,
        votedBy: newVotedBy,
      })
      .where(eq(polls.id, pollId))
      .returning();

    return NextResponse.json({ poll: updated, success: true });
  } catch (err) {
    console.error("POST /api/polls/[id]/vote error:", err);
    return NextResponse.json({ error: "Failed to vote" }, { status: 500 });
  }
}
