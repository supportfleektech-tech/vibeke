import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl =
  process.env.DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:5432/kinara_db";

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

const poolConfig = {
  connectionString: databaseUrl,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  // SSL for production (Neon/Supabase)
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : undefined,
  maxUses: 7500,
} as const;

export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  new Pool(poolConfig as any);

// Graceful error handling
pool.on("error", (err) => {
  console.error("Unexpected PG pool error:", err);
});

pool.on("connect", () => {
  if (process.env.NODE_ENV !== "production") {
    // console.log("PG pool connected");
  }
});

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = drizzle(pool);

// Health helper
export async function checkDbHealth() {
  const start = Date.now();
  await pool.query("SELECT 1");
  return Date.now() - start;
}
