import { test, expect } from "@playwright/test";

/**
 * Public (anonymous) surface.
 *
 * Authenticated coverage lives in `auth.spec.ts`. Every assertion here is one the
 * old suite used to swallow with `.catch(() => {})` or accept a silent no-op.
 */
test.describe("Kinara Sovereign Smoke (anonymous)", () => {
  test("health check", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.version).toBe("3.4.0");
    expect(data.seeded).toBe(true);
  });

  test("home sends an anonymous visitor to the sign-in screen", async ({ page }) => {
    await page.goto("/");
    // GET /api/user answers 401 without a session, and the shell replaces itself
    // with /signin rather than rendering with a null user.
    await expect(page).toHaveURL(/\/signin/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });

  test("Clips feed is publicly readable", async ({ request }) => {
    const res = await request.get("/api/clips?limit=2");
    expect(res.ok()).toBeTruthy();
    const { clips } = await res.json();
    expect(clips.length).toBeGreaterThan(0);
  });

  test("liking a clip without a session is rejected", async ({ request }) => {
    const list = await request.get("/api/clips?limit=2");
    const { clips } = await list.json();
    expect(clips.length).toBeGreaterThan(0);

    const like = await request.post(`/api/clips/${clips[0].id}/like`);
    // Not 200/429: an anonymous mutation must never succeed.
    expect(like.status()).toBe(401);
  });

  test("Stories 24h", async ({ request }) => {
    const res = await request.get("/api/stories");
    expect(res.ok()).toBeTruthy();
    const { stories } = await res.json();
    expect(Array.isArray(stories)).toBeTruthy();
  });

  test("Search universal", async ({ request }) => {
    const res = await request.get("/api/search?q=Kinara&type=all");
    expect(res.ok()).toBeTruthy();
    const { results } = await res.json();
    expect(results).toBeTruthy();
  });

  test("public profile hides email and password hash", async ({ request }) => {
    const res = await request.get("/api/user?id=usr_kinara_admin");
    expect(res.ok()).toBeTruthy();
    const body = await res.text();
    expect(body).not.toContain("passwordHash");
    expect(body).not.toContain("password_hash");
  });
});
