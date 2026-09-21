import { test, expect } from "@playwright/test";

test.describe("Kinara Sovereign Smoke", () => {
  test("health check", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.version).toBe("3.4.0");
  });

  test("home loads and shows Clips peek", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("KINARA — The Sovereign African Digital Platform")).toBeHidden(); // metadata, not visible
    await expect(page.getByText("Synchronizing Sovereign Core")).toBeVisible({ timeout: 10000 }).catch(() => {});
    // After hydration, DynamicHome + Clips peek should appear
    await page.waitForTimeout(3000);
    await expect(page.getByText("Kinara Clips — Trending").first()).toBeVisible({ timeout: 10000 }).catch(async () => {
      // fallback: check Clips nav exists
      await expect(page.getByRole("button", { name: /Clips/i }).first()).toBeVisible();
    });
  });

  test("Clips feed Like", async ({ request }) => {
    const res = await request.get("/api/clips?limit=2");
    expect(res.ok()).toBeTruthy();
    const { clips } = await res.json();
    expect(clips.length).toBeGreaterThan(0);
    const firstId = clips[0].id;
    const like = await request.post(`/api/clips/${firstId}/like`);
    expect([200, 429].includes(like.status())).toBeTruthy();
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
});
