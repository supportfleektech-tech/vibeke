import { test, expect, Page } from "@playwright/test";

/**
 * Credentials sign-in and the authorization boundaries behind it.
 *
 * Runs against a migrated + seeded database (`pnpm db:migrate` then POST /api/seed).
 * Seeded demo account: handle `brianmwangi`, password from SEED_PASSWORD.
 *
 * The wrong-password case runs before the successful one so its failure is counted
 * and then cleared by the success — otherwise repeated runs would accumulate toward
 * the login throttle's per-handle limit.
 */

const SEED_PASSWORD = process.env.SEED_PASSWORD ?? "";

test.describe("Kinara sign-in", () => {
  test("sign-in page renders", async ({ page }) => {
    await page.goto("/signin");
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
    await expect(page.getByPlaceholder("brianmwangi")).toBeVisible();
  });

  test("wrong password stays put and reports a generic error", async ({ page, context }) => {
    await page.goto("/signin");
    await page.getByPlaceholder("brianmwangi").fill("brianmwangi");
    await page.getByPlaceholder("••••••••").fill("definitely-not-the-password");
    await page.getByRole("button", { name: "Sign in" }).click();

    // Generic on purpose: it must not distinguish "bad handle" from "bad password".
    await expect(page.getByText("Invalid handle or password.")).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/signin/);

    // Auth.js always sets a CSRF cookie during the handshake — that one is expected.
    // What must not exist after a failed attempt is a session cookie.
    const cookies = await context.cookies();
    expect(cookies.filter((c) => c.name.includes("session-token"))).toHaveLength(0);
  });

  test("valid credentials reach the feed", async ({ page }) => {
    await signIn(page);

    // Session cookie present and /api/user agrees about who we are.
    const res = await page.request.get("/api/user");
    expect(res.ok()).toBeTruthy();
    const { user } = await res.json();
    expect(user.handle).toBe("brianmwangi");

    // The signed-in shell renders the modules the anonymous visitor never sees.
    await expect(page.getByText("Kinara Clips — Trending")).toBeVisible({ timeout: 20_000 });
  });
});

test.describe("Kinara authorization boundaries", () => {
  test("citizen cannot reach admin endpoints", async ({ page }) => {
    await signIn(page);

    expect((await page.request.get("/api/admin/stats")).status()).toBe(403);
    expect((await page.request.get("/api/reports")).status()).toBe(403);
  });

  test("self-PATCH cannot grant the admin role", async ({ page }) => {
    await signIn(page);

    const patch = await page.request.patch("/api/user", {
      data: { role: "admin" },
    });
    expect(patch.status()).toBe(400);

    const after = await page.request.get("/api/user");
    const { user } = await after.json();
    expect(user.role).toBe("citizen");
  });

  test("seeded admin can reach admin endpoints", async ({ page }) => {
    await signIn(page, "kinara_admin");

    expect((await page.request.get("/api/admin/stats")).status()).toBe(200);
    expect((await page.request.get("/api/reports")).status()).toBe(200);
  });
});

async function signIn(page: Page, handle = "brianmwangi"): Promise<void> {
  if (!SEED_PASSWORD) {
    throw new Error("SEED_PASSWORD must be set — the seeded accounts have no credential without it.");
  }

  await page.goto("/signin");
  await page.getByPlaceholder("brianmwangi").fill(handle);
  await page.getByPlaceholder("••••••••").fill(SEED_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page, `${handle} should have been signed in`).toHaveURL(/\/$/, { timeout: 15_000 });
}
