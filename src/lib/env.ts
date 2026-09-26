import { z } from "zod";

/** Empty strings are how unset values arrive from `.env` files - treat them as absent. */
const clean = (v: string | undefined): string | undefined =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

const DEFAULT_DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:5432/kinara_db";

const envSchema = z.object({
  DATABASE_URL: z.string().startsWith("postgresql://").default(DEFAULT_DATABASE_URL),
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

export type Env = z.infer<typeof envSchema>;

function getEnv(): Env {
  const raw = {
    DATABASE_URL: clean(process.env.DATABASE_URL),
    NODE_ENV: process.env.NODE_ENV,
    OPENROUTER_API_KEY: clean(process.env.OPENROUTER_API_KEY),
    OPENAI_API_KEY: clean(process.env.OPENAI_API_KEY),
    AI_MODEL: process.env.AI_MODEL,
    NEXTAUTH_SECRET: clean(process.env.NEXTAUTH_SECRET),
    NEXTAUTH_URL: clean(process.env.NEXTAUTH_URL),
    UPSTASH_REDIS_REST_URL: clean(process.env.UPSTASH_REDIS_REST_URL),
    UPSTASH_REDIS_REST_TOKEN: clean(process.env.UPSTASH_REDIS_REST_TOKEN),
    SENTRY_DSN: clean(process.env.SENTRY_DSN),
    SEED_SECRET: clean(process.env.SEED_SECRET),
    NEXT_PUBLIC_MAPBOX_TOKEN: clean(process.env.NEXT_PUBLIC_MAPBOX_TOKEN),
  };

  const parsed = envSchema.safeParse(raw);

  if (parsed.success) return parsed.data;

  // Salvage every field that validates on its own and drop the ones that do not,
  // so a single bad optional value cannot blank the rest of the configuration.
  console.warn("⚠️ Env validation warnings:", parsed.error.flatten().fieldErrors);
  const { NEXTAUTH_URL, UPSTASH_REDIS_REST_URL, ...rest } = raw;
  const optionalUrl = (v: string | undefined) =>
    z.string().url().safeParse(v).success ? v : undefined;
  const nodeEnv =
    rest.NODE_ENV === "production" || rest.NODE_ENV === "test" ? rest.NODE_ENV : "development";

  return {
    ...rest,
    DATABASE_URL: rest.DATABASE_URL?.startsWith("postgresql://") ? rest.DATABASE_URL : DEFAULT_DATABASE_URL,
    NODE_ENV: nodeEnv,
    AI_MODEL: rest.AI_MODEL ?? "openai/gpt-4o-mini",
    NEXTAUTH_URL: optionalUrl(NEXTAUTH_URL),
    UPSTASH_REDIS_REST_URL: optionalUrl(UPSTASH_REDIS_REST_URL),
  };
}

export const env = getEnv();

// helper to check if AI is configured
export const hasAiKey = () => Boolean(env.OPENROUTER_API_KEY || env.OPENAI_API_KEY);
export const getAiProvider = () => {
  if (env.OPENROUTER_API_KEY) return "openrouter" as const;
  if (env.OPENAI_API_KEY) return "openai" as const;
  return "stub" as const;
};
