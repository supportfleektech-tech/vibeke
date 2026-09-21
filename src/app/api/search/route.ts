import { NextResponse } from "next/server";
import { db } from "@/db";
import { communities, marketplaceItems, businesses, jobs, posts, users } from "@/db/schema";
import { sql, desc } from "drizzle-orm";
import { z } from "zod";
import { rateLimit, getClientIp } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

const searchTypeEnum = z.enum(["all", "communities", "products", "businesses", "jobs", "people", "posts"]);
const querySchema = z.string().min(1, "q must be at least 1 char").max(100, "q must be at most 100 chars").trim();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawQ = searchParams.get("q") ?? "";
    const rawType = searchParams.get("type") ?? "all";

    // Rate limit: 30/min per IP (search is heavier)
    const ip = getClientIp(request);
    const rl = rateLimit(`search:${ip}`, 30, 60_000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Max 30 searches per minute." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((rl.reset - Date.now()) / 1000)),
          },
        }
      );
    }

    const qParsed = querySchema.safeParse(rawQ);
    if (!qParsed.success) {
      return NextResponse.json(
        { error: "Invalid query: q must be 1-100 characters", details: qParsed.error.flatten() },
        { status: 400 }
      );
    }
    const typeParsed = searchTypeEnum.safeParse(rawType);
    if (!typeParsed.success) {
      return NextResponse.json(
        { error: 'Invalid type - must be one of all|communities|products|businesses|jobs|people|posts', details: typeParsed.error.flatten() },
        { status: 400 }
      );
    }

    const q = qParsed.data;
    const type = typeParsed.data;
    const pattern = `%${q}%`;

    const shouldSearch = (t: string) => type === "all" || type === t;
    const limitPerType = type === "all" ? 10 : 20;

    // Initialize empty results
    const results: {
      communities: any[];
      products: any[];
      businesses: any[];
      jobs: any[];
      posts: any[];
      people: any[];
    } = {
      communities: [],
      products: [],
      businesses: [],
      jobs: [],
      posts: [],
      people: [],
    };

    const promises: Promise<void>[] = [];

    // Communities: name/tagline (also description for broader match)
    if (shouldSearch("communities")) {
      promises.push(
        (async () => {
          try {
            const rows = await db
              .select()
              .from(communities)
              .where(sql`${communities.name} ILIKE ${pattern} OR ${communities.tagline} ILIKE ${pattern}`)
              .limit(limitPerType);
            results.communities = rows;
          } catch (e) {
            console.error("search communities error:", e);
            results.communities = [];
          }
        })()
      );
    }

    // Products: marketplace_items title/description
    if (shouldSearch("products")) {
      promises.push(
        (async () => {
          try {
            const rows = await db
              .select()
              .from(marketplaceItems)
              .where(sql`${marketplaceItems.title} ILIKE ${pattern} OR ${marketplaceItems.description} ILIKE ${pattern}`)
              .limit(limitPerType);
            results.products = rows;
          } catch (e) {
            console.error("search products error:", e);
            results.products = [];
          }
        })()
      );
    }

    // Businesses: name/headline
    if (shouldSearch("businesses")) {
      promises.push(
        (async () => {
          try {
            const rows = await db
              .select()
              .from(businesses)
              .where(sql`${businesses.name} ILIKE ${pattern} OR ${businesses.headline} ILIKE ${pattern}`)
              .limit(limitPerType);
            results.businesses = rows;
          } catch (e) {
            console.error("search businesses error:", e);
            results.businesses = [];
          }
        })()
      );
    }

    // Jobs: title/company
    if (shouldSearch("jobs")) {
      promises.push(
        (async () => {
          try {
            const rows = await db
              .select()
              .from(jobs)
              .where(sql`${jobs.title} ILIKE ${pattern} OR ${jobs.company} ILIKE ${pattern}`)
              .limit(limitPerType);
            results.jobs = rows;
          } catch (e) {
            console.error("search jobs error:", e);
            results.jobs = [];
          }
        })()
      );
    }

    // Posts: content
    if (shouldSearch("posts")) {
      promises.push(
        (async () => {
          try {
            const rows = await db
              .select()
              .from(posts)
              .where(sql`${posts.content} ILIKE ${pattern}`)
              .orderBy(desc(posts.createdAt))
              .limit(limitPerType);
            results.posts = rows;
          } catch (e) {
            console.error("search posts error:", e);
            results.posts = [];
          }
        })()
      );
    }

    // People: users name/handle
    if (shouldSearch("people")) {
      promises.push(
        (async () => {
          try {
            const rows = await db
              .select()
              .from(users)
              .where(sql`${users.name} ILIKE ${pattern} OR ${users.handle} ILIKE ${pattern}`)
              .limit(limitPerType);
            results.people = rows;
          } catch (e) {
            console.error("search people error:", e);
            results.people = [];
          }
        })()
      );
    }

    await Promise.all(promises);

    const count =
      results.communities.length +
      results.products.length +
      results.businesses.length +
      results.jobs.length +
      results.posts.length +
      results.people.length;

    return NextResponse.json({
      results,
      query: q,
      type,
      count,
    });
  } catch (err) {
    console.error("GET /api/search error:", err);
    return NextResponse.json({ error: "Failed to perform search" }, { status: 500 });
  }
}
