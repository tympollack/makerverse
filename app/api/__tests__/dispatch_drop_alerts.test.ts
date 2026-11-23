// app/api/__tests__/dispatch_drop_alerts.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

const mockGetServiceRoleClient = vi.fn();
const mockGetServerClient = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServiceRoleClient: () => mockGetServiceRoleClient(),
  getSupabaseServerClient: () => mockGetServerClient(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { POST as postDispatchDropAlerts } from "@/app/api/cron/dispatch-drop-alerts/route";
import {
  buildDropAlertEmailContent,
  dispatchPendingDropAlerts,
} from "@/lib/email/dropAlerts";
import { scheduleBatchRelease } from "@/app/(admin)/vendor/schedule/actions";

describe("TASK-MKR-FRESH-DROP-DISPATCHER: Drop Alert Dispatcher & Publish Now", () => {
  const originalCronSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    mockGetServiceRoleClient.mockReset();
    mockGetServerClient.mockReset();
    process.env.CRON_SECRET = "test-cron-secret";
  });

  afterEach(() => {
    if (originalCronSecret === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = originalCronSecret;
    }
  });

  it("enforces CRON_SECRET auth on POST /api/cron/dispatch-drop-alerts", async () => {
    const unauth = await postDispatchDropAlerts(
      new NextRequest("http://localhost:3000/api/cron/dispatch-drop-alerts", {
        method: "POST",
      }),
    );
    expect(unauth.status).toBe(401);

    mockGetServiceRoleClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      }),
    });

    const authed = await postDispatchDropAlerts(
      new NextRequest("http://localhost:3000/api/cron/dispatch-drop-alerts", {
        method: "POST",
        headers: { Authorization: "Bearer test-cron-secret" },
      }),
    );
    expect(authed.status).toBe(200);
    expect(await authed.json()).toMatchObject({
      success: true,
      processedBatches: 0,
      emailsDispatched: 0,
    });
  });

  it("builds branded Makerverse HTML/text emails and dispatches deduplicated alerts once via @digitalcanopy/email", async () => {
    const batchId = "66666666-6666-4666-8666-666666666666";
    const brandId = "77777777-7777-4777-8777-777777777777";
    const productLineId = "88888888-8888-4888-8888-888888888888";

    const content = buildDropAlertEmailContent({
      batch: {
        id: batchId,
        brandId,
        brandName: "GET BENT CLOTHING",
        brandSlug: "get-bent",
        title: "Batch 002: Heavyweight Pure-Type Tee",
        versionTag: "v2.0",
        artistAttribution: "Co-Signed x Studio Kestrel",
        basePriceCents: 3500,
        maxCap: 100,
        vanityAuctionEnabled: true,
        chipTier: "NTAG213_SERIALIZED",
      },
      appBaseUrl: "https://makerverse.sunshade.icu",
      unsubscribeUrl: "https://makerverse.sunshade.icu/api/unsubscribe?token=tok-1",
    });

    expect(content.subject).toContain("GET BENT CLOTHING");
    expect(content.html).toContain("#1A1A1A");
    expect(content.html).toContain("#CC5500");
    expect(content.html).toContain("v2.0 ARTIST EDITION");
    expect(content.html).toContain("$35.00");
    expect(content.html).toContain("https://makerverse.sunshade.icu/get-bent");
    expect(content.html).toContain("/api/unsubscribe?token=tok-1");

    const sendBatchMock = vi.fn().mockResolvedValue({
      totalSent: 2,
      batchCount: 1,
      appId: "makerverse",
      channel: "alerts",
      ids: ["em_1", "em_2"],
      batches: [{ chunkIndex: 0, size: 2, ids: ["em_1", "em_2"] }],
      dryRun: false,
    });

    let claimCount = 0;
    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "v_batch_lifecycle") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: batchId,
                      brand_id: brandId,
                      product_id: null,
                      product_line_id: productLineId,
                      title: "Batch 002: Heavyweight Pure-Type Tee",
                      sku: "GB-002",
                      version_tag: "v2.0",
                      artist_attribution: "Co-Signed x Studio Kestrel",
                      base_price_cents: 3500,
                      max_cap: 100,
                      vanity_auction_enabled: true,
                      chip_tier: "NTAG213_SERIALIZED",
                      release_status: "LIVE",
                      drop_alert_sent_at: null,
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "product_batches") {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockReturnValue({
                  select: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockImplementation(async () => {
                      claimCount++;
                      return claimCount === 1
                        ? { data: { id: batchId }, error: null }
                        : { data: null, error: null };
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "brands") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: brandId, name: "GET BENT CLOTHING", slug: "get-bent" },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "drop_subscriptions") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                in: vi.fn().mockResolvedValue({
                  data: [
                    {
                      email: "alice@example.com",
                      unsubscribe_token: "tok-a",
                      target_type: "brand",
                      target_id: brandId,
                    },
                    {
                      email: "alice@example.com",
                      unsubscribe_token: "tok-a-dup",
                      target_type: "batch",
                      target_id: batchId,
                    },
                    {
                      email: "bob@example.com",
                      unsubscribe_token: "tok-b",
                      target_type: "product_line",
                      target_id: productLineId,
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      }),
    };

    const emailClient = {
      appId: "makerverse" as const,
      defaultFrom: "Makerverse <auth@madeintheshade.wtf>",
      alertsFrom: "Makerverse Drops <drops@mail.madeintheshade.wtf>",
      sendTransactional: vi.fn(),
      sendBatchNotification: sendBatchMock,
      addAudienceContact: vi.fn(),
    };

    const res1 = await dispatchPendingDropAlerts({
      supabase: mockSupabase as any,
      emailClient,
    });

    expect(res1.processedBatches).toBe(1);
    expect(res1.emailsDispatched).toBe(2);
    expect(sendBatchMock).toHaveBeenCalledTimes(1);
    const sentMessages = sendBatchMock.mock.calls[0][0];
    expect(sentMessages.map((m: { to: string }) => m.to)).toEqual([
      "alice@example.com",
      "bob@example.com",
    ]);
    expect(sentMessages[0].unsubscribeUrl).toBe(
      "https://makerverse.sunshade.icu/api/unsubscribe?token=tok-a",
    );

    const res2 = await dispatchPendingDropAlerts({
      supabase: mockSupabase as any,
      emailClient,
    });
    expect(res2.processedBatches).toBe(0);
    expect(res2.skippedBatches).toBe(1);
    expect(sendBatchMock).toHaveBeenCalledTimes(1);
  });

  it("triggers immediate alert dispatch when scheduleBatchRelease publishes a LIVE drop", async () => {
    const brandId = "b0000001-0000-0000-0000-000000000001";
    const batchId = "99999999-9999-4999-8999-999999999999";
    const dropAlertClaimMock = vi.fn().mockResolvedValue({
      data: { id: batchId },
      error: null,
    });

    mockGetServiceRoleClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "owner-1", app_metadata: { role: "admin" } } },
          error: null,
        }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "brands") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: brandId, name: "GET BENT", slug: "get-bent", owner_id: "owner-1" },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "product_batches") {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { id: batchId }, error: null }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockReturnValue({
                  select: vi.fn().mockReturnValue({ maybeSingle: dropAlertClaimMock }),
                }),
              }),
            }),
          };
        }
        if (table === "v_batch_lifecycle") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({
                    data: [
                      {
                        id: batchId,
                        brand_id: brandId,
                        product_id: null,
                        product_line_id: null,
                        title: "Instant Drop",
                        sku: "GB-NOW",
                        version_tag: "v1.0",
                        base_price_cents: 2500,
                        max_cap: null,
                        vanity_auction_enabled: true,
                        chip_tier: "NTAG213_SERIALIZED",
                        release_status: "LIVE",
                        drop_alert_sent_at: null,
                      },
                    ],
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "drop_subscriptions") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                in: vi.fn().mockResolvedValue({
                  data: [
                    {
                      email: "instant@example.com",
                      unsubscribe_token: "tok-now",
                      target_type: "brand",
                      target_id: brandId,
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      }),
    });

    const res = await scheduleBatchRelease({
      brandId,
      brandHandle: "get-bent",
      title: "Instant Drop",
      goesLiveAt: new Date(Date.now() - 1000).toISOString(),
      isPublished: true,
      authToken: "admin-jwt",
    });

    expect(res.success).toBe(true);
    expect(res.persistedToDb).toBe(true);
    expect(res.alertsDispatched).toBe(1);
    expect(dropAlertClaimMock).toHaveBeenCalledTimes(1);
  });
});
