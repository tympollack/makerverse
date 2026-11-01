// lib/db/__tests__/seed_brands.test.ts
import { describe, it, expect, vi } from "vitest";
import { ALL_BRANDS, PRODUCTS } from "@/lib/mock/shopData";
import { seedMakerverseDatabase } from "@/lib/db/seed";
import * as serverModule from "@/lib/supabase/server";

describe("Database Seed Distinct Product Lines (Issue 4)", () => {
  it("allocates a stable distinct product-line ID per brand and associates products to their respective brand", async () => {
    const upsertProductLines = vi.fn().mockResolvedValue({ error: null });
    const upsertProducts = vi.fn().mockResolvedValue({ error: null });
    const upsertBrands = vi.fn().mockResolvedValue({ error: null });
    const upsertInstallations = vi.fn().mockResolvedValue({ error: null });

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === "brands") {
          return { upsert: upsertBrands };
        }
        if (table === "product_lines") {
          return { upsert: upsertProductLines };
        }
        if (table === "products") {
          return { upsert: upsertProducts };
        }
        if (table === "booth_installations") {
          return { upsert: upsertInstallations };
        }
        return { upsert: vi.fn().mockResolvedValue({ error: null }) };
      }),
    };

    const spy = vi.spyOn(serverModule, "getSupabaseServiceRoleClient").mockReturnValue(mockSupabase as any);

    const result = await seedMakerverseDatabase();
    expect(result.success).toBe(true);

    // Verify product_lines upsert was called with distinct IDs per brand
    const productLineCalls = upsertProductLines.mock.calls.map((c) => c[0]);
    const lineIds = new Set(productLineCalls.map((line) => line.id));
    const brandIds = new Set(productLineCalls.map((line) => line.brand_id));

    // Each brand must have its own distinct product line
    expect(productLineCalls.length).toBe(ALL_BRANDS.length);
    expect(lineIds.size).toBe(ALL_BRANDS.length);
    expect(brandIds.size).toBe(ALL_BRANDS.length);

    // Verify products link to the line corresponding to their brand
    const productCalls = upsertProducts.mock.calls.map((c) => c[0]);
    expect(productCalls.length).toBe(PRODUCTS.length);

    // Product lines used across products must not all be the same line
    const usedProductLineIds = new Set(productCalls.map((p) => p.product_line_id));
    expect(usedProductLineIds.size).toBeGreaterThanOrEqual(ALL_BRANDS.length);

    spy.mockRestore();
  });
});
