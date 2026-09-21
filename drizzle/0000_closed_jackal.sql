CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" text NOT NULL,
	"user_id" text,
	"service_name" text NOT NULL,
	"date" text NOT NULL,
	"time_slot" text NOT NULL,
	"notes" text,
	"status" text DEFAULT 'confirmed' NOT NULL,
	"booking_ref" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_booking_ref_unique" UNIQUE("booking_ref")
);
--> statement-breakpoint
CREATE TABLE "businesses" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"banner" text NOT NULL,
	"avatar" text NOT NULL,
	"headline" text NOT NULL,
	"bio" text NOT NULL,
	"city" text NOT NULL,
	"neighborhood" text NOT NULL,
	"rating" numeric(3, 2) DEFAULT '4.95' NOT NULL,
	"reviews_count" integer DEFAULT 120 NOT NULL,
	"verified" boolean DEFAULT true NOT NULL,
	"open_hours" text NOT NULL,
	"services" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"catalog_count" integer DEFAULT 12 NOT NULL,
	"monthly_transactions" integer DEFAULT 850 NOT NULL,
	"phone" text NOT NULL,
	"website" text NOT NULL,
	"owner_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"author_id" text NOT NULL,
	"author_name" text NOT NULL,
	"author_avatar" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "communities" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"tagline" text NOT NULL,
	"description" text NOT NULL,
	"avatar" text NOT NULL,
	"banner" text NOT NULL,
	"category" text NOT NULL,
	"members_count" integer DEFAULT 100 NOT NULL,
	"active_voice" boolean DEFAULT false NOT NULL,
	"voice_speakers_count" integer DEFAULT 0 NOT NULL,
	"voice_room_topic" text,
	"city" text DEFAULT 'Pan-African' NOT NULL,
	"rules" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "communities_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "community_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"community_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "escrow_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" integer NOT NULL,
	"buyer_id" text,
	"seller_id" text,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'KES' NOT NULL,
	"status" text DEFAULT 'held' NOT NULL,
	"payment_rail" text DEFAULT 'mpesa' NOT NULL,
	"escrow_ref" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "escrow_transactions_escrow_ref_unique" UNIQUE("escrow_ref")
);
--> statement-breakpoint
CREATE TABLE "job_applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"applicant_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"cover_note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"company" text NOT NULL,
	"company_logo" text NOT NULL,
	"location" text NOT NULL,
	"type" text NOT NULL,
	"salary" text NOT NULL,
	"category" text NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"posted_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "likes" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "local_radar" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"name" text NOT NULL,
	"avatar" text NOT NULL,
	"city" text NOT NULL,
	"neighborhood" text NOT NULL,
	"lat" numeric(10, 7) NOT NULL,
	"lng" numeric(10, 7) NOT NULL,
	"distance" text NOT NULL,
	"distance_km" numeric(5, 2),
	"details" text NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"price" integer NOT NULL,
	"currency" text DEFAULT 'KES' NOT NULL,
	"category" text NOT NULL,
	"image" text NOT NULL,
	"seller_id" text,
	"seller_name" text NOT NULL,
	"seller_avatar" text NOT NULL,
	"seller_trust_score" integer DEFAULT 96 NOT NULL,
	"seller_verified" boolean DEFAULT true NOT NULL,
	"city" text NOT NULL,
	"neighborhood" text NOT NULL,
	"distance_km" numeric(3, 1) NOT NULL,
	"delivery_speed" text NOT NULL,
	"ai_price_estimate" text NOT NULL,
	"escrow_secured" boolean DEFAULT true NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"rating" numeric(3, 2) DEFAULT '4.9' NOT NULL,
	"reviews_count" integer DEFAULT 24 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"thread_id" text NOT NULL,
	"sender_id" text,
	"sender_name" text NOT NULL,
	"sender_avatar" text NOT NULL,
	"sender_role" text DEFAULT 'user' NOT NULL,
	"text" text NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"is_me" boolean DEFAULT false NOT NULL,
	"type" text DEFAULT 'text' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"author_id" text NOT NULL,
	"author_name" text NOT NULL,
	"author_handle" text NOT NULL,
	"author_avatar" text NOT NULL,
	"author_trust" integer DEFAULT 95 NOT NULL,
	"author_verified" boolean DEFAULT true NOT NULL,
	"content" text NOT NULL,
	"category" text DEFAULT 'trending' NOT NULL,
	"city" text DEFAULT 'Nairobi' NOT NULL,
	"likes" integer DEFAULT 0 NOT NULL,
	"comments_count" integer DEFAULT 0 NOT NULL,
	"shares_count" integer DEFAULT 0 NOT NULL,
	"media_url" text,
	"media_type" text DEFAULT 'text' NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "threads" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text,
	"participants" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"type" text DEFAULT 'direct' NOT NULL,
	"last_message_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"handle" text NOT NULL,
	"avatar" text NOT NULL,
	"cover" text NOT NULL,
	"bio" text NOT NULL,
	"role" text DEFAULT 'citizen' NOT NULL,
	"location" text NOT NULL,
	"trust_score" integer DEFAULT 95 NOT NULL,
	"verified" boolean DEFAULT true NOT NULL,
	"verification_type" text DEFAULT 'Biometric & Escrow Certified' NOT NULL,
	"followers_count" integer DEFAULT 1240 NOT NULL,
	"following_count" integer DEFAULT 480 NOT NULL,
	"marketplace_rating" numeric(3, 2) DEFAULT '4.95' NOT NULL,
	"skills" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"achievements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"preferences" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_handle_unique" UNIQUE("handle")
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communities" ADD CONSTRAINT "communities_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_members" ADD CONSTRAINT "community_members_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_members" ADD CONSTRAINT "community_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escrow_transactions" ADD CONSTRAINT "escrow_transactions_item_id_marketplace_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."marketplace_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escrow_transactions" ADD CONSTRAINT "escrow_transactions_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escrow_transactions" ADD CONSTRAINT "escrow_transactions_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_applicant_id_users_id_fk" FOREIGN KEY ("applicant_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "likes" ADD CONSTRAINT "likes_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "likes" ADD CONSTRAINT "likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_items" ADD CONSTRAINT "marketplace_items_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bookings_business_idx" ON "bookings" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "bookings_user_idx" ON "bookings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "bookings_ref_idx" ON "bookings" USING btree ("booking_ref");--> statement-breakpoint
CREATE INDEX "businesses_city_idx" ON "businesses" USING btree ("city");--> statement-breakpoint
CREATE INDEX "businesses_category_idx" ON "businesses" USING btree ("category");--> statement-breakpoint
CREATE INDEX "businesses_verified_idx" ON "businesses" USING btree ("verified");--> statement-breakpoint
CREATE INDEX "comments_post_idx" ON "comments" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "comments_author_idx" ON "comments" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "communities_category_idx" ON "communities" USING btree ("category");--> statement-breakpoint
CREATE INDEX "communities_active_voice_idx" ON "communities" USING btree ("active_voice");--> statement-breakpoint
CREATE INDEX "communities_city_idx" ON "communities" USING btree ("city");--> statement-breakpoint
CREATE UNIQUE INDEX "community_members_unique" ON "community_members" USING btree ("community_id","user_id");--> statement-breakpoint
CREATE INDEX "community_members_community_idx" ON "community_members" USING btree ("community_id");--> statement-breakpoint
CREATE INDEX "community_members_user_idx" ON "community_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "escrow_item_idx" ON "escrow_transactions" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "escrow_buyer_idx" ON "escrow_transactions" USING btree ("buyer_id");--> statement-breakpoint
CREATE INDEX "escrow_status_idx" ON "escrow_transactions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "escrow_ref_idx" ON "escrow_transactions" USING btree ("escrow_ref");--> statement-breakpoint
CREATE UNIQUE INDEX "job_applications_unique" ON "job_applications" USING btree ("job_id","applicant_id");--> statement-breakpoint
CREATE INDEX "job_applications_job_idx" ON "job_applications" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "job_applications_applicant_idx" ON "job_applications" USING btree ("applicant_id");--> statement-breakpoint
CREATE INDEX "jobs_category_idx" ON "jobs" USING btree ("category");--> statement-breakpoint
CREATE INDEX "jobs_location_idx" ON "jobs" USING btree ("location");--> statement-breakpoint
CREATE INDEX "jobs_posted_idx" ON "jobs" USING btree ("posted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "likes_unique" ON "likes" USING btree ("post_id","user_id");--> statement-breakpoint
CREATE INDEX "likes_post_idx" ON "likes" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "likes_user_idx" ON "likes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "radar_type_idx" ON "local_radar" USING btree ("type");--> statement-breakpoint
CREATE INDEX "radar_city_idx" ON "local_radar" USING btree ("city");--> statement-breakpoint
CREATE INDEX "radar_location_idx" ON "local_radar" USING btree ("lat","lng");--> statement-breakpoint
CREATE INDEX "marketplace_category_idx" ON "marketplace_items" USING btree ("category");--> statement-breakpoint
CREATE INDEX "marketplace_city_idx" ON "marketplace_items" USING btree ("city");--> statement-breakpoint
CREATE INDEX "marketplace_featured_idx" ON "marketplace_items" USING btree ("featured");--> statement-breakpoint
CREATE INDEX "marketplace_price_idx" ON "marketplace_items" USING btree ("price");--> statement-breakpoint
CREATE INDEX "marketplace_seller_idx" ON "marketplace_items" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX "messages_thread_idx" ON "messages" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "messages_sender_idx" ON "messages" USING btree ("sender_id");--> statement-breakpoint
CREATE INDEX "messages_created_idx" ON "messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "posts_category_idx" ON "posts" USING btree ("category");--> statement-breakpoint
CREATE INDEX "posts_city_idx" ON "posts" USING btree ("city");--> statement-breakpoint
CREATE INDEX "posts_pinned_idx" ON "posts" USING btree ("pinned");--> statement-breakpoint
CREATE INDEX "posts_created_idx" ON "posts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "posts_author_idx" ON "posts" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "threads_type_idx" ON "threads" USING btree ("type");--> statement-breakpoint
CREATE INDEX "users_location_idx" ON "users" USING btree ("location");--> statement-breakpoint
CREATE INDEX "users_trust_idx" ON "users" USING btree ("trust_score");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");