// lib/db/emailTelemetry.ts
import { getSupabaseServerClient, getSupabaseServiceRoleClient } from "@/lib/supabase/server";

export interface BatchEmailTelemetryMetrics {
  batchId: string;
  batchTitle?: string;
  brandSlug?: string;
  sent: number;
  delivered: number;
  delayed: number;
  opened: number;
  clicked: number;
  bounced: number;
  complained: number;
  suppressed: number;
  failed: number;
  deliveryRatePct: number;
  openRatePct: number;
  clickRatePct: number;
  lastEventAt: string | null;
}

export interface FollowerReachSummary {
  uniqueSubscribers: number;
  brandFollowers: number;
  productLineFollowers: number;
  batchNotifySignups: number;
}

export interface VendorEmailTelemetry {
  reach: FollowerReachSummary;
  totals: {
    sent: number;
    delivered: number;
    delayed: number;
    opened: number;
    clicked: number;
    bounced: number;
    complained: number;
    suppressed: number;
    failed: number;
    deliveryRatePct: number;
    openRatePct: number;
    clickRatePct: number;
    issueCount: number;
    dispatchedBatches: number;
    lastEventAt: string | null;
  };
  byBatch: Record<string, BatchEmailTelemetryMetrics>;
  recentBatches: BatchEmailTelemetryMetrics[];
}

export const EMPTY_VENDOR_EMAIL_TELEMETRY: VendorEmailTelemetry = {
  reach: {
    uniqueSubscribers: 0,
    brandFollowers: 0,
    productLineFollowers: 0,
    batchNotifySignups: 0,
  },
  totals: {
    sent: 0,
    delivered: 0,
    delayed: 0,
    opened: 0,
    clicked: 0,
    bounced: 0,
    complained: 0,
    suppressed: 0,
    failed: 0,
    deliveryRatePct: 0,
    openRatePct: 0,
    clickRatePct: 0,
    issueCount: 0,
    dispatchedBatches: 0,
    lastEventAt: null,
  },
  byBatch: {},
  recentBatches: [],
};

export interface RawTelemetryEventRow {
  resend_email_id: string;
  event_type: string;
  batch_id: string | null;
  brand_id: string | null;
  brand_slug: string | null;
  occurred_at: string;
}

export interface RawSubscriptionRow {
  email: string;
  target_type: "brand" | "product_line" | "batch";
  target_id: string;
}

export interface RawDispatchedBatchRow {
  id: string;
  title: string;
  brand_id: string;
  drop_alert_sent_at: string | null;
  brands?: { slug?: string | null } | Array<{ slug?: string | null }> | null;
}

function calcRatePct(numerator: number, denominator: number): number {
  if (denominator <= 0 || numerator <= 0) return 0;
  return Math.min(100, Math.round((numerator / denominator) * 1000) / 10);
}

interface EventBuckets {
  sent: Set<string>;
  delivered: Set<string>;
  delayed: Set<string>;
  opened: Set<string>;
  clicked: Set<string>;
  bounced: Set<string>;
  complained: Set<string>;
  suppressed: Set<string>;
  failed: Set<string>;
  lastEventAt: string | null;
  brandSlug?: string;
}

function createBuckets(brandSlug?: string): EventBuckets {
  return {
    sent: new Set(),
    delivered: new Set(),
    delayed: new Set(),
    opened: new Set(),
    clicked: new Set(),
    bounced: new Set(),
    complained: new Set(),
    suppressed: new Set(),
    failed: new Set(),
    lastEventAt: null,
    brandSlug,
  };
}

function recordIntoBuckets(buckets: EventBuckets, row: RawTelemetryEventRow): void {
  const emailKey = (row.resend_email_id || "").trim();
  if (!emailKey) return;

  switch (row.event_type) {
    case "email.sent":
      buckets.sent.add(emailKey);
      break;
    case "email.delivered":
      buckets.delivered.add(emailKey);
      break;
    case "email.delivery_delayed":
      buckets.delayed.add(emailKey);
      break;
    case "email.opened":
      buckets.opened.add(emailKey);
      break;
    case "email.clicked":
      buckets.clicked.add(emailKey);
      break;
    case "email.bounced":
      buckets.bounced.add(emailKey);
      break;
    case "email.complained":
      buckets.complained.add(emailKey);
      break;
    case "email.suppressed":
      buckets.suppressed.add(emailKey);
      break;
    case "email.failed":
      buckets.failed.add(emailKey);
      break;
    default:
      break;
  }

  if (row.occurred_at && (!buckets.lastEventAt || row.occurred_at > buckets.lastEventAt)) {
    buckets.lastEventAt = row.occurred_at;
  }
  if (!buckets.brandSlug && row.brand_slug) {
    buckets.brandSlug = row.brand_slug;
  }
}

function finalizeBatchMetrics(
  batchId: string,
  buckets: EventBuckets,
  meta?: { title?: string; brandSlug?: string },
): BatchEmailTelemetryMetrics {
  const sent = buckets.sent.size;
  const delivered = buckets.delivered.size;
  return {
    batchId,
    batchTitle: meta?.title,
    brandSlug: meta?.brandSlug || buckets.brandSlug,
    sent,
    delivered,
    delayed: buckets.delayed.size,
    opened: buckets.opened.size,
    clicked: buckets.clicked.size,
    bounced: buckets.bounced.size,
    complained: buckets.complained.size,
    suppressed: buckets.suppressed.size,
    failed: buckets.failed.size,
    deliveryRatePct: calcRatePct(delivered, sent),
    openRatePct: calcRatePct(buckets.opened.size, delivered),
    clickRatePct: calcRatePct(buckets.clicked.size, delivered),
    lastEventAt: buckets.lastEventAt,
  };
}

/**
 * Pure aggregator transforming raw Supabase telemetry, subscription, and batch rows
 * into privacy-safe vendor email reach and drop engagement metrics.
 */
export function aggregateEmailTelemetryRows(params: {
  events: RawTelemetryEventRow[];
  subscriptions: RawSubscriptionRow[];
  dispatchedBatches?: RawDispatchedBatchRow[];
}): VendorEmailTelemetry {
  const uniqueEmails = new Set<string>();
  const brandEmails = new Set<string>();
  const lineEmails = new Set<string>();
  const batchEmails = new Set<string>();

  for (const sub of params.subscriptions) {
    const clean = (sub.email || "").trim().toLowerCase();
    if (!clean || !clean.includes("@")) continue;
    uniqueEmails.add(clean);
    if (sub.target_type === "brand") brandEmails.add(clean);
    else if (sub.target_type === "product_line") lineEmails.add(clean);
    else if (sub.target_type === "batch") batchEmails.add(clean);
  }

  const batchMetaMap = new Map<string, { title: string; brandSlug?: string }>();
  for (const batch of params.dispatchedBatches || []) {
    const brandRel = Array.isArray(batch.brands) ? batch.brands[0] : batch.brands;
    batchMetaMap.set(batch.id, {
      title: batch.title,
      brandSlug: brandRel?.slug || undefined,
    });
  }

  const totalBuckets = createBuckets();
  const batchBucketsMap = new Map<string, EventBuckets>();

  for (const ev of params.events) {
    recordIntoBuckets(totalBuckets, ev);
    if (ev.batch_id) {
      let bucket = batchBucketsMap.get(ev.batch_id);
      if (!bucket) {
        bucket = createBuckets(ev.brand_slug || undefined);
        batchBucketsMap.set(ev.batch_id, bucket);
      }
      recordIntoBuckets(bucket, ev);
    }
  }

  const byBatch: Record<string, BatchEmailTelemetryMetrics> = {};
  for (const [batchId, bucket] of batchBucketsMap.entries()) {
    byBatch[batchId] = finalizeBatchMetrics(batchId, bucket, batchMetaMap.get(batchId));
  }

  // Include dispatched batches that may not have webhook events yet
  for (const batch of params.dispatchedBatches || []) {
    if (batch.drop_alert_sent_at && !byBatch[batch.id]) {
      const meta = batchMetaMap.get(batch.id);
      byBatch[batch.id] = {
        batchId: batch.id,
        batchTitle: meta?.title,
        brandSlug: meta?.brandSlug,
        sent: 0,
        delivered: 0,
        delayed: 0,
        opened: 0,
        clicked: 0,
        bounced: 0,
        complained: 0,
        suppressed: 0,
        failed: 0,
        deliveryRatePct: 0,
        openRatePct: 0,
        clickRatePct: 0,
        lastEventAt: batch.drop_alert_sent_at,
      };
    }
  }

  const recentBatches = Object.values(byBatch).sort((a, b) => {
    const aMs = a.lastEventAt ? Date.parse(a.lastEventAt) : 0;
    const bMs = b.lastEventAt ? Date.parse(b.lastEventAt) : 0;
    return bMs - aMs;
  });

  const sent = totalBuckets.sent.size;
  const delivered = totalBuckets.delivered.size;
  const bounced = totalBuckets.bounced.size;
  const complained = totalBuckets.complained.size;
  const suppressed = totalBuckets.suppressed.size;
  const failed = totalBuckets.failed.size;
  const dispatchedCount = new Set([
    ...(params.dispatchedBatches || []).filter((b) => Boolean(b.drop_alert_sent_at)).map((b) => b.id),
    ...batchBucketsMap.keys(),
  ]).size;

  return {
    reach: {
      uniqueSubscribers: uniqueEmails.size,
      brandFollowers: brandEmails.size,
      productLineFollowers: lineEmails.size,
      batchNotifySignups: batchEmails.size,
    },
    totals: {
      sent,
      delivered,
      delayed: totalBuckets.delayed.size,
      opened: totalBuckets.opened.size,
      clicked: totalBuckets.clicked.size,
      bounced,
      complained,
      suppressed,
      failed,
      deliveryRatePct: calcRatePct(delivered, sent),
      openRatePct: calcRatePct(totalBuckets.opened.size, delivered),
      clickRatePct: calcRatePct(totalBuckets.clicked.size, delivered),
      issueCount: bounced + complained + suppressed + failed,
      dispatchedBatches: dispatchedCount,
      lastEventAt: totalBuckets.lastEventAt,
    },
    byBatch,
    recentBatches,
  };
}

/**
 * Fetches aggregated drop email telemetry and subscriber reach for the vendor portal.
 * Returns zeroed metrics on empty tables or unconfigured environments (never synthetic fake data).
 */
export async function getVendorEmailTelemetry(options?: {
  brandHandle?: string;
}): Promise<VendorEmailTelemetry> {
  const supabase = getSupabaseServiceRoleClient() || getSupabaseServerClient();
  if (!supabase) {
    return EMPTY_VENDOR_EMAIL_TELEMETRY;
  }

  const normalizedBrand = options?.brandHandle?.trim().toLowerCase().replace(/^@/, "") || "";

  try {
    let eventsQuery = (supabase.from("email_telemetry_events" as any) as any)
      .select("resend_email_id, event_type, batch_id, brand_id, brand_slug, occurred_at")
      .eq("app_id", "makerverse")
      .order("occurred_at", { ascending: false })
      .limit(5000);

    if (normalizedBrand) {
      eventsQuery = eventsQuery.eq("brand_slug", normalizedBrand);
    }

    const subsQuery = (supabase.from("drop_subscriptions" as any) as any)
      .select("email, target_type, target_id")
      .eq("is_active", true);

    const batchesQuery = (supabase.from("product_batches" as any) as any)
      .select("id, title, brand_id, drop_alert_sent_at, brands(slug)")
      .not("drop_alert_sent_at", "is", null)
      .order("drop_alert_sent_at", { ascending: false })
      .limit(50);

    const [eventsRes, subsRes, batchesRes] = await Promise.all([
      eventsQuery,
      subsQuery,
      batchesQuery,
    ]);

    const events: RawTelemetryEventRow[] = Array.isArray(eventsRes?.data)
      ? eventsRes.data
      : [];
    const subscriptions: RawSubscriptionRow[] = Array.isArray(subsRes?.data)
      ? subsRes.data
      : [];
    const dispatchedBatches: RawDispatchedBatchRow[] = Array.isArray(batchesRes?.data)
      ? batchesRes.data
      : [];

    const filteredBatches = normalizedBrand
      ? dispatchedBatches.filter((b) => {
          const rel = Array.isArray(b.brands) ? b.brands[0] : b.brands;
          return rel?.slug?.toLowerCase() === normalizedBrand;
        })
      : dispatchedBatches;

    return aggregateEmailTelemetryRows({
      events,
      subscriptions,
      dispatchedBatches: filteredBatches,
    });
  } catch (err) {
    console.warn("[getVendorEmailTelemetry] Telemetry query notice:", err);
    return EMPTY_VENDOR_EMAIL_TELEMETRY;
  }
}
