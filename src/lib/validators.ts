import { z } from "zod";

export const personaEnum = z.enum(["citizen", "creator", "business", "student", "buyer"]);
export const categoryEnum = z.enum(["trending", "innovation", "culture", "business", "all"]);
export const cityEnum = z.enum(["Nairobi", "Lagos", "Kigali", "Accra", "Cape Town", "Addis Ababa", "Pan-African", "all"]);

export const postCreateSchema = z.object({
  content: z.string().min(1, "Content required").max(2000, "Max 2000 chars").trim(),
  category: z.string().min(1).max(50).default("trending"),
  city: z.string().min(1).max(50).default("Nairobi"),
  mediaUrl: z.string().url().optional().or(z.literal("")).nullable(),
  mediaType: z.enum(["text", "image", "video"]).default("text"),
  tags: z.array(z.string().max(30)).max(10).optional().default([]),
  pinned: z.boolean().optional().default(false),
});

export const userPatchSchema = z.object({
  bio: z.string().max(500).optional(),
  // `role` is intentionally absent: it decides admin/moderator privileges, so it must
  // never be settable from an authenticated-but-unprivileged request body.
  location: z.string().max(100).optional(),
  name: z.string().max(100).optional(),
});

export const aiSchema = z.object({
  action: z.enum(["rewrite", "summarize", "translate", "sheng", "professional", "pitch", "continue", "emojis", "price_check", "copilot"]),
  text: z.string().max(5000).optional().default(""),
  context: z.any().optional(),
  targetLanguage: z.string().max(20).optional(),
});

export const marketplaceCreateSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().min(10).max(2000),
  price: z.coerce.number().int().positive().max(10_000_000),
  category: z.string().min(1).max(50),
  image: z.string().url().optional(),
  city: z.string().min(1).max(50).default("Nairobi"),
  neighborhood: z.string().min(1).max(100).default("Kilimani"),
  currency: z.string().max(10).default("KES"),
});

export const bookingSchema = z.object({
  serviceName: z.string().min(1).max(200),
  date: z.string().min(1).max(50),
  timeSlot: z.string().min(1).max(50),
  notes: z.string().max(500).optional(),
});

export const offerSchema = z.object({
  offerPrice: z.coerce.number().int().positive().optional(),
  note: z.string().max(500).optional(),
  paymentRail: z.enum(["mpesa", "momo", "card", "bank"]).optional().default("mpesa"),
});

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.coerce.number().int().min(0).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const clipCreateSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().min(3).max(500),
  videoUrl: z.string().url(),
  thumbnailUrl: z.string().url(),
  sound: z.string().max(100).optional().default("Original • Kinara"),
  soundTitle: z.string().max(100).optional().default("Original sound"),
  durationSec: z.coerce.number().int().min(1).max(180).default(15),
  hashtags: z.array(z.string().max(30)).max(10).optional().default([]),
  city: z.string().max(50).optional().default("Nairobi"),
  featured: z.boolean().optional().default(false),
});

export const storyCreateSchema = z.object({
  mediaUrl: z.string().url(),
  mediaType: z.enum(["image", "video"]).default("image"),
  caption: z.string().max(200).optional().default(""),
  durationHours: z.coerce.number().int().min(1).max(24).default(24),
});

export const liveCreateSchema = z.object({
  title: z.string().min(3).max(100),
  category: z.string().min(1).max(50).default("General"),
  description: z.string().max(500).optional().default(""),
  thumbnail: z.string().url(),
});

export const eventCreateSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().min(10).max(500),
  banner: z.string().url(),
  location: z.string().min(1).max(100),
  city: z.string().min(1).max(50),
  category: z.string().max(50).default("Tech"),
  startAt: z.string().datetime().or(z.string().min(1)),
  endAt: z.string().datetime().or(z.string().min(1)),
  maxAttendees: z.coerce.number().int().min(1).max(10000).default(100),
  price: z.coerce.number().int().min(0).default(0),
}).refine((d) => new Date(d.endAt) > new Date(d.startAt), { message: "endAt must be after startAt", path: ["endAt"] });
