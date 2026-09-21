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

// --- ALL-IN-ONE: TikTok Clips, Stories, Live, Hashtags, Notifications, Bookmarks, Events ---

export const clips = pgTable("clips", {
  id: serial("id").primaryKey(),
  authorId: text("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  authorName: text("author_name").notNull(),
  authorHandle: text("author_handle").notNull(),
  authorAvatar: text("author_avatar").notNull(),
  authorVerified: boolean("author_verified").default(true).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  videoUrl: text("video_url").notNull(),
  thumbnailUrl: text("thumbnail_url").notNull(),
  sound: text("sound").default("Original • Kinara").notNull(),
  soundTitle: text("sound_title").default("Original sound").notNull(),
  durationSec: integer("duration_sec").default(15).notNull(),
  likes: integer("likes").default(0).notNull(),
  commentsCount: integer("comments_count").default(0).notNull(),
  sharesCount: integer("shares_count").default(0).notNull(),
  bookmarksCount: integer("bookmarks_count").default(0).notNull(),
  views: integer("views").default(0).notNull(),
  hashtags: jsonb("hashtags").$type<string[]>().default([]).notNull(),
  city: text("city").default("Nairobi").notNull(),
  featured: boolean("featured").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("clips_author_idx").on(t.authorId),
  index("clips_city_idx").on(t.city),
  index("clips_featured_idx").on(t.featured),
  index("clips_created_idx").on(t.createdAt),
  index("clips_likes_idx").on(t.likes),
]);

export const clipLikes = pgTable("clip_likes", {
  id: serial("id").primaryKey(),
  clipId: integer("clip_id").notNull().references(() => clips.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("clip_likes_unique").on(t.clipId, t.userId),
  index("clip_likes_clip_idx").on(t.clipId),
]);

export const clipComments = pgTable("clip_comments", {
  id: serial("id").primaryKey(),
  clipId: integer("clip_id").notNull().references(() => clips.id, { onDelete: "cascade" }),
  authorId: text("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  authorName: text("author_name").notNull(),
  authorAvatar: text("author_avatar").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("clip_comments_clip_idx").on(t.clipId),
]);

export const stories = pgTable("stories", {
  id: serial("id").primaryKey(),
  authorId: text("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  authorName: text("author_name").notNull(),
  authorHandle: text("author_handle").notNull(),
  authorAvatar: text("author_avatar").notNull(),
  mediaUrl: text("media_url").notNull(),
  mediaType: text("media_type").default("image").notNull(), // image | video
  caption: text("caption").default("").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  viewedBy: jsonb("viewed_by").$type<string[]>().default([]).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("stories_author_idx").on(t.authorId),
  index("stories_expires_idx").on(t.expiresAt),
]);

export const lives = pgTable("lives", {
  id: uuid("id").primaryKey().defaultRandom(),
  hostId: text("host_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  hostName: text("host_name").notNull(),
  hostHandle: text("host_handle").notNull(),
  hostAvatar: text("host_avatar").notNull(),
  title: text("title").notNull(),
  category: text("category").default("General").notNull(),
  description: text("description").default("").notNull(),
  thumbnail: text("thumbnail").notNull(),
  status: text("status").default("live").notNull(), // live | ended
  viewersCount: integer("viewers_count").default(0).notNull(),
  likes: integer("likes").default(0).notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
}, (t) => [
  index("lives_host_idx").on(t.hostId),
  index("lives_status_idx").on(t.status),
  index("lives_started_idx").on(t.startedAt),
]);

export const hashtags = pgTable("hashtags", {
  tag: text("tag").primaryKey(),
  count: integer("count").default(0).notNull(),
  trendingScore: integer("trending_score").default(0).notNull(),
  category: text("category").default("general").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("hashtags_trending_idx").on(t.trendingScore),
]);

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  actorId: text("actor_id").references(() => users.id),
  actorName: text("actor_name").notNull(),
  actorAvatar: text("actor_avatar").notNull(),
  type: text("type").notNull(), // like | comment | follow | mention | escrow | live | clip | story | job | system
  entityType: text("entity_type").default("post").notNull(), // post | clip | story | live | job | marketplace
  entityId: text("entity_id").notNull(),
  message: text("message").notNull(),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("notifications_user_idx").on(t.userId),
  index("notifications_read_idx").on(t.read),
  index("notifications_created_idx").on(t.createdAt),
]);

export const bookmarks = pgTable("bookmarks", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  entityType: text("entity_type").notNull(), // post | clip | marketplace | job
  entityId: text("entity_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("bookmarks_unique").on(t.userId, t.entityType, t.entityId),
  index("bookmarks_user_idx").on(t.userId),
  index("bookmarks_entity_idx").on(t.entityType, t.entityId),
]);

export const events = pgTable("events", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  banner: text("banner").notNull(),
  location: text("location").notNull(),
  city: text("city").notNull(),
  category: text("category").default("Tech").notNull(),
  startAt: timestamp("start_at").notNull(),
  endAt: timestamp("end_at").notNull(),
  organizerId: text("organizer_id").references(() => users.id),
  attendeesCount: integer("attendees_count").default(0).notNull(),
  maxAttendees: integer("max_attendees").default(100).notNull(),
  price: integer("price").default(0).notNull(), // 0 = free
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("events_city_idx").on(t.city),
  index("events_start_idx").on(t.startAt),
  index("events_category_idx").on(t.category),
]);

export const follows = pgTable("follows", {
  id: serial("id").primaryKey(),
  followerId: text("follower_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  followingId: text("following_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("follows_unique").on(t.followerId, t.followingId),
  index("follows_follower_idx").on(t.followerId),
  index("follows_following_idx").on(t.followingId),
]);

export const hashtagFollows = pgTable("hashtag_follows", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tag: text("tag").notNull().references(() => hashtags.tag, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("hashtag_follows_unique").on(t.userId, t.tag),
]);

export const polls = pgTable("polls", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").references(() => posts.id, { onDelete: "cascade" }),
  clipId: integer("clip_id").references(() => clips.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  options: jsonb("options").$type<string[]>().notNull(),
  votes: jsonb("votes").$type<number[]>().default([0,0,0,0]).notNull(),
  votedBy: jsonb("voted_by").$type<string[]>().default([]).notNull(),
  createdBy: text("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("polls_post_idx").on(t.postId),
  index("polls_clip_idx").on(t.clipId),
]);

export const wikiPages = pgTable("wiki_pages", {
  id: text("id").primaryKey(),
  communityId: text("community_id").notNull().references(() => communities.id, { onDelete: "cascade" }),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  version: integer("version").default(1).notNull(),
  authorId: text("author_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("wiki_community_slug_unique").on(t.communityId, t.slug),
  index("wiki_community_idx").on(t.communityId),
]);

export const courses = pgTable("courses", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  banner: text("banner").notNull(),
  category: text("category").default("Tech").notNull(),
  price: integer("price").default(0).notNull(),
  lessons: jsonb("lessons").$type<{ title: string; duration: string; videoUrl: string }[]>().default([]).notNull(),
  instructorId: text("instructor_id").references(() => users.id),
  enrolledCount: integer("enrolled_count").default(0).notNull(),
  rating: numeric("rating", { precision: 3, scale: 2 }).default("4.8").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("courses_category_idx").on(t.category),
  index("courses_instructor_idx").on(t.instructorId),
]);

export const enrollments = pgTable("enrollments", {
  id: serial("id").primaryKey(),
  courseId: text("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  progress: integer("progress").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("enrollments_unique").on(t.courseId, t.userId),
]);

export const sounds = pgTable("sounds", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  artist: text("artist").notNull(),
  cover: text("cover").notNull(),
  audioUrl: text("audio_url").notNull(),
  durationSec: integer("duration_sec").default(15).notNull(),
  usesCount: integer("uses_count").default(0).notNull(),
  category: text("category").default("Afrobeats").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("sounds_category_idx").on(t.category),
  index("sounds_uses_idx").on(t.usesCount),
]);

export const challenges = pgTable("challenges", {
  id: text("id").primaryKey(),
  tag: text("tag").notNull().references(() => hashtags.tag),
  title: text("title").notNull(),
  banner: text("banner").notNull(),
  description: text("description").notNull(),
  prize: text("prize").default("Featured on KINARA").notNull(),
  endsAt: timestamp("ends_at").notNull(),
  participantsCount: integer("participants_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("challenges_tag_idx").on(t.tag),
  index("challenges_ends_idx").on(t.endsAt),
]);

export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  reporterId: text("reporter_id").notNull().references(() => users.id),
  entityType: text("entity_type").notNull(), // post | clip | user | community | comment
  entityId: text("entity_id").notNull(),
  reason: text("reason").notNull(),
  details: text("details").default("").notNull(),
  status: text("status").default("pending").notNull(), // pending | reviewed | actioned | dismissed
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("reports_status_idx").on(t.status),
  index("reports_entity_idx").on(t.entityType, t.entityId),
]);
