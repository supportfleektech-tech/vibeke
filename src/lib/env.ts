import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url().or(z.string().startsWith("postgresql://")),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  // AI - OpenRouter / OpenAI - optional, falls back to stubs if missing
  OPENROUTER_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().default("openai/gpt-4o-mini"),
  // Auth
  NEXTAUTH_SECRET: z.string().optional(),
  NEXTAUTH_URL: z.string().url().optional(),
  // Rate-limit / Redis (optional - in-memory fallback)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  // Sentry
  SENTRY_DSN: z.string().optional(),
  // Seed protection
  SEED_SECRET: z.string().optional(),
  // Map - Leaflet/OSM needs no key; Mapbox optional
  NEXT_PUBLIC_MAPBOX_TOKEN: z.string().optional(),
});

function getEnv() {
  const parsed = envSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    AI_MODEL: process.env.AI_MODEL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    SENTRY_DSN: process.env.SENTRY_DSN,
    SEED_SECRET: process.env.SEED_SECRET,
    NEXT_PUBLIC_MAPBOX_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
  });

  if (!parsed.success) {
    console.warn("⚠️ Env validation warnings:", parsed.error.flatten().fieldErrors);
    // Don't throw in dev - allow stubs
    return {
      DATABASE_URL: process.env.DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:5432/kinara_db",
      NODE_ENV: (process.env.NODE_ENV as any) || "development",
      OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      AI_MODEL: process.env.AI_MODEL || "openai/gpt-4o-mini",
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
      UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
      SENTRY_DSN: process.env.SENTRY_DSN,
      SEED_SECRET: process.env.SEED_SECRET,
      NEXT_PUBLIC_MAPBOX_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
    };
  }
  return parsed.data;
}

export const env = getEnv();

// helper to check if AI is configured
export const hasAiKey = () => Boolean(env.OPENROUTER_API_KEY || env.OPENAI_API_KEY);
export const getAiProvider = () => {
  if (env.OPENROUTER_API_KEY) return "openrouter" as const;
  if (env.OPENAI_API_KEY) return "openai" as const;
  return "stub" as const;
};
