import { NextResponse } from "next/server";
import { db } from "@/db";
import { marketplaceItems, messages, escrowTransactions, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { offerSchema } from "@/lib/validators";
import { rateLimit, getClientIp } from "@/lib/ratelimit";
import { getCurrentUserId } from "@/lib/get-user";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getClientIp(request);
    const rl = rateLimit(`marketplace:offer:${ip}`, 10, 60_000);
    if (!rl.success) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded. Try again soon." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.reset - Date.now()) / 1000)) } }
      );
    }

    const { id } = await params;
    const itemId = parseInt(id, 10);
    if (isNaN(itemId)) {
      return NextResponse.json({ success: false, error: "Invalid item id" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = offerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { offerPrice, note, paymentRail } = parsed.data;

    const [item] = await db.select().from(marketplaceItems).where(eq(marketplaceItems.id, itemId)).limit(1);
    if (!item) {
      return NextResponse.json({ success: false, error: "Item not found" }, { status: 404 });
    }

    const buyerId = await getCurrentUserId();
    const amount = offerPrice ?? item.price;
    const escrowRef = `ESC-${crypto.randomUUID()}`;
    const sellerId = item.sellerId;

    // Fetch buyer info for message
    const buyerRows = await db.select().from(users).where(eq(users.id, buyerId)).limit(1);
    const buyer = buyerRows[0];
    const buyerName = buyer?.name || `User ${buyerId}`;
    const buyerAvatar =
      buyer?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(buyerId)}`;

    // Use db transaction to create escrow + message atomically
    // drizzle node-postgres supports db.transaction
    let escrowId: string | undefined;
    let createdEscrowRef = escrowRef;

    // Try transaction, fallback to sequential if not supported
    try {
      await db.transaction(async (tx) => {
        const [escrow] = await tx
          .insert(escrowTransactions)
          .values({
            itemId: item.id,
            buyerId,
            sellerId,
            amount,
            currency: item.currency,
            status: "held",
            paymentRail: paymentRail || "mpesa",
            escrowRef,
            metadata: {
              itemTitle: item.title,
              price: amount,
              currency: item.currency,
              status: "Escrow Held in Vault",
              seller: item.sellerName,
              deliveryETA: item.deliverySpeed,
              note: note || "Interested in purchasing via Kinara Escrow.",
            },
          })
          .returning();
        escrowId = escrow.id;
        createdEscrowRef = escrow.escrowRef;

        await tx.insert(messages).values({
          threadId: `th_seller_${item.id}`,
          senderId: buyerId,
          senderName: buyerName,
          senderAvatar: buyerAvatar,
          senderRole: "Buyer",
          text: `Escrow Offer Locked: ${item.currency} ${amount.toLocaleString()} for "${item.title}". Funds held in Kinara Smart Vault awaiting delivery verification. Note: ${note || "Interested in purchasing via Kinara Escrow."}`,
          isMe: true,
          type: "offer",
          metadata: {
            itemTitle: item.title,
            price: amount,
            currency: item.currency,
            status: "Escrow Held in Vault",
            seller: item.sellerName,
            deliveryETA: item.deliverySpeed,
            escrowRef: createdEscrowRef,
            escrowId,
          },
        });
      });
    } catch (txErr) {
      // Fallback: sequential inserts if transaction helper not available or fails
      console.warn("Transaction failed, fallback to sequential:", txErr);
      const [escrow] = await db
        .insert(escrowTransactions)
        .values({
          itemId: item.id,
          buyerId,
          sellerId,
          amount,
          currency: item.currency,
          status: "held",
          paymentRail: paymentRail || "mpesa",
          escrowRef,
          metadata: {
            itemTitle: item.title,
            price: amount,
            currency: item.currency,
            status: "Escrow Held in Vault",
            seller: item.sellerName,
            deliveryETA: item.deliverySpeed,
            note: note || "Interested in purchasing via Kinara Escrow.",
          },
        })
        .returning();
      escrowId = escrow.id;
      createdEscrowRef = escrow.escrowRef;

      await db.insert(messages).values({
        threadId: `th_seller_${item.id}`,
        senderId: buyerId,
        senderName: buyerName,
        senderAvatar: buyerAvatar,
        senderRole: "Buyer",
        text: `Escrow Offer Locked: ${item.currency} ${amount.toLocaleString()} for "${item.title}". Funds held in Kinara Smart Vault awaiting delivery verification. Note: ${note || "Interested in purchasing via Kinara Escrow."}`,
        isMe: true,
        type: "offer",
        metadata: {
          itemTitle: item.title,
          price: amount,
          currency: item.currency,
          status: "Escrow Held in Vault",
          seller: item.sellerName,
          deliveryETA: item.deliverySpeed,
          escrowRef: createdEscrowRef,
          escrowId,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: { escrowRef: createdEscrowRef, escrowId, status: "held" },
      escrowRef: createdEscrowRef,
      escrowId,
      status: "held",
      amount,
      currency: item.currency,
    });
  } catch (err) {
    console.error("POST /api/marketplace/[id]/offer error:", err);
    return NextResponse.json({ success: false, error: "Failed to process escrow offer" }, { status: 500 });
  }
}
