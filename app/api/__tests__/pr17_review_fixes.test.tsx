// app/api/__tests__/pr17_review_fixes.test.tsx
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

import { GET as getAdminHolds } from "@/app/api/admin/holds/route";
import { GET as getProductsApi } from "@/app/api/products/route";
import { HoldEngineMonitor } from "@/components/admin/HoldEngineMonitor";
import { BoothEngine } from "@/components/admin/BoothEngine";
import { LiveDropsShowcase, getDropHref } from "@/components/onboarding/LiveDropsShowcase";
import { UpcomingDropsRail } from "@/components/shop/UpcomingDropsRail";
import POSPage from "@/app/(admin)/vendor/pos/page";
import type { ProductBatch } from "@/lib/drops/lifecycle";

describe("PR #17 Review Fixes Coverage", () => {
  beforeEach(() => {
    mockGetServiceRoleClient.mockReset();
    mockGetServerClient.mockReset();
    mockGetBrowserClient.mockReset();
  });

  it("gates GET /api/admin/holds behind verifyAdminAuth and separates liveMode from simulated mutations", async () => {
    const unauth = await getAdminHolds(
      new NextRequest("http://localhost:3000/api/admin/holds"),
    );
    expect(unauth.status).toBe(401);

    const authed = await getAdminHolds(
      new NextRequest("http://localhost:3000/api/admin/holds", {
        headers: { authorization: "Bearer demo_service_key" },
      }),
    );
    expect(authed.status).toBe(200);
    const authedBody = await authed.json();
    expect(Array.isArray(authedBody.holds)).toBe(true);

    const user = userEvent.setup();
    const initialHold = {
      holdId: "hold-live-1",
      redisKey: "makerverse:hold:live-1",
      productId: "prod-1",
      productTitle: "Live Copper Keyring",
      sku: "CK-01",
      buyerHandle: "@live_buyer",
      buyerAddress: "0x123",
      createdAt: Date.now() - 10_000,
      expiresAt: Date.now() + 300_000,
      ttlSeconds: 600,
      state: "ACTIVE_HOLD" as const,
    };
    const refreshedHold = {
      ...initialHold,
      holdId: "hold-live-2",
      productTitle: "Synced Fresh Hold",
    };
    const onSync = vi.fn().mockResolvedValue([initialHold, refreshedHold]);

    render(
      <HoldEngineMonitor
        initialHolds={[initialHold]}
        initialEvents={[]}
        liveMode
        onSync={onSync}
      />,
    );

    expect(screen.getByText(/Live Monitor · Read-Only/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Simulate Inbound Hold/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Release$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /\+120s Retry/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Fulfill$/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Sync \(/i }));
    await waitFor(() => expect(onSync).toHaveBeenCalledTimes(1));
    expect(screen.getByText("Synced Fresh Hold")).toBeInTheDocument();
  });

  it("does not leak unauthenticated POS database rows from POSPage without a session", async () => {
    mockGetBrowserClient.mockReturnValue(null);
    const fromSpy = vi.fn();
    mockGetServerClient.mockReturnValue({ from: fromSpy });

    render(<POSPage />);
    expect(fromSpy).not.toHaveBeenCalled();
    expect(screen.getByText(/No POS transactions recorded yet/i)).toBeInTheDocument();
  });

  it("renders zero check-ins and 0% verified/tap rates in BoothEngine when guestbook is empty", () => {
    render(
      <BoothEngine
        initialInstallations={[]}
        initialGuestbook={[]}
        initialRaffles={[]}
      />,
    );

    expect(screen.getByText("0%")).toBeInTheDocument();
    expect(screen.getByText("0.0%")).toBeInTheDocument();
    expect(screen.getByText("+0 in the last hour")).toBeInTheDocument();
    expect(screen.queryByText("NaN%")).not.toBeInTheDocument();
    expect(screen.queryByText("42")).not.toBeInTheDocument();
  });

  it("preserves joined brandHandle on both filtered and unfiltered GET /api/products queries", async () => {
    const productRows = [
      {
        id: "p1",
        sku: "GB-001",
        product_line_id: "l1",
        title: "Get Bent Shirt",
        description: "Shirt",
        price_cents: 2500,
        stock_quantity: 10,
        max_stock: 100,
        hardware_tier: "NTAG213_SERIALIZED",
        secondary_royalty_pct: 7.5,
        co_sign_required: false,
        image_url: "",
        materials: [],
        maker_notes: "",
        hardware_spec: {},
        created_at: new Date().toISOString(),
        product_lines: { id: "l1", brand_id: "b1", brands: { id: "b1", slug: "get-bent" } },
      },
      {
        id: "p2",
        sku: "TS-001",
        product_line_id: "l2",
        title: "Walnut Tray",
        description: "Tray",
        price_cents: 4500,
        stock_quantity: 5,
        max_stock: 20,
        hardware_tier: "NTAG215_SERIALIZED",
        secondary_royalty_pct: 7.5,
        co_sign_required: false,
        image_url: "",
        materials: [],
        maker_notes: "",
        hardware_spec: {},
        created_at: new Date().toISOString(),
        product_lines: { id: "l2", brand_id: "b2", brands: { id: "b2", slug: "timber-stone" } },
      },
    ];

    const eqSpy = vi.fn().mockResolvedValue({ data: [productRows[0]], error: null });
    const selectSpy = vi.fn().mockReturnValue({
      eq: eqSpy,
      then: (fn: (v: unknown) => unknown) =>
        Promise.resolve({ data: productRows, error: null }).then(fn),
    });

    mockGetServerClient.mockReturnValue({
      from: vi.fn().mockReturnValue({ select: selectSpy }),
    });

    // Unfiltered request preserves each product's own joined brand slug
    const unfilteredRes = await getProductsApi(
      new NextRequest("http://localhost:3000/api/products"),
    );
    expect(unfilteredRes.status).toBe(200);
    const unfilteredBody = await unfilteredRes.json();
    expect(unfilteredBody.products).toHaveLength(2);
    expect(unfilteredBody.products[0].brandHandle).toBe("get-bent");
    expect(unfilteredBody.products[1].brandHandle).toBe("timber-stone");

    // Filtered request also preserves joined brand slug
    const filteredRes = await getProductsApi(
      new NextRequest("http://localhost:3000/api/products?brand=get-bent"),
    );
    expect(filteredRes.status).toBe(200);
    const filteredBody = await filteredRes.json();
    expect(filteredBody.products).toHaveLength(1);
    expect(filteredBody.products[0].brandHandle).toBe("get-bent");
  });

  it("generates batch-specific live links and teaser-specific upcoming links, and retires expired live drops", async () => {
    const now = Date.now();
    const liveBatch1: ProductBatch = {
      id: "batch-gb-1",
      brandId: "b1",
      brandHandle: "get-bent",
      title: "Batch 001: Black Friday Boycott",
      sku: "GB-001",
      batchNumber: 1,
      isPublished: true,
      goesLiveAt: new Date(now - 3_600_000).toISOString(),
      autoRetireAt: new Date(now + 250).toISOString(),
      versionTag: "v1.0",
      isPublicTeaser: true,
      chipTier: "NTAG213_SERIALIZED",
      basePriceCents: 2500,
      maxCap: null,
      mintedCount: 114,
      vanityAuctionEnabled: true,
    };
    const upcomingBatch2: ProductBatch = {
      ...liveBatch1,
      id: "batch-gb-2",
      title: "Batch 002: Heavyweight Hoodie",
      sku: "GB-002",
      batchNumber: 2,
      goesLiveAt: new Date(now + 86_400_000).toISOString(),
      autoRetireAt: new Date(now + 172_800_000).toISOString(),
    };

    expect(getDropHref(liveBatch1, "LIVE")).toBe("/get-bent?batch=GB-001");
    expect(getDropHref(upcomingBatch2, "UPCOMING")).toBe("/get-bent?teaser=GB-002#upcoming-drops");

    render(
      <LiveDropsShowcase
        initialLiveBatches={[liveBatch1]}
        initialUpcomingBatches={[upcomingBatch2]}
      />,
    );

    expect(screen.getByText("Batch 001: Black Friday Boycott")).toBeInTheDocument();
    expect(screen.getByText("Batch 002: Heavyweight Hoodie")).toBeInTheDocument();

    // Once Batch 001 countdown expires, its card removes the stale Shop Live Drop action
    await waitFor(
      () => {
        expect(screen.queryByText("Batch 001: Black Friday Boycott")).not.toBeInTheDocument();
      },
      { timeout: 3000 },
    );
    expect(screen.getByText("Batch 002: Heavyweight Hoodie")).toBeInTheDocument();

    // Teaser rail highlights the targeted teaser via ?teaser=
    window.history.replaceState(null, "", "/get-bent?teaser=GB-002");
    render(
      <UpcomingDropsRail
        brandHandle="get-bent"
        initialTeasers={[upcomingBatch2]}
      />,
    );
    await waitFor(() => {
      const card = document.getElementById("upcoming-drop-GB-002");
      expect(card).toHaveAttribute("data-highlighted", "true");
    });
    window.history.replaceState(null, "", "/");
  });
});
