// components/__tests__/VendorEmailTelemetryUi.test.tsx
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextRequest } from "next/server";

const mockGetVendorEmailTelemetry = vi.fn();

vi.mock("@/lib/db/emailTelemetry", async () => {
  const actual = await vi.importActual<typeof import("@/lib/db/emailTelemetry")>(
    "@/lib/db/emailTelemetry",
  );
  return {
    ...actual,
    getVendorEmailTelemetry: (...args: any[]) => mockGetVendorEmailTelemetry(...args),
  };
});

import {
  aggregateEmailTelemetryRows,
  EMPTY_VENDOR_EMAIL_TELEMETRY,
} from "@/lib/db/emailTelemetry";
import { GET as getAdminEmailTelemetry } from "@/app/api/admin/email-telemetry/route";
import { DropEmailTelemetryStrip } from "@/components/admin/DropEmailTelemetryStrip";
import { FollowerReachCard } from "@/components/admin/FollowerReachCard";
import { DropScheduleCalendar } from "@/components/admin/DropScheduleCalendar";
import { VendorDashboardClient } from "@/components/admin/VendorDashboardClient";
import VendorDashboardPage from "@/app/(admin)/vendor/page";
import type { ProductBatch } from "@/lib/drops/lifecycle";

describe("TASK-MKR-VENDOR-EMAIL-TELEMETRY-UI: Email Telemetry Strip & Follower Reach Card", () => {
  beforeEach(() => {
    mockGetVendorEmailTelemetry.mockReset();
  });

  it("gates GET /api/admin/email-telemetry behind verifyAdminAuth", async () => {
    const unauth = await getAdminEmailTelemetry(
      new NextRequest("http://localhost:3000/api/admin/email-telemetry"),
    );
    expect(unauth.status).toBe(401);

    mockGetVendorEmailTelemetry.mockResolvedValue(EMPTY_VENDOR_EMAIL_TELEMETRY);
    const authed = await getAdminEmailTelemetry(
      new NextRequest("http://localhost:3000/api/admin/email-telemetry?brand=get-bent", {
        headers: { authorization: "Bearer demo_service_key" },
      }),
    );
    expect(authed.status).toBe(200);
    expect(mockGetVendorEmailTelemetry).toHaveBeenCalledWith({ brandHandle: "get-bent" });
    expect(await authed.json()).toEqual({ telemetry: EMPTY_VENDOR_EMAIL_TELEMETRY });
  });

  it("aggregates deduplicated email telemetry rates and subscriber reach cleanly", () => {
    const empty = aggregateEmailTelemetryRows({
      events: [],
      subscriptions: [],
      dispatchedBatches: [],
    });
    expect(empty).toEqual(EMPTY_VENDOR_EMAIL_TELEMETRY);

    const batchId = "66666666-6666-4666-8666-666666666666";
    const summary = aggregateEmailTelemetryRows({
      subscriptions: [
        { email: "alice@example.com", target_type: "brand", target_id: "b1" },
        { email: "alice@example.com", target_type: "batch", target_id: batchId },
        { email: "bob@example.com", target_type: "batch", target_id: batchId },
        { email: "carol@example.com", target_type: "product_line", target_id: "pl1" },
      ],
      dispatchedBatches: [
        {
          id: batchId,
          title: "Batch 002: Heavyweight Tee",
          brand_id: "b1",
          drop_alert_sent_at: "2026-11-25T12:00:00Z",
          brands: { slug: "get-bent" },
        },
      ],
      events: [
        {
          resend_email_id: "em_1",
          event_type: "email.sent",
          batch_id: batchId,
          brand_id: "b1",
          brand_slug: "get-bent",
          occurred_at: "2026-11-25T12:00:01Z",
        },
        {
          resend_email_id: "em_2",
          event_type: "email.sent",
          batch_id: batchId,
          brand_id: "b1",
          brand_slug: "get-bent",
          occurred_at: "2026-11-25T12:00:01Z",
        },
        {
          resend_email_id: "em_1",
          event_type: "email.delivered",
          batch_id: batchId,
          brand_id: "b1",
          brand_slug: "get-bent",
          occurred_at: "2026-11-25T12:00:05Z",
        },
        {
          resend_email_id: "em_2",
          event_type: "email.delivered",
          batch_id: batchId,
          brand_id: "b1",
          brand_slug: "get-bent",
          occurred_at: "2026-11-25T12:00:06Z",
        },
        // Duplicate open from em_1 must only count once
        {
          resend_email_id: "em_1",
          event_type: "email.opened",
          batch_id: batchId,
          brand_id: "b1",
          brand_slug: "get-bent",
          occurred_at: "2026-11-25T12:05:00Z",
        },
        {
          resend_email_id: "em_1",
          event_type: "email.opened",
          batch_id: batchId,
          brand_id: "b1",
          brand_slug: "get-bent",
          occurred_at: "2026-11-25T12:06:00Z",
        },
        {
          resend_email_id: "em_1",
          event_type: "email.clicked",
          batch_id: batchId,
          brand_id: "b1",
          brand_slug: "get-bent",
          occurred_at: "2026-11-25T12:07:00Z",
        },
      ],
    });

    expect(summary.reach).toEqual({
      uniqueSubscribers: 3,
      brandFollowers: 1,
      productLineFollowers: 1,
      batchNotifySignups: 2,
    });
    expect(summary.totals).toMatchObject({
      sent: 2,
      delivered: 2,
      opened: 1,
      clicked: 1,
      deliveryRatePct: 100,
      openRatePct: 50,
      clickRatePct: 50,
      issueCount: 0,
      dispatchedBatches: 1,
    });
    expect(summary.byBatch[batchId]).toMatchObject({
      batchTitle: "Batch 002: Heavyweight Tee",
      brandSlug: "get-bent",
      sent: 2,
      delivered: 2,
      opened: 1,
      clicked: 1,
    });
  });

  it("renders zero-state telemetry strip and follower reach card without fake stats", () => {
    render(
      <>
        <DropEmailTelemetryStrip telemetry={EMPTY_VENDOR_EMAIL_TELEMETRY} />
        <FollowerReachCard telemetry={EMPTY_VENDOR_EMAIL_TELEMETRY} />
      </>,
    );

    expect(screen.getByText(/Native Drop Email Telemetry/i)).toBeInTheDocument();
    expect(screen.getByText(/Awaiting First Blast/i)).toBeInTheDocument();
    expect(screen.getByText(/No drop alerts dispatched yet/i)).toBeInTheDocument();
  });

  it("renders DropEmailTelemetryStrip and per-batch alert telemetry in DropScheduleCalendar", () => {
    const batchId = "66666666-6666-4666-8666-666666666666";
    const batches: ProductBatch[] = [
      {
        id: batchId,
        brandId: "brand_1",
        brandHandle: "get-bent",
        title: "Batch 002: Pure-Type Tee",
        sku: "GB-002",
        batchNumber: 2,
        isPublished: true,
        goesLiveAt: new Date(Date.now() - 3_600_000).toISOString(),
        autoRetireAt: new Date(Date.now() + 82_800_000).toISOString(),
        versionTag: "v2.0",
        isPublicTeaser: true,
        chipTier: "NTAG213_SERIALIZED",
        basePriceCents: 3500,
        maxCap: 100,
        mintedCount: 14,
        vanityAuctionEnabled: true,
      },
    ];

    const telemetry = aggregateEmailTelemetryRows({
      subscriptions: [
        { email: "fan1@example.com", target_type: "brand", target_id: "brand_1" },
        { email: "fan2@example.com", target_type: "batch", target_id: batchId },
      ],
      dispatchedBatches: [
        {
          id: batchId,
          title: "Batch 002: Pure-Type Tee",
          brand_id: "brand_1",
          drop_alert_sent_at: "2026-11-25T10:00:00Z",
          brands: { slug: "get-bent" },
        },
      ],
      events: [
        {
          resend_email_id: "em_a",
          event_type: "email.sent",
          batch_id: batchId,
          brand_id: "brand_1",
          brand_slug: "get-bent",
          occurred_at: "2026-11-25T10:00:01Z",
        },
        {
          resend_email_id: "em_a",
          event_type: "email.delivered",
          batch_id: batchId,
          brand_id: "brand_1",
          brand_slug: "get-bent",
          occurred_at: "2026-11-25T10:00:02Z",
        },
        {
          resend_email_id: "em_a",
          event_type: "email.opened",
          batch_id: batchId,
          brand_id: "brand_1",
          brand_slug: "get-bent",
          occurred_at: "2026-11-25T10:01:00Z",
        },
      ],
    });

    render(
      <DropScheduleCalendar
        initialBatches={batches}
        initialEmailTelemetry={telemetry}
      />,
    );

    expect(screen.getByText(/Resend Live/i)).toBeInTheDocument();
    expect(screen.getByText(/1 brand · 1 notify/i)).toBeInTheDocument();
    expect(screen.getByText(/Drop Alerts: 1 sent/i)).toBeInTheDocument();
  });

  it("renders FollowerReachCard inside VendorDashboardClient and VendorDashboardPage without unauth leaks", () => {
    const telemetry = aggregateEmailTelemetryRows({
      subscriptions: [
        { email: "collector@example.com", target_type: "brand", target_id: "brand_1" },
      ],
      dispatchedBatches: [
        {
          id: "batch_999",
          title: "Founders Drop 001",
          brand_id: "brand_1",
          drop_alert_sent_at: "2026-11-25T11:00:00Z",
          brands: { slug: "get-bent" },
        },
      ],
      events: [
        {
          resend_email_id: "em_999",
          event_type: "email.sent",
          batch_id: "batch_999",
          brand_id: "brand_1",
          brand_slug: "get-bent",
          occurred_at: "2026-11-25T11:00:01Z",
        },
        {
          resend_email_id: "em_999",
          event_type: "email.delivered",
          batch_id: "batch_999",
          brand_id: "brand_1",
          brand_slug: "get-bent",
          occurred_at: "2026-11-25T11:00:02Z",
        },
      ],
    });

    render(
      <VendorDashboardClient
        inventory={[]}
        holds={[]}
        transactions={[]}
        batches={[]}
        emailTelemetry={telemetry}
      />,
    );

    expect(
      screen.getByText(/Follower Reach & Drop Email Telemetry/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Founders Drop 001/i)).toBeInTheDocument();

    // Unauthenticated VendorDashboardPage renders zero-state without calling server DB
    render(<VendorDashboardPage />);
    expect(mockGetVendorEmailTelemetry).not.toHaveBeenCalled();
    expect(screen.getByText(/No drop alerts dispatched yet/i)).toBeInTheDocument();
  });
});
