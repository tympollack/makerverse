// app/api/__tests__/review_fixes.test.tsx
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextRequest } from "next/server";

const mockGetServiceRoleClient = vi.fn();
const mockGetServerClient = vi.fn();
const mockGetBrowserClient = vi.fn();
const mockScheduleBatchRelease = vi.fn();
const mockRescheduleBatchWindow = vi.fn();
const mockTogglePublicTeaser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServiceRoleClient: () => mockGetServiceRoleClient(),
  getSupabaseServerClient: () => mockGetServerClient(),
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseBrowserClient: () => mockGetBrowserClient(),
  isSupabaseConfigured: () => false,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/app/(admin)/vendor/schedule/actions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/app/(admin)/vendor/schedule/actions")>();
  return {
    ...actual,
    scheduleBatchRelease: (...args: unknown[]) => mockScheduleBatchRelease(...args),
    rescheduleBatchWindow: (...args: unknown[]) => mockRescheduleBatchWindow(...args),
    togglePublicTeaser: (...args: unknown[]) => mockTogglePublicTeaser(...args),
  };
});

import { DropScheduleCalendar } from "@/components/admin/DropScheduleCalendar";
import { GET as getDropsApi } from "@/app/api/drops/route";
import { matchBatchQueryParam } from "@/components/shop/ActiveBatchBanner";
import type { ProductBatch } from "@/lib/drops/lifecycle";

describe("PR #14 Review Fixes Coverage", () => {
  beforeEach(() => {
    mockGetServiceRoleClient.mockReset();
    mockGetServerClient.mockReset();
    mockGetBrowserClient.mockReset();
    mockScheduleBatchRelease.mockReset();
    mockRescheduleBatchWindow.mockReset();
    mockTogglePublicTeaser.mockReset();
  });

  it("shifts expired autoRetireAt forward on Publish Now and surfaces action failures", async () => {
    const user = userEvent.setup();
    const expiredDraft: ProductBatch = {
      id: "batch-expired-draft",
      brandId: "b1",
      brandHandle: "get-bent",
      title: "Expired Draft Drop",
      sku: "GB-EXP",
      batchNumber: 5,
      isPublished: false,
      goesLiveAt: "2025-11-01T12:00:00.000Z",
      autoRetireAt: "2025-11-03T12:00:00.000Z", // 48h window in the past
      versionTag: "v1.0",
      isPublicTeaser: false,
      chipTier: "NTAG213_SERIALIZED",
      basePriceCents: 2500,
      maxCap: 100,
      mintedCount: 0,
      vanityAuctionEnabled: true,
      releaseStatus: "DRAFT",
    };

    mockGetBrowserClient.mockReturnValue(null);
    mockRescheduleBatchWindow
      .mockResolvedValueOnce({
        success: false,
        persistedToDb: false,
        error: "DATABASE_UNAVAILABLE",
      })
      .mockResolvedValueOnce({
        success: true,
        persistedToDb: true,
      });

    render(<DropScheduleCalendar initialBatches={[expiredDraft]} />);

    const publishBtn = screen.getByRole("button", { name: /Publish Now/i });
    await user.click(publishBtn);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("DATABASE_UNAVAILABLE");
    });

    await user.click(publishBtn);

    await waitFor(() => {
      expect(mockRescheduleBatchWindow).toHaveBeenCalledTimes(2);
    });
    const callArg = mockRescheduleBatchWindow.mock.calls[1][0];
    expect(callArg.isPublished).toBe(true);
    expect(Date.parse(callArg.autoRetireAt)).toBeGreaterThan(Date.now());
  });

  it("exposes GET /api/drops?mode=live and resolves ?batch= query params cleanly", async () => {
    const liveRow = {
      id: "batch-live-02",
      brand_id: "b1",
      brand_handle: "get-bent",
      product_id: "prod-1",
      product_line_id: "line-1",
      title: "Batch 002: Midwinter Drop",
      sku: "GB-002",
      batch_number: 2,
      is_published: true,
      goes_live_at: new Date(Date.now() - 60_000).toISOString(),
      auto_retire_at: new Date(Date.now() + 86_400_000).toISOString(),
      version_tag: "v2.0",
      is_public_teaser: true,
      chip_tier: "NTAG213_SERIALIZED",
      base_price_cents: 3500,
      max_cap: 100,
      minted_count: 14,
      vanity_auction_enabled: true,
      release_status: "LIVE",
      brands: { slug: "get-bent" },
    };

    mockGetServerClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [liveRow], error: null }),
          }),
        }),
      }),
    });

    const res = await getDropsApi(
      new NextRequest("http://localhost:3000/api/drops?brand=get-bent&mode=live"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.batches).toHaveLength(1);
    expect(body.batches[0].productLineId).toBe("line-1");

    const matchedBySku = matchBatchQueryParam(body.batches, "gb-002");
    expect(matchedBySku?.id).toBe("batch-live-02");
  });
});
