import { pgTable, text, serial, integer, boolean, timestamp, numeric, jsonb, uuid, index, uniqueIndex } from "drizzle-orm/pg-core";

// Users - sovereign identity
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
  skills: jsonb("skills").$type<string[]>().default([]).notNull(),
  achievements: jsonb("achievements").$type<{ title: string; desc: string; icon: string }[]>().default([]).notNull(),
  preferences: jsonb("preferences").$type<{ persona?: string; lowBandwidth?: boolean; sections?: any }>().default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("users_location_idx").on(t.location),
  index("users_trust_idx").on(t.trustScore),
  index("users_role_idx").on(t.role),
]);

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  authorId: text("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
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
  tags: jsonb("tags").$type<string[]>().default([]).notNull(),
  pinned: boolean("pinned").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("posts_category_idx").on(t.category),
  index("posts_city_idx").on(t.city),
  index("posts_pinned_idx").on(t.pinned),
  index("posts_created_idx").on(t.createdAt),
  index("posts_author_idx").on(t.authorId),
]);

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
  rules: jsonb("rules").$type<string[]>().default([]).notNull(),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("communities_category_idx").on(t.category),
  index("communities_active_voice_idx").on(t.activeVoice),
  index("communities_city_idx").on(t.city),
]);

export const marketplaceItems = pgTable("marketplace_items", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  price: integer("price").notNull(),
  currency: text("currency").default("KES").notNull(),
  category: text("category").notNull(),
  image: text("image").notNull(),
  sellerId: text("seller_id").references(() => users.id),
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
}, (t) => [
  index("marketplace_category_idx").on(t.category),
  index("marketplace_city_idx").on(t.city),
  index("marketplace_featured_idx").on(t.featured),
  index("marketplace_price_idx").on(t.price),
  index("marketplace_seller_idx").on(t.sellerId),
]);

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
  services: jsonb("services").$type<{ name: string; price: string }[]>().default([]).notNull(),
  catalogCount: integer("catalog_count").default(12).notNull(),
  monthlyTransactions: integer("monthly_transactions").default(850).notNull(),
  phone: text("phone").notNull(),
  website: text("website").notNull(),
  ownerId: text("owner_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("businesses_city_idx").on(t.city),
  index("businesses_category_idx").on(t.category),
  index("businesses_verified_idx").on(t.verified),
]);

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  threadId: text("thread_id").notNull(),
  senderId: text("sender_id").references(() => users.id),
  senderName: text("sender_name").notNull(),
  senderAvatar: text("sender_avatar").notNull(),
  senderRole: text("sender_role").default("user").notNull(),
  text: text("text").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  isMe: boolean("is_me").default(false).notNull(),
  type: text("type").default("text").notNull(),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("messages_thread_idx").on(t.threadId),
  index("messages_sender_idx").on(t.senderId),
  index("messages_created_idx").on(t.createdAt),
]);

export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  company: text("company").notNull(),
  companyLogo: text("company_logo").notNull(),
  location: text("location").notNull(),
  type: text("type").notNull(),
  salary: text("salary").notNull(),
  category: text("category").notNull(),
  tags: jsonb("tags").$type<string[]>().default([]).notNull(),
  postedAt: timestamp("posted_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("jobs_category_idx").on(t.category),
  index("jobs_location_idx").on(t.location),
  index("jobs_posted_idx").on(t.postedAt),
]);

export const localRadar = pgTable("local_radar", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  name: text("name").notNull(),
  avatar: text("avatar").notNull(),
  city: text("city").notNull(),
  neighborhood: text("neighborhood").notNull(),
  lat: numeric("lat", { precision: 10, scale: 7 }).notNull(),
  lng: numeric("lng", { precision: 10, scale: 7 }).notNull(),
  distance: text("distance").notNull(),
  distanceKm: numeric("distance_km", { precision: 5, scale: 2 }),
  details: text("details").notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("radar_type_idx").on(t.type),
  index("radar_city_idx").on(t.city),
  index("radar_location_idx").on(t.lat, t.lng),
]);

// --- New tables for production ---

export const likes = pgTable("likes", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("likes_unique").on(t.postId, t.userId),
  index("likes_post_idx").on(t.postId),
  index("likes_user_idx").on(t.userId),
]);

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  authorId: text("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  authorName: text("author_name").notNull(),
  authorAvatar: text("author_avatar").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("comments_post_idx").on(t.postId),
  index("comments_author_idx").on(t.authorId),
]);

export const communityMembers = pgTable("community_members", {
  id: serial("id").primaryKey(),
  communityId: text("community_id").notNull().references(() => communities.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").default("member").notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("community_members_unique").on(t.communityId, t.userId),
  index("community_members_community_idx").on(t.communityId),
  index("community_members_user_idx").on(t.userId),
]);

export const bookings = pgTable("bookings", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: text("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => users.id),
  serviceName: text("service_name").notNull(),
  date: text("date").notNull(),
  timeSlot: text("time_slot").notNull(),
  notes: text("notes"),
  status: text("status").default("confirmed").notNull(),
  bookingRef: text("booking_ref").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("bookings_business_idx").on(t.businessId),
  index("bookings_user_idx").on(t.userId),
  index("bookings_ref_idx").on(t.bookingRef),
]);

export const escrowTransactions = pgTable("escrow_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  itemId: integer("item_id").notNull().references(() => marketplaceItems.id, { onDelete: "cascade" }),
  buyerId: text("buyer_id").references(() => users.id),
  sellerId: text("seller_id").references(() => users.id),
  amount: integer("amount").notNull(),
  currency: text("currency").default("KES").notNull(),
  status: text("status").default("held").notNull(), // held | delivered | released | disputed | cancelled
  paymentRail: text("payment_rail").default("mpesa").notNull(),
  escrowRef: text("escrow_ref").notNull().unique(),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("escrow_item_idx").on(t.itemId),
  index("escrow_buyer_idx").on(t.buyerId),
  index("escrow_status_idx").on(t.status),
  index("escrow_ref_idx").on(t.escrowRef),
]);

export const threads = pgTable("threads", {
  id: text("id").primaryKey(),
  title: text("title"),
  participants: jsonb("participants").$type<string[]>().default([]).notNull(),
  type: text("type").default("direct").notNull(), // direct | community | business | marketplace
  lastMessageAt: timestamp("last_message_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("threads_type_idx").on(t.type),
]);

export const jobApplications = pgTable("job_applications", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  applicantId: text("applicant_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: text("status").default("pending").notNull(),
  coverNote: text("cover_note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("job_applications_unique").on(t.jobId, t.applicantId),
  index("job_applications_job_idx").on(t.jobId),
  index("job_applications_applicant_idx").on(t.applicantId),
]);
