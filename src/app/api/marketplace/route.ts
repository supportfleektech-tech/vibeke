import { NextResponse } from "next/server";
import { db } from "@/db";
import { marketplaceItems } from "@/db/schema";
import { desc } from "drizzle-orm";
import { seedDatabase } from "@/db/seed";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const city = searchParams.get("city");
    const maxPrice = searchParams.get("maxPrice");

    let items = await db
      .select()
      .from(marketplaceItems)
      .orderBy(desc(marketplaceItems.featured), desc(marketplaceItems.createdAt));

    if (items.length === 0) {
      await seedDatabase();
      items = await db
        .select()
        .from(marketplaceItems)
        .orderBy(desc(marketplaceItems.featured), desc(marketplaceItems.createdAt));
    }

    let filtered = items;
    if (category && category !== "all") {
      filtered = filtered.filter((item) => item.category.toLowerCase().includes(category.toLowerCase()));
    }
    if (city && city !== "all") {
      filtered = filtered.filter((item) => item.city.toLowerCase() === city.toLowerCase());
    }
    if (maxPrice) {
      const max = parseInt(maxPrice, 10);
      if (!isNaN(max)) {
        filtered = filtered.filter((item) => item.price <= max);
      }
    }

    return NextResponse.json({ items: filtered });
  } catch (err) {
    console.error("GET /api/marketplace error:", err);
    return NextResponse.json({ error: "Failed to fetch marketplace items" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      title,
      description,
      price,
      currency = "KES",
      category,
      image,
      neighborhood = "Kilimani",
      city = "Nairobi",
      deliverySpeed = "Boda express: 30 mins",
    } = body;

    if (!title || !price || !category) {
      return NextResponse.json({ error: "Title, price and category are required" }, { status: 400 });
    }

    const [newItem] = await db
      .insert(marketplaceItems)
      .values({
        title,
        description: description || "Verified seller listing on Kinara Escrow.",
        price: parseInt(price, 10),
        currency,
        category,
        image:
          image ||
          "https://images.pexels.com/photos/27680730/pexels-photo-27680730.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
        sellerName: "Brian Mwangi",
        sellerAvatar:
          "https://images.pexels.com/photos/14950779/pexels-photo-14950779.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
        sellerTrustScore: 98,
        sellerVerified: true,
        city,
        neighborhood,
        distanceKm: "0.8",
        deliverySpeed,
        aiPriceEstimate: `Fair Value: KES ${(parseInt(price, 10) * 1.08).toLocaleString()} (Verified competitive)`,
        escrowSecured: true,
        featured: false,
        rating: "5.0",
        reviewsCount: 1,
      })
      .returning();

    return NextResponse.json({ item: newItem, success: true });
  } catch (err) {
    console.error("POST /api/marketplace error:", err);
    return NextResponse.json({ error: "Failed to create listing" }, { status: 500 });
  }
}
