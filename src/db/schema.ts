import { pgTable, text, serial, integer, boolean, timestamp, numeric } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  handle: text("handle").notNull().unique(),
  avatar: text("avatar").notNull(),
  cover: text("cover").notNull(),
  bio: text("bio").notNull(),
  role: text("role").default("citizen").notNull(),
  location: text("location").notNull(),
  trustScore: integer("trust_score").default(95).notNull(),
  verified: boolean("verified").default(true).notNull(),
  verificationType: text("verification_type").default("Biometric & Escrow Certified").notNull(),
  followersCount: integer("followers_count").default(1240).notNull(),
  followingCount: integer("following_count").default(480).notNull(),
  marketplaceRating: numeric("marketplace_rating", { precision: 3, scale: 2 }).default("4.95").notNull(),
  skills: text("skills").notNull(), // JSON array
  achievements: text("achievements").notNull(), // JSON array
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  authorId: text("author_id").notNull(),
  authorName: text("author_name").notNull(),
  authorHandle: text("author_handle").notNull(),
  authorAvatar: text("author_avatar").notNull(),
  authorTrust: integer("author_trust").default(95).notNull(),
  authorVerified: boolean("author_verified").default(true).notNull(),
  content: text("content").notNull(),
  category: text("category").default("trending").notNull(),
  city: text("city").default("Nairobi").notNull(),
  likes: integer("likes").default(0).notNull(),
  commentsCount: integer("comments_count").default(0).notNull(),
  sharesCount: integer("shares_count").default(0).notNull(),
  mediaUrl: text("media_url"),
  mediaType: text("media_type").default("text").notNull(),
  tags: text("tags").notNull(), // JSON array
  pinned: boolean("pinned").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const communities = pgTable("communities", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  tagline: text("tagline").notNull(),
  description: text("description").notNull(),
  avatar: text("avatar").notNull(),
  banner: text("banner").notNull(),
  category: text("category").notNull(),
  membersCount: integer("members_count").default(100).notNull(),
  activeVoice: boolean("active_voice").default(false).notNull(),
  voiceSpeakersCount: integer("voice_speakers_count").default(0).notNull(),
  voiceRoomTopic: text("voice_room_topic"),
  city: text("city").default("Pan-African").notNull(),
  rules: text("rules").notNull(), // JSON
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const marketplaceItems = pgTable("marketplace_items", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  price: integer("price").notNull(),
  currency: text("currency").default("KES").notNull(),
  category: text("category").notNull(),
  image: text("image").notNull(),
  sellerName: text("seller_name").notNull(),
  sellerAvatar: text("seller_avatar").notNull(),
  sellerTrustScore: integer("seller_trust_score").default(96).notNull(),
  sellerVerified: boolean("seller_verified").default(true).notNull(),
  city: text("city").notNull(),
  neighborhood: text("neighborhood").notNull(),
  distanceKm: numeric("distance_km", { precision: 3, scale: 1 }).notNull(),
  deliverySpeed: text("delivery_speed").notNull(),
  aiPriceEstimate: text("ai_price_estimate").notNull(),
  escrowSecured: boolean("escrow_secured").default(true).notNull(),
  featured: boolean("featured").default(false).notNull(),
  rating: numeric("rating", { precision: 3, scale: 2 }).default("4.9").notNull(),
  reviewsCount: integer("reviews_count").default(24).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const businesses = pgTable("businesses", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  banner: text("banner").notNull(),
  avatar: text("avatar").notNull(),
  headline: text("headline").notNull(),
  bio: text("bio").notNull(),
  city: text("city").notNull(),
  neighborhood: text("neighborhood").notNull(),
  rating: numeric("rating", { precision: 3, scale: 2 }).default("4.95").notNull(),
  reviewsCount: integer("reviews_count").default(120).notNull(),
  verified: boolean("verified").default(true).notNull(),
  openHours: text("open_hours").notNull(),
  services: text("services").notNull(), // JSON array
  catalogCount: integer("catalog_count").default(12).notNull(),
  monthlyTransactions: integer("monthly_transactions").default(850).notNull(),
  phone: text("phone").notNull(),
  website: text("website").notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  threadId: text("thread_id").notNull(),
  senderName: text("sender_name").notNull(),
  senderAvatar: text("sender_avatar").notNull(),
  senderRole: text("sender_role").default("user").notNull(),
  text: text("text").notNull(),
  timestamp: text("timestamp").notNull(),
  isMe: boolean("is_me").default(false).notNull(),
  type: text("type").default("text").notNull(),
  metadata: text("metadata"), // JSON string
});

export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  company: text("company").notNull(),
  companyLogo: text("company_logo").notNull(),
  location: text("location").notNull(),
  type: text("type").notNull(),
  salary: text("salary").notNull(),
  category: text("category").notNull(),
  tags: text("tags").notNull(), // JSON array
  postedAt: text("posted_at").notNull(),
});

export const localRadar = pgTable("local_radar", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // friend, business, event, deal, listing, service
  name: text("name").notNull(),
  avatar: text("avatar").notNull(),
  city: text("city").notNull(),
  neighborhood: text("neighborhood").notNull(),
  lat: numeric("lat", { precision: 6, scale: 4 }).notNull(),
  lng: numeric("lng", { precision: 6, scale: 4 }).notNull(),
  distance: text("distance").notNull(),
  details: text("details").notNull(),
  status: text("status").notNull(),
});
