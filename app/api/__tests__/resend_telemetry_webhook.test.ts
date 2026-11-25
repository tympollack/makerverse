// app/api/__tests__/resend_telemetry_webhook.test.ts
import crypto from "node:crypto";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

const mockGetServiceRoleClient = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServiceRoleClient: () => mockGetServiceRoleClient(),
}));

import { POST as postResendWebhook } from "@/app/api/webhooks/resend/route";

function signSvixPayload(params: {
  id: string;
  timestamp: string;
  rawBody: string;
  secret: string;
}): string {
  const key = params.secret.startsWith("whsec_")
    ? Buffer.from(params.secret.slice("whsec_".length), "base64")
    : Buffer.from(params.secret, "utf8");
  const signed = `${params.id}.${params.timestamp}.${params.rawBody}`;
  const digest = crypto.createHmac("sha256", key).update(signed, "utf8").digest("base64");
  return `v1,${digest}`;
}

describe("TASK-MKR-EMAIL-TELEMETRY-WEBHOOK: Resend Webhook Ingestion", () => {
  const rawSecretKey = Buffer.from("makerverse-webhook-secret-key-32b");
  const testSecret = `whsec_${rawSecretKey.toString("base64")}`;
  const originalSecret = process.env.RESEND_WEBHOOK_SECRET;

  beforeEach(() => {
    mockGetServiceRoleClient.mockReset();
    process.env.RESEND_WEBHOOK_SECRET = testSecret;
  });

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.RESEND_WEBHOOK_SECRET;
    } else {
      process.env.RESEND_WEBHOOK_SECRET = originalSecret;
    }
  });

  it("fails closed with 503 when RESEND_WEBHOOK_SECRET is missing and 401 on invalid or stale signatures", async () => {
    delete process.env.RESEND_WEBHOOK_SECRET;
    const unconfigured = await postResendWebhook(
      new NextRequest("http://localhost:3000/api/webhooks/resend", {
        method: "POST",
        body: JSON.stringify({ type: "email.delivered", data: { email_id: "em_1" } }),
      }),
    );
    expect(unconfigured.status).toBe(503);

    process.env.RESEND_WEBHOOK_SECRET = testSecret;
    const nowSec = Math.floor(Date.now() / 1000);
    const body = JSON.stringify({
      type: "email.delivered",
      data: { email_id: "em_1" },
    });

    const missingHeaders = await postResendWebhook(
      new NextRequest("http://localhost:3000/api/webhooks/resend", {
        method: "POST",
        body,
      }),
    );
    expect(missingHeaders.status).toBe(401);

    const staleTs = String(nowSec - 600);
    const staleSig = signSvixPayload({
      id: "msg_stale",
      timestamp: staleTs,
      rawBody: body,
      secret: testSecret,
    });
    const staleReq = await postResendWebhook(
      new NextRequest("http://localhost:3000/api/webhooks/resend", {
        method: "POST",
        headers: {
          "svix-id": "msg_stale",
          "svix-timestamp": staleTs,
          "svix-signature": staleSig,
        },
        body,
      }),
    );
    expect(staleReq.status).toBe(401);

    const badSigReq = await postResendWebhook(
      new NextRequest("http://localhost:3000/api/webhooks/resend", {
        method: "POST",
        headers: {
          "svix-id": "msg_bad",
          "svix-timestamp": String(nowSec),
          "svix-signature": "v1,deadbeef",
        },
        body,
      }),
    );
    expect(badSigReq.status).toBe(401);
  });

  it("verifies signature, resolves batch/brand metadata, ingests event, and deduplicates svix retries", async () => {
    const batchId = "66666666-6666-4666-8666-666666666666";
    const brandId = "77777777-7777-4777-8777-777777777777";
    const insertedRows: any[] = [];
    const seenSvix = new Set<string>();

    mockGetServiceRoleClient.mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "product_batches") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: batchId, brand_id: brandId },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "email_telemetry_events") {
          return {
            upsert: vi.fn().mockImplementation((row: any) => ({
              select: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockImplementation(async () => {
                  if (row.svix_id && seenSvix.has(row.svix_id)) {
                    return { data: null, error: null };
                  }
                  if (row.svix_id) seenSvix.add(row.svix_id);
                  insertedRows.push(row);
                  return { data: { id: `evt_${insertedRows.length}` }, error: null };
                }),
              }),
            })),
          };
        }
        throw new Error(`Unexpected table ${table}`);
      }),
    });

    const rawBody = JSON.stringify({
      type: "email.opened",
      created_at: "2026-11-25T15:00:00.000Z",
      data: {
        email_id: "re_email_001",
        to: ["Collector@Example.com"],
        subject: "GET BENT CLOTHING · Batch 002 is LIVE",
        tags: {
          app_id: "makerverse",
          channel: "alerts",
          batch_id: batchId,
          brand_slug: "get-bent",
        },
      },
    });

    const ts = String(Math.floor(Date.now() / 1000));
    const sig = signSvixPayload({
      id: "svix_msg_001",
      timestamp: ts,
      rawBody,
      secret: testSecret,
    });

    const firstRes = await postResendWebhook(
      new NextRequest("http://localhost:3000/api/webhooks/resend", {
        method: "POST",
        headers: {
          "svix-id": "svix_msg_001",
          "svix-timestamp": ts,
          "svix-signature": sig,
        },
        body: rawBody,
      }),
    );

    expect(firstRes.status).toBe(200);
    const firstJson = await firstRes.json();
    expect(firstJson).toMatchObject({
      received: true,
      ingested: true,
      deduplicated: false,
      eventType: "email.opened",
      eventId: "evt_1",
      batchId,
      brandId,
      brandSlug: "get-bent",
      autoUnsubscribed: false,
    });

    expect(insertedRows).toHaveLength(1);
    expect(insertedRows[0]).toMatchObject({
      svix_id: "svix_msg_001",
      resend_email_id: "re_email_001",
      event_type: "email.opened",
      app_id: "makerverse",
      channel: "alerts",
      brand_id: brandId,
      brand_slug: "get-bent",
      batch_id: batchId,
      recipient_email: "collector@example.com",
    });

    // Retry with same svix-id must deduplicate cleanly
    const retryRes = await postResendWebhook(
      new NextRequest("http://localhost:3000/api/webhooks/resend", {
        method: "POST",
        headers: {
          "webhook-id": "svix_msg_001",
          "webhook-timestamp": ts,
          "webhook-signature": sig,
        },
        body: rawBody,
      }),
    );

    expect(retryRes.status).toBe(200);
    const retryJson = await retryRes.json();
    expect(retryJson).toMatchObject({
      received: true,
      ingested: false,
      deduplicated: true,
    });
    expect(insertedRows).toHaveLength(1);
  });

  it("ignores non-Makerverse app_id events and auto-unsubscribes on complaints or hard bounces", async () => {
    const unsubUpdates: any[] = [];

    mockGetServiceRoleClient.mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "brands") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: "77777777-7777-4777-8777-777777777777" },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "email_telemetry_events") {
          return {
            upsert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: "evt_bounce_1" },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "drop_subscriptions") {
          return {
            update: vi.fn().mockImplementation((patch: any) => ({
              eq: vi.fn().mockImplementation((_col: string, email: string) => ({
                eq: vi.fn().mockImplementation(async () => {
                  unsubUpdates.push({ email, patch });
                  return { error: null };
                }),
              })),
            })),
          };
        }
        throw new Error(`Unexpected table ${table}`);
      }),
    });

    const ts = String(Math.floor(Date.now() / 1000));

    // 1. Cross-app event should be ignored
    const otherAppBody = JSON.stringify({
      type: "email.delivered",
      data: {
        email_id: "re_valerie_1",
        tags: [{ name: "app_id", value: "valerie" }],
      },
    });
    const otherRes = await postResendWebhook(
      new NextRequest("http://localhost:3000/api/webhooks/resend", {
        method: "POST",
        headers: {
          "svix-id": "svix_other",
          "svix-timestamp": ts,
          "svix-signature": signSvixPayload({
            id: "svix_other",
            timestamp: ts,
            rawBody: otherAppBody,
            secret: testSecret,
          }),
        },
        body: otherAppBody,
      }),
    );
    expect(otherRes.status).toBe(200);
    expect(await otherRes.json()).toMatchObject({
      received: true,
      ignored: true,
      reason: "app_mismatch",
    });

    // 2. Transient bounce should NOT auto-unsubscribe
    const softBounceBody = JSON.stringify({
      type: "email.bounced",
      data: {
        email_id: "re_soft_1",
        to: ["soft@example.com"],
        bounce: { type: "Transient", message: "Mailbox full" },
        tags: { app_id: "makerverse", brand_slug: "get-bent" },
      },
    });
    const softRes = await postResendWebhook(
      new NextRequest("http://localhost:3000/api/webhooks/resend", {
        method: "POST",
        headers: {
          "svix-id": "svix_soft",
          "svix-timestamp": ts,
          "svix-signature": signSvixPayload({
            id: "svix_soft",
            timestamp: ts,
            rawBody: softBounceBody,
            secret: testSecret,
          }),
        },
        body: softBounceBody,
      }),
    );
    expect(softRes.status).toBe(200);
    expect(await softRes.json()).toMatchObject({
      ingested: true,
      autoUnsubscribed: false,
    });
    expect(unsubUpdates).toHaveLength(0);

    // 3. Permanent bounce should auto-unsubscribe
    const hardBounceBody = JSON.stringify({
      type: "email.bounced",
      data: {
        email_id: "re_hard_1",
        to: ["Bounced@Example.com"],
        bounce: { type: "Permanent", message: "User unknown" },
        tags: { app_id: "makerverse", brand_slug: "get-bent" },
      },
    });
    const hardRes = await postResendWebhook(
      new NextRequest("http://localhost:3000/api/webhooks/resend", {
        method: "POST",
        headers: {
          "svix-id": "svix_hard",
          "svix-timestamp": ts,
          "svix-signature": signSvixPayload({
            id: "svix_hard",
            timestamp: ts,
            rawBody: hardBounceBody,
            secret: testSecret,
          }),
        },
        body: hardBounceBody,
      }),
    );
    expect(hardRes.status).toBe(200);
    expect(await hardRes.json()).toMatchObject({
      ingested: true,
      autoUnsubscribed: true,
    });
    expect(unsubUpdates).toEqual([
      {
        email: "bounced@example.com",
        patch: expect.objectContaining({ is_active: false }),
      },
    ]);
  });
});
