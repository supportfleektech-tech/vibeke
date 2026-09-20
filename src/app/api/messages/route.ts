import { NextResponse } from "next/server";
import { db } from "@/db";
import { messages } from "@/db/schema";
import { asc } from "drizzle-orm";
import { seedDatabase } from "@/db/seed";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const threadId = searchParams.get("threadId");

    let allMessages = await db.select().from(messages).orderBy(asc(messages.id));

    if (allMessages.length === 0) {
      await seedDatabase();
      allMessages = await db.select().from(messages).orderBy(asc(messages.id));
    }

    if (threadId) {
      allMessages = allMessages.filter((m) => m.threadId === threadId);
    }

    return NextResponse.json({ messages: allMessages });
  } catch (err) {
    console.error("GET /api/messages error:", err);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      threadId = "th_folake",
      text,
      type = "text",
      metadata = null,
    } = body;

    if (!text && type === "text") {
      return NextResponse.json({ error: "Message text is required" }, { status: 400 });
    }

    const [newMsg] = await db
      .insert(messages)
      .values({
        threadId,
        senderName: "Brian Mwangi",
        senderAvatar:
          "https://images.pexels.com/photos/14950779/pexels-photo-14950779.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
        senderRole: "Product Architect",
        text: text || "Voice dispatch",
        timestamp: "Just now",
        isMe: true,
        type,
        metadata: metadata ? JSON.stringify(metadata) : null,
      })
      .returning();

    return NextResponse.json({ message: newMsg, success: true });
  } catch (err) {
    console.error("POST /api/messages error:", err);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
