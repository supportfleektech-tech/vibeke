import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:5432/kinara_db",
  },
  verbose: true,
  strict: true,
});
