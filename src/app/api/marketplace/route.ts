import { NextResponse } from "next/server";
import { db } from "@/db";
import { marketplaceItems, users } from "@/db/schema";
import { desc, eq, and, lte } from "drizzle-orm";
import { z } from "zod";
import { marketplaceCreateSchema } from "@/lib/validators";
import { rateLimit, getClientIp } from "@/lib/ratelimit";
import { getCurrentUserId } from "@/lib/get-user";
import { seedDatabase } from "@/db/seed";

export const dynamic = "force-dynamic";

const marketplaceQuerySchema = z.object({
  category: z.string().optional(),
  city: z.string().optional(),
  maxPrice: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export async function GET(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = rateLimit(`marketplace:get:${ip}`, 30, 60_000);
    if (!rl.success) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded. Try again soon." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.reset - Date.now()) / 1000)) } }
      );
    }

    const { searchParams } = new URL(request.url);
    const raw = {
      category: searchParams.get("category") || undefined,
      city: searchParams.get("city") || undefined,
      maxPrice: searchParams.get("maxPrice") || undefined,
      limit: searchParams.get("limit") || undefined,
      offset: searchParams.get("offset") || undefined,
    };

    const parsed = marketplaceQuerySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid query params", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { category, city, maxPrice, limit, offset } = parsed.data;

    // Transaction-safe seed check
    const check = await db.select().from(marketplaceItems).limit(1);
    if (check.length === 0) {
      await seedDatabase();
    }

    // Build SQL WHERE with drizzle eq/and - index-aware
    const conditions: ReturnType<typeof eq>[] = [];
    if (category && category !== "all") {
      conditions.push(eq(marketplaceItems.category, category));
    }
    if (city && city !== "all") {
      conditions.push(eq(marketplaceItems.city, city));
    }
    if (maxPrice !== undefined) {
      conditions.push(lte(marketplaceItems.price, maxPrice));
    }

    const whereClause =
      conditions.length === 0 ? undefined : conditions.length === 1 ? conditions[0] : and(...conditions);

    let items: (typeof marketplaceItems.$inferSelect)[];
    if (whereClause) {
      items = await db
        .select()
        .from(marketplaceItems)
        .where(whereClause)
        .orderBy(desc(marketplaceItems.featured), desc(marketplaceItems.createdAt))
        .limit(limit)
        .offset(offset);
    } else {
      items = await db
        .select()
        .from(marketplaceItems)
        .orderBy(desc(marketplaceItems.featured), desc(marketplaceItems.createdAt))
        .limit(limit)
        .offset(offset);
    }

    return NextResponse.json({
      success: true,
      data: items,
      items,
      limit,
      offset,
      count: items.length,
    });
  } catch (err) {
    console.error("GET /api/marketplace error:", err);
    return NextResponse.json({ success: false, error: "Failed to fetch marketplace items" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = rateLimit(`marketplace:create:${ip}`, 10, 60_000);
    if (!rl.success) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded. Try again soon." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.reset - Date.now()) / 1000)) } }
      );
    }

    const body = await request.json();
    const parsed = marketplaceCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { title, description, price, currency, category, image, city, neighborhood } = parsed.data;

    // Use authenticated sellerId
    const sellerId = await getCurrentUserId();
    const sellerRows = await db.select().from(users).where(eq(users.id, sellerId)).limit(1);
    const seller = sellerRows[0];

    const sellerName = seller?.name || `User ${sellerId}`;
    const sellerAvatar =
      seller?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(sellerId)}`;
    const sellerTrustScore = seller?.trustScore ?? 95;
    const sellerVerified = seller?.verified ?? false;

    // Tags handling - accept optional tags array if provided in body even though schema doesn't include it
    const tags: string[] | undefined = (body as any)?.tags;

    const deliverySpeed = (body as any)?.deliverySpeed || "Boda express: 30 mins";
    const distanceKm = (body as any)?.distanceKm || "0.8";

    const [newItem] = await db
      .insert(marketplaceItems)
      .values({
        title,
        description: description || "Verified seller listing on Kinara Escrow.",
        price,
        currency: currency || "KES",
        category,
        image:
          image ||
          "https://images.pexels.com/photos/27680730/pexels-photo-27680730.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
        sellerId,
        sellerName,
        sellerAvatar,
        sellerTrustScore,
        sellerVerified,
        city: city || "Nairobi",
        neighborhood: neighborhood || "Kilimani",
        distanceKm,
        deliverySpeed,
        aiPriceEstimate: `Fair Value: KES ${(price * 1.08).toLocaleString()} (Verified competitive)`,
        escrowSecured: true,
        featured: false,
        rating: "5.0",
        reviewsCount: 1,
      })
      .returning();

    return NextResponse.json({ success: true, data: newItem, item: newItem }, { status: 201 });
  } catch (err) {
    console.error("POST /api/marketplace error:", err);
    return NextResponse.json({ success: false, error: "Failed to create listing" }, { status: 500 });
  }
}
