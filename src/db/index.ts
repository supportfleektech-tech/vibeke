import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl =
  process.env.DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:5432/kinara_db";

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

/** Hostnames that never present a certificate - local Docker / the compose `db` service. */
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "db"]);

/**
 * Decide whether to open the connection with TLS.
 *
 * Returning `undefined` hands control entirely to `pg`, which reads `sslmode=` from
 * the connection string when present.
 */
function resolveSsl(connString: string): { rejectUnauthorized: boolean } | undefined {
  let url: URL;
  try {
    url = new URL(connString);
  } catch {
    return undefined;
  }

  // 1. Explicit wins - `?sslmode=require` / `verify-full` etc. are parsed by pg.
  if (url.searchParams.has("sslmode")) return undefined;

  // 2. Local databases speak plain protocol.
  if (LOCAL_HOSTS.has(url.hostname)) return undefined;

  // 3. Managed remote databases require TLS. Certificate verification stays off to
  //    preserve existing behaviour for providers with custom CAs; tighten with
  //    `?sslmode=verify-full` when your provider publishes its CA bundle.
  return { rejectUnauthorized: false };
}

const poolConfig = {
  connectionString: databaseUrl,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  // TLS policy.
  //
  // Previously this was `NODE_ENV === "production" ? { rejectUnauthorized: false }`,
  // which forced an SSL handshake against *every* server in production - including
  // the plain `postgres:16-alpine` in docker-compose.yml (ssl = off by default) and
  // the CI service container. The result was "server does not support SSL
  // connections" and an app that could never reach its own database.
  //
  // Correct order of precedence:
  //   1. an explicit `sslmode=` in DATABASE_URL wins (pg parses it itself)
  //   2. loopback / compose-internal hosts stay plain (they are not TLS-terminating)
  //   3. anything else is a managed remote DB (Neon/Supabase) -> require TLS
  ssl: resolveSsl(databaseUrl),
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
