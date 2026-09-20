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
	"services" text NOT NULL,
	"catalog_count" integer DEFAULT 12 NOT NULL,
	"monthly_transactions" integer DEFAULT 850 NOT NULL,
	"phone" text NOT NULL,
	"website" text NOT NULL
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
	"rules" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "communities_slug_unique" UNIQUE("slug")
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
	"tags" text NOT NULL,
	"posted_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "local_radar" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"name" text NOT NULL,
	"avatar" text NOT NULL,
	"city" text NOT NULL,
	"neighborhood" text NOT NULL,
	"lat" numeric(6, 4) NOT NULL,
	"lng" numeric(6, 4) NOT NULL,
	"distance" text NOT NULL,
	"details" text NOT NULL,
	"status" text NOT NULL
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
	"sender_name" text NOT NULL,
	"sender_avatar" text NOT NULL,
	"sender_role" text DEFAULT 'user' NOT NULL,
	"text" text NOT NULL,
	"timestamp" text NOT NULL,
	"is_me" boolean DEFAULT false NOT NULL,
	"type" text DEFAULT 'text' NOT NULL,
	"metadata" text
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
	"tags" text NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
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
	"skills" text NOT NULL,
	"achievements" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_handle_unique" UNIQUE("handle")
);
