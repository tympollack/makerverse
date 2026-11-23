// app/api/__tests__/pr15_review_fixes.test.tsx
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextRequest } from "next/server";

const mockGetServiceRoleClient = vi.fn();
const mockGetServerClient = vi.fn();
const mockGetBrowserClient = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServiceRoleClient: () => mockGetServiceRoleClient(),
  getSupabaseServerClient: () => mockGetServerClient(),
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseBrowserClient: () => mockGetBrowserClient(),
  isSupabaseConfigured: () => false,
}));

import { POST as createHold } from "@/app/api/holds/route";
import { POST as releaseHold } from "@/app/api/holds/release/route";
import { InMemoryRedisClient, setHoldEngineRedisClient } from "@/lib/redis/holdEngine";
import { submitPilotApplication } from "@/app/actions/pilotApplication";
import { getVendorBatches } from "@/lib/db/batches";
import { QuickScheduleModal } from "@/components/admin/QuickScheduleModal";
import { DualTrackCheckoutPanel } from "@/components/shop/get-bent/DualTrackCheckoutPanel";
import { InventoryManager } from "@/components/admin/InventoryManager";
import GetBentFlagshipDropPage from "@/app/(shop)/get-bent/page";
import type { ProductBatch } from "@/lib/drops/lifecycle";

describe("PR #15 Review Fixes Coverage", () => {
  beforeEach(() => {
    mockGetServiceRoleClient.mockReset();
    mockGetServerClient.mockReset();
    mockGetBrowserClient.mockReset();
    setHoldEngineRedisClient(new InMemoryRedisClient());
  });

  it("never mutates products.stock_quantity during hold creation or release and handles expired holds idempotently", async () => {
    const productUuid = "11111111-1111-4111-8111-111111111111";
    const productsUpdateSpy = vi.fn();
    const cartHoldsInsertSpy = vi.fn().mockResolvedValue({ error: null });
    const cartHoldsUpdateEqSpy = vi.fn().mockReturnValue({
      in: vi.fn().mockReturnValue({
        lte: vi.fn().mockResolvedValue({ error: null }),
        then: (fn: (v: unknown) => unknown) => Promise.resolve({ error: null }).then(fn),
      }),
    });

    const mockDb = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "products") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: productUuid,
                    sku: "TEST-SKU-01",
                    title: "Test Product",
                    description: "",
                    price_cents: 2500,
                    stock_quantity: 2,
                    max_stock: 2,
                    hardware_tier: "NTAG213_SERIALIZED",
                    secondary_royalty_pct: 7.5,
                    materials: [],
                  },
                  error: null,
                }),
              }),
            }),
            update: productsUpdateSpy,
          };
        }
        if (table === "cart_holds") {
          return {
            insert: cartHoldsInsertSpy,
            update: vi.fn().mockReturnValue({
              eq: cartHoldsUpdateEqSpy,
            }),
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: "expired-hold-id",
                    product_id: productUuid,
                    user_id: "shopper_alice",
                    quantity: 1,
                    status: "ACTIVE_HOLD",
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      }),
    };

    mockGetServerClient.mockReturnValue(mockDb);
    mockGetServiceRoleClient.mockReturnValue(mockDb);

    // Two overlapping reservations succeed for stock=2 without mutating products.stock_quantity
    const [resA, resB] = await Promise.all([
      createHold(
        new NextRequest("http://localhost:3000/api/holds", {
          method: "POST",
          headers: { "x-user-id": "shopper_alice" },
          body: JSON.stringify({ productId: productUuid, qty: 1 }),
        }),
      ),
      createHold(
        new NextRequest("http://localhost:3000/api/holds", {
          method: "POST",
          headers: { "x-user-id": "shopper_bob" },
          body: JSON.stringify({ productId: productUuid, qty: 1 }),
        }),
      ),
    ]);

    expect(resA.status).toBe(201);
    expect(resB.status).toBe(201);
    expect(productsUpdateSpy).not.toHaveBeenCalled();

    // Third concurrent hold is rejected by Redis lock pool
    const resC = await createHold(
      new NextRequest("http://localhost:3000/api/holds", {
        method: "POST",
        headers: { "x-user-id": "shopper_eve" },
        body: JSON.stringify({ productId: productUuid, qty: 1 }),
      }),
    );
    expect(resC.status).toBe(409);

    // Releasing an already-TTL-expired hold persisted in cart_holds succeeds idempotently
    const expiredReleaseRes = await releaseHold(
      new NextRequest("http://localhost:3000/api/holds/release", {
        method: "POST",
        headers: { "x-user-id": "shopper_alice" },
        body: JSON.stringify({ holdId: "expired-hold-id" }),
      }),
    );
    expect(expiredReleaseRes.status).toBe(200);
    expect(productsUpdateSpy).not.toHaveBeenCalled();
  });

  it("returns failure from submitPilotApplication when DB insert throws", async () => {
    mockGetServiceRoleClient.mockReturnValue({
      from: vi.fn().mockImplementation(() => {
        throw new Error("Connection refused");
      }),
    });

    const result = await submitPilotApplication({
      artistBrandName: "Studio Kestrel",
      mediumCraft: "Visual Art",
      portfolioHandle: "@kestrel",
      email: "maker@kestrel.art",
    });

    expect(result.success).toBe(false);
    expect(result.persistedToDb).toBe(false);
    expect(result.error).toContain("Connection refused");
  });

  it("uses inner brand join in getVendorBatches to exclude other brands", async () => {
    const selectSpy = vi.fn().mockReturnValue({
      order: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [
            {
              id: "b-gb",
              brand_id: "brand-gb",
              title: "Get Bent Drop",
              sku: "GB-01",
              goes_live_at: new Date().toISOString(),
              is_published: true,
              is_public_teaser: true,
              brands: { slug: "get-bent" },
            },
            {
              id: "b-other",
              brand_id: "brand-other",
              title: "Other Brand Drop",
              sku: "OB-01",
              goes_live_at: new Date().toISOString(),
              is_published: true,
              is_public_teaser: true,
              brands: { slug: "timber-stone" },
            },
          ],
          error: null,
        }),
      }),
    });

    mockGetServerClient.mockReturnValue({
      from: vi.fn().mockReturnValue({ select: selectSpy }),
    });

    const batches = await getVendorBatches("get-bent");
    expect(selectSpy).toHaveBeenCalledWith("*, brands!inner(slug)");
    expect(batches).toHaveLength(1);
    expect(batches[0].id).toBe("b-gb");
  });

  it("lets vendors pick their own brand and preserves custom closing timestamps on title edits", async () => {
    const user = userEvent.setup();
    const onSaveCreate = vi.fn().mockResolvedValue(undefined);

    const { unmount } = render(
      <QuickScheduleModal
        isOpen
        onClose={vi.fn()}
        selectedDateIso="2026-12-01"
        availableBrands={[
          { id: "b1", handle: "timber-stone", name: "Timber & Stone Guild" },
          { id: "b2", handle: "solstice-foundry", name: "Solstice Foundry" },
        ]}
        defaultBrandHandle="timber-stone"
        onSave={onSaveCreate}
      />,
    );

    await user.selectOptions(
      screen.getByLabelText(/Storefront Brand Handle/i),
      "solstice-foundry",
    );
    await user.type(screen.getByLabelText(/Drop \/ Batch Title/i), "Brass Compass Drop");
    await user.click(screen.getByRole("button", { name: /^Confirm Schedule$/i }));

    await waitFor(() => expect(onSaveCreate).toHaveBeenCalledTimes(1));
    expect(onSaveCreate.mock.calls[0][0].brandHandle).toBe("solstice-foundry");
    unmount();

    // Custom 37-hour window created via Publish Now must be preserved when editing title
    const customStart = "2026-11-23T14:00:00.000Z";
    const customClose = "2026-11-25T03:17:00.000Z";
    const editingBatch: ProductBatch = {
      id: "batch-custom-1",
      brandId: "b1",
      brandHandle: "timber-stone",
      title: "Original Title",
      sku: "TS-01",
      batchNumber: 1,
      isPublished: true,
      goesLiveAt: customStart,
      autoRetireAt: customClose,
      versionTag: "v1.0",
      isPublicTeaser: true,
      chipTier: "NTAG215_SERIALIZED",
      basePriceCents: 4500,
      maxCap: 24,
      mintedCount: 0,
      vanityAuctionEnabled: false,
    };

    const onSaveEdit = vi.fn().mockResolvedValue(undefined);
    render(
      <QuickScheduleModal
        isOpen
        onClose={vi.fn()}
        selectedDateIso="2026-11-23"
        editingBatch={editingBatch}
        onSave={onSaveEdit}
      />,
    );

    const titleInput = screen.getByLabelText(/Drop \/ Batch Title/i);
    await user.clear(titleInput);
    await user.type(titleInput, "Updated Title Only");
    await user.click(screen.getByRole("button", { name: /^Update Window$/i }));

    await waitFor(() => expect(onSaveEdit).toHaveBeenCalledTimes(1));
    expect(onSaveEdit.mock.calls[0][0].autoRetireAt).toBe(customClose);
  });

  it("targets provisioned productId in DualTrackCheckoutPanel and uses realOrders in InventoryManager", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 201 }));

    render(
      <DualTrackCheckoutPanel
        totalMinted={10}
        onIncrementMinted={vi.fn()}
        topBidDollars={69}
        onUpdateTopBid={vi.fn()}
        productId="99999999-9999-4999-8999-999999999999"
        batchSku="GB-002"
      />,
    );

    await user.click(screen.getByRole("button", { name: /Enter Sequential Hopper/i }));
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    const body = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
    expect(body.productId).toBe("99999999-9999-4999-8999-999999999999");
    expect(body.sku).toBe("GB-002-HOPPER");
    fetchSpy.mockRestore();

    render(
      <InventoryManager
        initialItems={[
          {
            id: "prod-real-1",
            sku: "REAL-001",
            title: "Real Batch Item",
            stock: 8,
            maxStock: 10,
            priceCents: 3000,
            royaltyBps: 750,
            chipTier: "NTAG213_SERIALIZED",
            coSignRequired: false,
            status: "IN_STOCK",
            lastUpdated: new Date().toISOString(),
          },
        ]}
        initialChips={[]}
        initialOrdersBySku={{
          "REAL-001": [
            {
              serialNumber: 1,
              editionDenominator: 10,
              size: "L",
              recipientName: "@real_buyer",
              address: "",
              city: "",
              state: "",
              zip: "",
              holderHandle: "@real_buyer",
              claimStatus: "MINTED_INITIAL",
              paidDollars: 30,
            },
          ],
        }}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Print & Ship Manifest/i }));
    expect(screen.getByText(/1 Units Settled/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Export Pirate Ship CSV/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Export NFC Tag Manifest CSV/i })).not.toBeDisabled();
  });

  it("resolves unlinked live batch SKU and post-Black-Friday window on plain /get-bent storefront", async () => {
    const user = userEvent.setup();
    const futureCloseIso = new Date(Date.now() + 72 * 3_600_000).toISOString();
    const pastStartIso = new Date(Date.now() - 3_600_000).toISOString();

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/api/drops?brand=get-bent&mode=live")) {
        return new Response(
          JSON.stringify({
            batches: [
              {
                id: "live-gb-002",
                brandId: "b-gb",
                brandHandle: "get-bent",
                productId: null,
                title: "Batch 002: Winter Drop",
                sku: "GB-002",
                batchNumber: 2,
                isPublished: true,
                goesLiveAt: pastStartIso,
                autoRetireAt: futureCloseIso,
                versionTag: "v2.0",
                isPublicTeaser: true,
                chipTier: "NTAG213_SERIALIZED",
                basePriceCents: 2500,
                maxCap: null,
                mintedCount: 120,
                vanityAuctionEnabled: true,
              },
            ],
          }),
          { status: 200 },
        );
      }
      if (url.includes("/api/products?brand=get-bent")) {
        return new Response(
          JSON.stringify({
            products: [
              { id: "prod-gb-001", sku: "GB-001" },
              { id: "prod-gb-002", sku: "GB-002" },
            ],
          }),
          { status: 200 },
        );
      }
      if (url.includes("/api/holds")) {
        return new Response(JSON.stringify({ success: true }), { status: 201 });
      }
      return new Response(JSON.stringify({}), { status: 200 });
    });

    render(<GetBentFlagshipDropPage />);

    await waitFor(() => {
      expect(screen.getByText(/120 SHIRTS MINTED SO FAR/i)).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /Enter Sequential Hopper/i }));
    await waitFor(() => {
      const holdCall = fetchSpy.mock.calls.find(([u]) => String(u).includes("/api/holds"));
      expect(holdCall).toBeDefined();
      const body = JSON.parse(holdCall![1]!.body as string);
      expect(body.productId).toBe("prod-gb-002");
      expect(body.sku).toBe("GB-002-HOPPER");
    });

    fetchSpy.mockRestore();
  });

  it("blocks scheduling when authenticated vendor owns zero brands", () => {
    render(
      <QuickScheduleModal
        isOpen
        onClose={vi.fn()}
        selectedDateIso="2026-12-01"
        availableBrands={[]}
        brandAuthChecked
        defaultBrandHandle=""
        onSave={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/No owned storefront brand found for your account/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Confirm Schedule$/i })).toBeDisabled();
  });
});
