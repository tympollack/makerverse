// components/__tests__/DropSchedulerAndQol.test.tsx
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  resolveBatchLifecycleStatus,
  isBatchCheckoutUnlocked,
  detectFulfillmentOverlaps,
  type ProductBatch,
} from "@/lib/drops/lifecycle";
import { DropScheduleCalendar } from "@/components/admin/DropScheduleCalendar";
import { UpcomingDropsRail } from "@/components/shop/UpcomingDropsRail";
import { UpcomingDropCard } from "@/components/shop/UpcomingDropCard";
import { DropShareBar } from "@/components/shop/DropShareBar";
import { InventoryManager } from "@/components/admin/InventoryManager";
import {
  buildBatchManifestOrders,
  calculateBatchSettlement,
  generatePirateShipCsv,
  generateNfcTagManifestCsv,
} from "@/lib/utils/exportBatchManifest";
import { NextRequest } from "next/server";
import { scheduleBatchRelease } from "@/app/(admin)/vendor/schedule/actions";
import { GET as getDropsApi } from "@/app/api/drops/route";
import { POST as postDropNotify } from "@/app/api/drops/notify/route";
import GetBentFlagshipDropPage from "@/app/(shop)/get-bent/page";
import type { InventoryItem } from "@/lib/mock/adminData";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("TASK-MKR-SCHEDULE-SCHEMA-LIFECYCLE: Batch Lifecycle & Overlap Resolver", () => {
  it("resolves DRAFT, SCHEDULED, LIVE, and RETIRED states accurately", () => {
    const base = new Date("2026-11-25T12:00:00Z").getTime();
    const goesLiveAt = new Date(base + 3_600_000).toISOString();
    const autoRetireAt = new Date(base + 86_400_000).toISOString();

    expect(
      resolveBatchLifecycleStatus({ isPublished: false, goesLiveAt, autoRetireAt }, base),
    ).toBe("DRAFT");
    expect(
      resolveBatchLifecycleStatus({ isPublished: true, goesLiveAt, autoRetireAt }, base),
    ).toBe("SCHEDULED");
    expect(
      isBatchCheckoutUnlocked({ isPublished: true, goesLiveAt, autoRetireAt }, base),
    ).toBe(false);

    const duringLive = base + 7_200_000;
    expect(
      resolveBatchLifecycleStatus({ isPublished: true, goesLiveAt, autoRetireAt }, duringLive),
    ).toBe("LIVE");
    expect(
      isBatchCheckoutUnlocked({ isPublished: true, goesLiveAt, autoRetireAt }, duringLive),
    ).toBe(true);

    const afterRetire = base + 90_000_000;
    expect(
      resolveBatchLifecycleStatus({ isPublished: true, goesLiveAt, autoRetireAt }, afterRetire),
    ).toBe("RETIRED");
    expect(
      isBatchCheckoutUnlocked({ isPublished: true, goesLiveAt, autoRetireAt }, afterRetire),
    ).toBe(false);
  });

  it("detects concurrent fulfillment overlap advisories", () => {
    const now = Date.now();
    const batches: ProductBatch[] = [
      {
        id: "b1",
        brandId: "brand_1",
        brandHandle: "get-bent",
        title: "Batch A",
        sku: "A-1",
        batchNumber: 1,
        isPublished: true,
        goesLiveAt: new Date(now + 1000).toISOString(),
        autoRetireAt: new Date(now + 86_400_000).toISOString(),
        versionTag: "v1.0",
        isPublicTeaser: true,
        chipTier: "NTAG213_SERIALIZED",
        basePriceCents: 2500,
        maxCap: null,
        mintedCount: 0,
        vanityAuctionEnabled: true,
      },
      {
        id: "b2",
        brandId: "brand_1",
        brandHandle: "get-bent",
        title: "Batch B",
        sku: "B-2",
        batchNumber: 2,
        isPublished: true,
        goesLiveAt: new Date(now + 50_000).toISOString(),
        autoRetireAt: new Date(now + 120_000_000).toISOString(),
        versionTag: "v2.0",
        isPublicTeaser: true,
        chipTier: "NTAG424_DNA",
        basePriceCents: 4500,
        maxCap: 50,
        mintedCount: 0,
        vanityAuctionEnabled: false,
      },
    ];

    const { overlappingIds, advisories } = detectFulfillmentOverlaps(batches);
    expect(overlappingIds.has("b1")).toBe(true);
    expect(overlappingIds.has("b2")).toBe(true);
    expect(advisories.length).toBeGreaterThan(0);

    // Open-ended drop (autoRetireAt: null) must also trigger overlap with later drops
    const openEndedOverlaps = detectFulfillmentOverlaps([
      { ...batches[0], autoRetireAt: null },
      {
        ...batches[1],
        goesLiveAt: new Date(now + 10 * 86_400_000).toISOString(),
        autoRetireAt: new Date(now + 12 * 86_400_000).toISOString(),
      },
    ]);
    expect(openEndedOverlaps.overlappingIds.has("b1")).toBe(true);
    expect(openEndedOverlaps.overlappingIds.has("b2")).toBe(true);
  });

  it("gates mode=all drops behind admin auth and validates notify-me requests", async () => {
    const unauthAll = await getDropsApi(
      new NextRequest("http://localhost:3000/api/drops?mode=all"),
    );
    expect(unauthAll.status).toBe(401);

    const badNotify = await postDropNotify(
      new NextRequest("http://localhost:3000/api/drops/notify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ batchId: "batch_1", userId: "victim-uuid" }),
      }),
    );
    expect(badNotify.status).toBe(400);
  });

  it("rejects scheduleBatchRelease when autoRetireAt <= goesLiveAt", async () => {
    const res = await scheduleBatchRelease({
      title: "Invalid Drop",
      goesLiveAt: "2026-12-01T12:00:00Z",
      autoRetireAt: "2026-12-01T10:00:00Z",
    });
    expect(res.success).toBe(false);
    expect(res.error).toBe("AUTO_RETIRE_MUST_BE_AFTER_GOES_LIVE");
  });
});

describe("TASK-MKR-SCHEDULE-CALENDAR-UI: DropScheduleCalendar", () => {
  it("renders view toggles, overlap advisory, and quick-schedule modal", async () => {
    const user = userEvent.setup();
    render(<DropScheduleCalendar />);

    expect(screen.getByText(/Drop Release Calendar/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Month" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2-Week" })).toBeInTheDocument();
    expect(screen.getAllByText(/Fulfillment Overlap Advisory/i).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "2-Week" }));
    await user.click(screen.getByRole("button", { name: /Schedule Drop/i }));

    expect(screen.getByText(/Quick-Schedule Drop Release/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "12:00 AM" }));
    await user.click(screen.getByRole("button", { name: "72hr Drop" }));
    await user.type(screen.getByLabelText(/Drop \/ Batch Title/i), "Winter Solstice Drop");
    await user.click(screen.getByRole("button", { name: /^Confirm Schedule$/i }));

    await waitFor(() => {
      expect(screen.getAllByText("Winter Solstice Drop").length).toBeGreaterThan(0);
    });
  });
});

describe("TASK-MKR-PUBLIC-UPCOMING-TEASERS: UpcomingDropsRail & Checkout Lock", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("locks checkout before goes_live_at and unlocks automatically when timer expires", () => {
    const baseTime = 1_700_000_000_000;
    vi.setSystemTime(baseTime);

    const upcomingBatch: ProductBatch = {
      id: "batch_future_1",
      brandId: "b_1",
      brandHandle: "get-bent",
      title: "Batch 002: Heavyweight Hoodie",
      sku: "GB-HD-002",
      batchNumber: 2,
      isPublished: true,
      goesLiveAt: new Date(baseTime + 2000).toISOString(),
      autoRetireAt: new Date(baseTime + 86_400_000).toISOString(),
      versionTag: "v2.0",
      isPublicTeaser: true,
      artistAttribution: "Co-Signed x Studio Kestrel",
      chipTier: "NTAG213_SERIALIZED",
      basePriceCents: 6800,
      maxCap: null,
      mintedCount: 0,
      vanityAuctionEnabled: true,
    };

    render(<UpcomingDropCard batch={upcomingBatch} />);
    expect(screen.getByText(/LOCKED UNTIL LAUNCH/i)).toBeInTheDocument();
    expect(screen.getByText(/v2\.0 ARTIST EDITION/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Notify Me at Drop/i })).toBeInTheDocument();
    expect(screen.queryByText(/Enter Live Drop Checkout/i)).not.toBeInTheDocument();

    act(() => {
      vi.setSystemTime(baseTime + 2500);
      vi.advanceTimersByTime(2500);
    });

    expect(screen.getByText(/LIVE NOW/i)).toBeInTheDocument();
    expect(screen.getByText(/Enter Live Drop Checkout/i)).toBeInTheDocument();
  });

  it("renders UPCOMING DROPS // QUEUED rail and share bar on /get-bent and standalone rail", () => {
    render(<UpcomingDropsRail brandHandle="forge-collective" />);
    expect(screen.getByText(/Forge Gen-2 Patina Copper Keyring/i)).toBeInTheDocument();

    render(<GetBentFlagshipDropPage />);
    expect(screen.getAllByText(/UPCOMING DROPS \/\/ QUEUED/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Copy Drop Link/i)).toBeInTheDocument();
  });
});

describe("TASK-MKR-QUICK-LIST-DUPLICATOR & TASK-MKR-BATCH-SETTLEMENT-EXPORT", () => {
  const sampleItems: InventoryItem[] = [
    {
      id: "inv_test_1",
      sku: "GB-BF-001",
      title: "Batch 001: Black Friday Tee",
      stock: 4,
      maxStock: 24,
      priceCents: 2500,
      royaltyBps: 750,
      chipTier: "NTAG213_SERIALIZED",
      coSignRequired: false,
      status: "LOW_STOCK",
      lastUpdated: new Date().toISOString(),
      versionTag: "v1.0",
    },
  ];

  it("applies Quick-Start presets, Clone, Graduate to v2.0, and Pure-Type Generator", async () => {
    const user = userEvent.setup();
    render(<InventoryManager initialItems={sampleItems} initialChips={[]} />);

    // Open Clone
    await user.click(screen.getByRole("button", { name: /^Clone$/i }));
    expect(screen.getByDisplayValue("Batch 001: Black Friday Tee (Copy)")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^Cancel$/i }));

    // Open Graduate to v2.0
    await user.click(screen.getByRole("button", { name: /Graduate to v2\.0/i }));
    expect(screen.getByText(/v2\.0 Artist Edition Graduation/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Co-Signed Artist Attribution/i)).toBeInTheDocument();

    // Apply 24hr Pure-Type Stunt Tee preset & Pure-Type generator fields
    await user.click(screen.getByRole("button", { name: /24hr Pure-Type Stunt Tee/i }));
    await user.type(screen.getByLabelText(/Front Chest Stamp/i), "GET BENT");
    await user.type(screen.getByLabelText(/Back Statement/i), "NO FAKE MARKDOWNS");
    expect(screen.getByText("NO FAKE MARKDOWNS")).toBeInTheDocument();
  });

  it("calculates settlement fees & generates valid Pirate Ship and NFC Manifest CSVs", async () => {
    const user = userEvent.setup();
    const { orders, isSimulatedPreview } = buildBatchManifestOrders(sampleItems[0]);
    expect(isSimulatedPreview).toBe(true);
    expect(orders.length).toBe(20);

    const summary = calculateBatchSettlement(sampleItems[0], orders);
    expect(summary.grossBaseSales).toBe(500);
    expect(summary.basePlatformFee).toBe(10); // 2% of $500

    const pirateCsv = generatePirateShipCsv(orders);
    expect(pirateCsv).toContain("Recipient Name,Address,City,State,Zip,Size,Assigned Serial");
    expect(pirateCsv).toContain("#001/24");

    const nfcCsv = generateNfcTagManifestCsv(orders);
    expect(nfcCsv).toContain("Serial Number,Edition Denominator,Holder Handle/Email,Claim Status");

    render(<InventoryManager initialItems={sampleItems} initialChips={[]} />);
    await user.click(screen.getByRole("button", { name: /Print & Ship Manifest/i }));

    expect(screen.getByText(/Batch Lock Summary & Fulfillment Export/i)).toBeInTheDocument();
    expect(screen.getByText(/Print Shop Size Breakdown Table/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Export Pirate Ship CSV/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Export NFC Tag Manifest CSV/i })).toBeInTheDocument();
  });
});

describe("TASK-MKR-VIRAL-SHARE-OG-KIT: DropShareBar & OpenGraph Route", () => {
  it("copies drop link with instant Copied! feedback and interpolates rally count", async () => {
    const user = userEvent.setup();
    render(
      <DropShareBar
        brandName="Get Bent Clothing"
        brandHandle="get-bent"
        batchLabel="Batch 001"
        mintedCount={42}
        topBidDollars={69}
      />,
    );

    expect(
      screen.getByText(/Help push Batch 001 past 69 shirts on Get Bent Clothing/i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Copy Drop Link/i }));
    expect(screen.getByText("Copied!")).toBeInTheDocument();
  });
});
