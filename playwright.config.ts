import fs from "node:fs";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

/**
 * Next.js loads `.env.local` for the server process; the Playwright runner is a
 * separate process, so mirror those values here. Already-exported variables win,
 * so `SEED_PASSWORD=x pnpm test:e2e` still overrides.
 */
function loadEnvLocal(): void {
  const file = path.join(__dirname, ".env.local");
  if (!fs.existsSync(file)) return;

  for (const raw of fs.readFileSync(file, "utf8").split("\n")) {
    const line = raw.replace(/^\s*export\s+/, "").trim();
    if (!line || line.startsWith("#")) continue;

    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match || process.env[match[1]] !== undefined) continue;

    process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
  }
}

loadEnvLocal();

export default defineConfig({
  testDir: "./e2e",
  // Tests within a file run in declaration order (files still run in parallel).
  // This matters for auth.spec.ts: its wrong-password case increments the login
  // throttle, and a later successful sign-in in the same run clears it. With
  // fullyParallel the two could be ordered either way, and enough reruns would
  // accumulate failures until the seeded account locked itself out.
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  // `list` for readable output; the HTML report is still written but never
  // auto-opened (`open: "never"`), which would block a headless run.
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    // Must be `localhost`: NEXTAUTH_URL is http://localhost:3000, and a cookie
    // minted for `localhost` is not sent to `127.0.0.1` (or vice versa).
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "pnpm dev --webpack",
    url: "http://localhost:3000/api/health",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
