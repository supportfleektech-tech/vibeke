import { NextResponse } from "next/server";
import { db } from "@/db";
import { messages, threads, users } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { rateLimit, getClientIp } from "@/lib/ratelimit";
import { getCurrentUserId } from "@/lib/get-user";
import { seedDatabase } from "@/db/seed";

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
    const rl = rateLimit(`messages:get:${ip}`, 30, 60_000);
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

    // Seed check if empty (avoid thundering herd)
    const checkExists = await db.select().from(messages).limit(1);
    if (checkExists.length === 0) {
      await seedDatabase();
    }

    const threadId = threadIdRaw?.trim() || null;

    let result: (typeof messages.$inferSelect)[];
    if (threadId) {
      result = await db
        .select()
        .from(messages)
        .where(eq(messages.threadId, threadId))
        .orderBy(asc(messages.createdAt))
        .limit(limit)
        .offset(offset);
    } else {
      // No threadId: still paginated, ordered by createdAt asc for chronological view
      // For backward compat when page.tsx fetches /api/messages without threadId
      result = await db.select().from(messages).orderBy(asc(messages.createdAt)).limit(limit).offset(offset);
    }

    return NextResponse.json({
      success: true,
      messages: result,
      limit,
      offset,
      count: result.length,
    });
  } catch (err) {
    console.error("GET /api/messages error:", err);
    return NextResponse.json({ success: false, error: "Failed to fetch messages" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = rateLimit(`messages:post:${ip}`, 30, 60_000);
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

    // Fetch sender profile for denormalized fields
    const [senderProfile] = await db.select().from(users).where(eq(users.id, senderId)).limit(1);
    const senderName = senderProfile?.name || "Brian Mwangi";
    const senderAvatar =
      senderProfile?.avatar ||
      "https://images.pexels.com/photos/14950779/pexels-photo-14950779.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";
    const senderRole = senderProfile?.role ? String(senderProfile.role) : "Product Architect";

    // Upsert thread: create thread if not exists (threads table)
    try {
      await db
        .insert(threads)
        .values({
          id: threadId,
          participants: [senderId],
          type: "direct",
        })
        .onConflictDoNothing();
    } catch (e) {
      // Fallback: check existence then insert if needed
      console.warn("Thread upsert warning (non-fatal):", e);
      const existing = await db.select().from(threads).where(eq(threads.id, threadId)).limit(1);
      if (existing.length === 0) {
        await db.insert(threads).values({
          id: threadId,
          participants: [senderId],
          type: "direct",
        });
      }
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
