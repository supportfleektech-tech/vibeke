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
  role: personaEnum.optional(),
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
