import { NextResponse } from "next/server";
import { db } from "@/db";
import { marketplaceItems, messages } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const itemId = parseInt(id, 10);
    const body = await request.json().catch(() => ({}));
    const { offerPrice, note = "Interested in purchasing via Kinara Escrow." } = body;

    const [item] = await db.select().from(marketplaceItems).where(eq(marketplaceItems.id, itemId)).limit(1);
    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const price = offerPrice || item.price;

    // Create an escrow transaction message
    await db.insert(messages).values({
      threadId: `th_seller_${item.id}`,
      senderName: "Brian Mwangi",
      senderAvatar: "https://images.pexels.com/photos/14950779/pexels-photo-14950779.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
      senderRole: "Buyer",
      text: `Escrow Offer Locked: ${item.currency} ${price.toLocaleString()} for "${item.title}". Funds held in Kinara Smart Vault awaiting delivery verification. Note: ${note}`,
      timestamp: "Just now",
      isMe: true,
      type: "offer",
      metadata: JSON.stringify({
        itemTitle: item.title,
        price,
        currency: item.currency,
        status: "Escrow Held in Vault",
        seller: item.sellerName,
        deliveryETA: item.deliverySpeed,
      }),
    });

    return NextResponse.json({
      success: true,
      message: "Escrow secured! Funds held in Kinara Vault until item is delivered and confirmed.",
      escrowId: `ESC-${Date.now().toString().slice(-6)}`,
      amount: price,
      currency: item.currency,
    });
  } catch (err) {
    console.error("POST /api/marketplace/[id]/offer error:", err);
    return NextResponse.json({ error: "Failed to process escrow offer" }, { status: 500 });
  }
}
