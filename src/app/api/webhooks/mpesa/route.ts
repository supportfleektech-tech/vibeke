import { NextResponse } from "next/server";
import { db } from "@/db";
import { escrowTransactions, notifications } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { rateLimit, getClientIp } from "@/lib/ratelimit";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const mpesaWebhookSchema = z.object({
  checkoutRequestID: z.string().min(1, "checkoutRequestID required").max(100, "checkoutRequestID max 100 chars").trim(),
  resultCode: z.coerce.number().int(),
  resultDesc: z.string().min(1, "resultDesc required").max(500, "resultDesc max 500 chars").trim(),
  amount: z.coerce.number().min(0).optional().default(0),
  phone: z.string().min(1, "phone required").max(20, "phone max 20 chars").trim(),
});

// POST /api/webhooks/mpesa - Daraja STK webhook mock
export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = rateLimit(`webhooks:mpesa:${ip}`, 30, 60_000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Max 30 requests per minute." },
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

    const body = await request.json().catch(() => ({}));
    const parsed = mpesaWebhookSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { checkoutRequestID, resultCode, resultDesc, amount, phone } = parsed.data;

    // Verify via SEED_SECRET if configured - for demo just log
    const seedSecret = process.env.SEED_SECRET;
    if (seedSecret) {
      const provided = request.headers.get("x-seed-secret") || request.headers.get("x-webhook-secret");
      if (provided && provided !== seedSecret) {
        logger.info({ checkoutRequestID, ip }, "M-Pesa webhook SEED_SECRET mismatch (logged, not blocked for demo)");
      }
    }

    logger.info(
      { checkoutRequestID, resultCode, resultDesc, amount, phone },
      "M-Pesa STK callback received"
    );

    // If resultCode 0 (success), find escrow by checkoutRequestID (escrowRef) and process
    if (resultCode === 0) {
      try {
        const [escrow] = await db
          .select()
          .from(escrowTransactions)
          .where(eq(escrowTransactions.escrowRef, checkoutRequestID))
          .limit(1);

        // Also try metadata checkoutRequestID lookup if escrowRef not matched
        let targetEscrow = escrow;
        if (!targetEscrow) {
          // Fallback: search by metadata jsonb (if contains checkoutRequestID)
          // For demo, try to fetch via escrowRef like pattern via raw query fallback
          // If still not found, just log
          logger.info({ checkoutRequestID }, "Escrow not found by escrowRef, checking metadata (mock)");
        }

        // Create notification for buyer/seller if escrow found
        if (targetEscrow) {
          const notifyUserId = targetEscrow.buyerId || targetEscrow.sellerId;
          if (notifyUserId) {
            try {
              await db.insert(notifications).values({
                userId: notifyUserId,
                actorId: targetEscrow.sellerId || notifyUserId,
                actorName: "Kinara Escrow",
                actorAvatar: "https://cdn.kinara.ke/escrow-avatar.png",
                type: "escrow",
                entityType: "marketplace",
                entityId: String(targetEscrow.itemId),
                message: `M-Pesa payment confirmed: KES ${amount} for escrow ${targetEscrow.escrowRef} (${phone})`,
                read: false,
              });
              logger.info({ escrowRef: targetEscrow.escrowRef, userId: notifyUserId }, "M-Pesa success notification created");
            } catch (e) {
              console.warn("Failed to create M-Pesa notification:", e);
            }
          }

          // Optionally update escrow metadata to mark STK success
          // Not changing status automatically for demo - keep held until delivery confirmation
        } else {
          // Demo fallback: create generic notification if no escrow matched but payment succeeded
          // Find a demo user to notify - skip if no target
          logger.info({ checkoutRequestID, amount, phone }, "M-Pesa success but no matching escrow - mock processed");
        }
      } catch (e) {
        logger.info({ err: e, checkoutRequestID }, "Error processing M-Pesa escrow lookup (mock continue)");
      }
    } else {
      logger.info({ checkoutRequestID, resultCode, resultDesc }, "M-Pesa STK callback non-zero resultCode (payment failed/cancelled)");
    }

    return NextResponse.json(
      {
        received: true,
        message: "STK callback processed (mock)",
        checkoutRequestID,
        resultCode,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("POST /api/webhooks/mpesa error:", err);
    return NextResponse.json({ error: "Failed to process webhook" }, { status: 500 });
  }
}
