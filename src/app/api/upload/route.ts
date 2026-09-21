import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit, getClientIp } from "@/lib/ratelimit";
import { getCurrentUserId } from "@/lib/get-user";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const uploadSchema = z.object({
  filename: z.string().min(1, "filename required").max(100, "filename max 100 chars").trim(),
  contentType: z.string().min(1, "contentType required").max(100, "contentType max 100 chars").trim(),
  size: z.coerce.number().int().min(1, "size must be >=1").max(10_000_000, "size max 10MB"),
});

// POST /api/upload - mock upload (Vercel Blob mock)
export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = rateLimit(`upload:create:${ip}`, 20, 60_000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Max 20 uploads per minute." },
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

    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = uploadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { filename, contentType, size } = parsed.data;

    // Basic contentType allowlist (optional - for demo allow any but log)
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "video/mp4",
      "video/webm",
      "audio/mpeg",
      "audio/mp3",
      "application/pdf",
    ];
    if (!allowedTypes.includes(contentType) && !contentType.startsWith("image/") && !contentType.startsWith("video/")) {
      logger.info({ contentType, filename, userId }, "Upload contentType not in allowlist but allowed for demo (mock)");
    }

    // Sanitize filename for URL (prevent path traversal)
    const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
    const url = `https://cdn.kinara.ke/${sanitized}`;
    const thumbnail = `https://cdn.kinara.ke/thumb/${sanitized}`;

    logger.info({ filename: sanitized, contentType, size, userId }, "Mock upload processed");

    // For real Vercel Blob, would use: put(sanitized, body, { access: 'public' })
    return NextResponse.json(
      {
        url,
        thumbnail,
        success: true,
        filename: sanitized,
        contentType,
        size,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("POST /api/upload error:", err);
    return NextResponse.json({ error: "Failed to process upload" }, { status: 500 });
  }
}
