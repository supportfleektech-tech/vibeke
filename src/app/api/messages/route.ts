import { NextResponse } from "next/server";
import { db } from "@/db";
import { messages, threads, users } from "@/db/schema";
import { asc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { rateLimit, getClientIp } from "@/lib/ratelimit";
import { getCurrentUserId } from "@/lib/get-user";
import { ensureSeeded } from "@/db/seed";

export const dynamic = "force-dynamic";

const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const threadIdSchema = z.string().min(1).max(100).optional();

const messageCreateSchema = z.object({
  threadId: z.string().min(1, "threadId is required").max(100),
  text: z.string().max(5000).optional(),
  type: z.enum(["text", "voice", "offer", "poll"]).default("text"),
  metadata: z.record(z.string(), z.any()).nullable().optional(),
});

export async function GET(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(`messages:get:${ip}`, 30, 60_000);
    if (!rl.success) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded. Try again soon." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.reset - Date.now()) / 1000)) } }
      );
    }

    const { searchParams } = new URL(request.url);
    const threadIdRaw = searchParams.get("threadId");
    const limitRaw = searchParams.get("limit");
    const offsetRaw = searchParams.get("offset");

    // Validate threadId if provided (optional for backward compat; if present must be valid)
    if (threadIdRaw !== null && threadIdRaw !== "") {
      const parsedThread = z.string().min(1).max(100).safeParse(threadIdRaw.trim());
      if (!parsedThread.success) {
        return NextResponse.json(
          { success: false, error: "Invalid threadId", details: parsedThread.error.flatten() },
          { status: 400 }
        );
      }
    }

    const paginationParsed = paginationSchema.safeParse({
      limit: limitRaw ? Number(limitRaw) : undefined,
      offset: offsetRaw ? Number(offsetRaw) : undefined,
    });
    if (!paginationParsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid pagination params", details: paginationParsed.error.flatten() },
        { status: 400 }
      );
    }
    const { limit, offset } = paginationParsed.data;

    // Private data: the caller must be signed in, and may only ever read threads
    // they are a participant of. `participants` is a jsonb string array.
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const myThreads = await db
      .select({ id: threads.id })
      .from(threads)
      .where(sql`${threads.participants} @> ${JSON.stringify([userId])}::jsonb`);
    const myThreadIds = myThreads.map((t) => t.id);

    // Seed check if empty (avoid thundering herd)
    const checkExists = await db.select().from(messages).limit(1);
    if (checkExists.length === 0) {
      await ensureSeeded();
    }

    const threadId = threadIdRaw?.trim() || null;

    let result: (typeof messages.$inferSelect)[];
    if (threadId) {
      // 404 rather than 403 so a caller cannot probe which thread ids exist.
      if (!myThreadIds.includes(threadId)) {
        return NextResponse.json({ success: false, error: "Thread not found" }, { status: 404 });
      }
      result = await db
        .select()
        .from(messages)
        .where(eq(messages.threadId, threadId))
        .orderBy(asc(messages.createdAt))
        .limit(limit)
        .offset(offset);
    } else if (myThreadIds.length === 0) {
      // Signed in, but in no threads yet - never fall back to a global message dump.
      result = [];
    } else {
      result = await db
        .select()
        .from(messages)
        .where(inArray(messages.threadId, myThreadIds))
        .orderBy(asc(messages.createdAt))
        .limit(limit)
        .offset(offset);
    }

    // `isMe` is denormalized in the DB and only makes sense for one reader, so it is
    // re-derived per request instead of being trusted from the stored column.
    const messagesForCaller = result.map((m) => ({ ...m, isMe: m.senderId === userId }));

    return NextResponse.json({
      success: true,
      messages: messagesForCaller,
      limit,
      offset,
      count: messagesForCaller.length,
    });
  } catch (err) {
    console.error("GET /api/messages error:", err);
    return NextResponse.json({ success: false, error: "Failed to fetch messages" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(`messages:post:${ip}`, 30, 60_000);
    if (!rl.success) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded. Try again soon." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.reset - Date.now()) / 1000)) } }
      );
    }

    const body = await request.json().catch(() => ({}));
    const parsed = messageCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { threadId, text, type, metadata } = parsed.data;

    // text required when type is text
    if (type === "text" && (!text || text.trim().length === 0)) {
      return NextResponse.json({ success: false, error: "Message text is required for type 'text'" }, { status: 400 });
    }

    const senderId = await getCurrentUserId();
    if (!senderId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Fetch sender profile for denormalized fields
    const [senderProfile] = await db
      .select({ name: users.name, avatar: users.avatar, role: users.role })
      .from(users)
      .where(eq(users.id, senderId))
      .limit(1);
    const senderName = senderProfile?.name ?? "KINARA Member";
    const senderAvatar =
      senderProfile?.avatar ||
      "https://images.pexels.com/photos/14950779/pexels-photo-14950779.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";
    const senderRole = senderProfile?.role ? String(senderProfile.role) : "user";

    // Authorization: a sender may only post into a thread they already belong to.
    // Without this check, re-using someone else's threadId writes straight into
    // their conversation (the upsert below leaves their participant list intact).
    const [targetThread] = await db.select().from(threads).where(eq(threads.id, threadId)).limit(1);

    if (targetThread) {
      if (!(targetThread.participants ?? []).includes(senderId)) {
        return NextResponse.json({ success: false, error: "Thread not found" }, { status: 404 });
      }
    } else {
      // New conversation: the sender is its only participant until invited.
      await db.insert(threads).values({ id: threadId, participants: [senderId], type: "direct" });
    }

    // Prepare metadata as jsonb object (no JSON.stringify)
    const metadataValue = metadata ?? null;

    const finalText = text?.trim() || (type === "voice" ? "Voice dispatch" : type === "offer" ? "Offer" : "Attachment");

    const [newMsg] = await db
      .insert(messages)
      .values({
        threadId,
        senderId,
        senderName,
        senderAvatar,
        senderRole,
        text: finalText,
        timestamp: new Date(),
        isMe: true,
        type,
        metadata: metadataValue as any,
      })
      .returning();

    // Update threads.lastMessageAt
    try {
      const { sql } = await import("drizzle-orm");
      await db
        .update(threads)
        .set({ lastMessageAt: new Date() })
        .where(eq(threads.id, threadId));
    } catch {}

    return NextResponse.json({ message: newMsg, success: true });
  } catch (err) {
    console.error("POST /api/messages error:", err);
    return NextResponse.json({ success: false, error: "Failed to send message" }, { status: 500 });
  }
}
