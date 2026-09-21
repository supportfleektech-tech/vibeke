import { describe, it, expect } from "vitest";
import { postCreateSchema, marketplaceCreateSchema, bookingSchema, aiSchema } from "./validators";

describe("validators", () => {
  it("postCreateSchema validates content", () => {
    const ok = postCreateSchema.safeParse({ content: "Hello Kinara", category: "trending", city: "Nairobi" });
    expect(ok.success).toBe(true);
    const bad = postCreateSchema.safeParse({ content: "", category: "trending" });
    expect(bad.success).toBe(false);
    const long = postCreateSchema.safeParse({ content: "a".repeat(2001) });
    expect(long.success).toBe(false);
  });

  it("marketplaceCreateSchema validates price", () => {
    const ok = marketplaceCreateSchema.safeParse({ title: "Test Item", description: "Long enough description for marketplace item", price: 1000, category: "Craft" });
    expect(ok.success).toBe(true);
    const bad = marketplaceCreateSchema.safeParse({ title: "ab", description: "short", price: -5, category: "" });
    expect(bad.success).toBe(false);
  });

  it("bookingSchema validates slots", () => {
    const ok = bookingSchema.safeParse({ serviceName: "Day Pass", date: "2026-09-22", timeSlot: "10:00 AM" });
    expect(ok.success).toBe(true);
    const bad = bookingSchema.safeParse({ serviceName: "", date: "", timeSlot: "" });
    expect(bad.success).toBe(false);
  });

  it("aiSchema validates action enum", () => {
    const ok = aiSchema.safeParse({ action: "rewrite", text: "hello" });
    expect(ok.success).toBe(true);
    const bad = aiSchema.safeParse({ action: "invalid" as any, text: "hello" });
    expect(bad.success).toBe(false);
  });
});
