// lib/email/dropAlerts.ts
import { createEmailClient, type BatchNotificationMessage, type EmailClient } from "@digitalcanopy/email";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import {
  buildDropAlertEmailContent,
  type DropEmailContent,
  type LiveDropBatchSummary,
} from "./dropAlertTemplate";

export { buildDropAlertEmailContent, type DropEmailContent, type LiveDropBatchSummary };

const DEFAULT_BASE_URL = "https://makerverse.sunshade.icu";
const DEFAULT_ALERTS_FROM = "Makerverse Drops <drops@mail.madeintheshade.wtf>";
const DEFAULT_TRANSACTIONAL_FROM = "Makerverse <auth@madeintheshade.wtf>";

export function getMakerverseBaseUrl(): string {
  const raw =
    process.env.MAKERVERSE_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    DEFAULT_BASE_URL;
  return raw.replace(/\/+$/, "");
}

export function getMakerverseEmailClient(): EmailClient {
  const apiKey = process.env.RESEND_API_KEY || "";
  const alertsFrom =
    process.env.MAKERVERSE_ALERTS_FROM_EMAIL || DEFAULT_ALERTS_FROM;
  const defaultFrom =
    process.env.MAKERVERSE_DEFAULT_FROM_EMAIL || DEFAULT_TRANSACTIONAL_FROM;

  return createEmailClient({
    apiKey,
    appId: "makerverse",
    defaultFrom,
    alertsFrom,
    dryRun: !apiKey,
  });
}

export interface DispatchDropAlertsResult {
  processedBatches: number;
  emailsDispatched: number;
  skippedBatches: number;
  batchResults: Array<{
    batchId: string;
    title: string;
    recipientCount: number;
    dispatchedCount: number;
    dryRun: boolean;
  }>;
}

interface SubscriptionRow {
  email: string;
  unsubscribe_token: string;
  target_type: "brand" | "product_line" | "batch";
  target_id: string;
}

const DEFAULT_LEASE_MINUTES = 10;
const DEFAULT_MAX_BATCH_AGE_HOURS = 24;

function getDefaultMaxBatchAgeHours(): number {
  const parsed = Number(process.env.DROP_ALERT_MAX_AGE_HOURS);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return DEFAULT_MAX_BATCH_AGE_HOURS;
}

/**
 * Detects newly LIVE batches with `drop_alert_sent_at IS NULL`, atomically claims
 * each batch via a time-bounded `drop_alert_claimed_at` lease to prevent duplicate blasts,
 * resolves active brand/product_line/batch subscribers deduplicated by email,
 * and dispatches via `@digitalcanopy/email` (stamping `drop_alert_sent_at` only on live send).
 */
export async function dispatchPendingDropAlerts(params: {
  supabase: SupabaseClient<Database, "makerverse">;
  emailClient?: EmailClient;
  batchId?: string;
  appBaseUrl?: string;
  maxBatchAgeHours?: number;
}): Promise<DispatchDropAlertsResult> {
  const { supabase, batchId } = params;
  const emailClient = params.emailClient ?? getMakerverseEmailClient();
  const appBaseUrl = (params.appBaseUrl ?? getMakerverseBaseUrl()).replace(/\/+$/, "");
  const maxBatchAgeHours = params.maxBatchAgeHours ?? getDefaultMaxBatchAgeHours();

  let query = (supabase.from("v_batch_lifecycle" as any) as any)
    .select("*")
    .eq("release_status", "LIVE")
    .is("drop_alert_sent_at", null);

  if (batchId) {
    query = query.eq("id", batchId);
  } else if (
    Number.isFinite(maxBatchAgeHours) &&
    maxBatchAgeHours > 0 &&
    typeof query?.gte === "function"
  ) {
    const cutoffIso = new Date(
      Date.now() - maxBatchAgeHours * 60 * 60 * 1000,
    ).toISOString();
    query = query.gte("goes_live_at", cutoffIso);
  }

  const { data: liveBatches, error: queryErr } = await query;
  if (queryErr) {
    throw new Error(`Failed to query live batches: ${queryErr.message}`);
  }

  if (!Array.isArray(liveBatches) || liveBatches.length === 0) {
    return {
      processedBatches: 0,
      emailsDispatched: 0,
      skippedBatches: 0,
      batchResults: [],
    };
  }

  let processedBatches = 0;
  let emailsDispatched = 0;
  let skippedBatches = 0;
  const batchResults: DispatchDropAlertsResult["batchResults"] = [];

  for (const row of liveBatches) {
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const staleCutoffIso = new Date(
      nowMs - DEFAULT_LEASE_MINUTES * 60 * 1000,
    ).toISOString();

    let claimQuery = (supabase.from("product_batches" as any) as any)
      .update({ drop_alert_claimed_at: nowIso })
      .eq("id", row.id)
      .is("drop_alert_sent_at", null);

    if (typeof claimQuery?.or === "function") {
      claimQuery = claimQuery.or(
        `drop_alert_claimed_at.is.null,drop_alert_claimed_at.lt.${staleCutoffIso}`,
      );
    }

    const { data: claimed, error: claimErr } = await claimQuery
      .select("id")
      .maybeSingle();

    if (claimErr) {
      throw new Error(`Failed to claim batch ${row.id}: ${claimErr.message}`);
    }
    if (!claimed) {
      skippedBatches++;
      continue;
    }

    try {
      const { data: brandRow } = await (supabase.from("brands" as any) as any)
        .select("id, name, slug")
        .eq("id", row.brand_id)
        .maybeSingle();

      const brandSlug = brandRow?.slug || "get-bent";
      const brandName = brandRow?.name || brandSlug.toUpperCase();

      let productLineId: string | null = row.product_line_id ?? null;
      if (!productLineId && row.product_id) {
        const { data: prodRow } = await (supabase.from("products" as any) as any)
          .select("product_line_id")
          .eq("id", row.product_id)
          .maybeSingle();
        productLineId = prodRow?.product_line_id ?? null;
      }

      const targetIds = Array.from(
        new Set(
          [row.brand_id, brandSlug, productLineId, row.id].filter(
            (v): v is string => typeof v === "string" && v.length > 0,
          ),
        ),
      );

      const { data: subsData, error: subsErr } = await (
        supabase.from("drop_subscriptions" as any) as any
      )
        .select("email, unsubscribe_token, target_type, target_id")
        .eq("is_active", true)
        .in("target_id", targetIds);

      if (subsErr) {
        throw new Error(`Failed to load drop subscriptions: ${subsErr.message}`);
      }

      const dedupedByEmail = new Map<string, SubscriptionRow>();
      for (const sub of (subsData || []) as SubscriptionRow[]) {
        const matchesBrand =
          sub.target_type === "brand" &&
          (sub.target_id === row.brand_id || sub.target_id === brandSlug);
        const matchesLine =
          sub.target_type === "product_line" &&
          Boolean(productLineId) &&
          sub.target_id === productLineId;
        const matchesBatch =
          sub.target_type === "batch" && sub.target_id === row.id;

        if (!matchesBrand && !matchesLine && !matchesBatch) {
          continue;
        }

        const cleanEmail = (sub.email || "").trim().toLowerCase();
        if (!cleanEmail || !cleanEmail.includes("@")) continue;
        if (!dedupedByEmail.has(cleanEmail)) {
          dedupedByEmail.set(cleanEmail, { ...sub, email: cleanEmail });
        }
      }

      const subscribers = Array.from(dedupedByEmail.values());
      const summary: LiveDropBatchSummary = {
        id: row.id,
        brandId: row.brand_id,
        brandName,
        brandSlug,
        productId: row.product_id ?? null,
        productLineId,
        title: row.title,
        sku: row.sku ?? null,
        versionTag: row.version_tag || "v1.0",
        artistAttribution: row.artist_attribution ?? null,
        basePriceCents: row.base_price_cents ?? 2500,
        maxCap: row.max_cap ?? null,
        vanityAuctionEnabled: Boolean(row.vanity_auction_enabled),
        chipTier: String(row.chip_tier || "NTAG213_SERIALIZED"),
      };

      let dispatchedCount = 0;
      let dryRun = false;

      if (subscribers.length > 0) {
        const messages: BatchNotificationMessage[] = subscribers.map((sub) => {
          const unsubscribeUrl = `${appBaseUrl}/api/unsubscribe?token=${encodeURIComponent(
            sub.unsubscribe_token,
          )}`;
          const content = buildDropAlertEmailContent({
            batch: summary,
            appBaseUrl,
            unsubscribeUrl,
          });
          return {
            to: sub.email,
            subject: content.subject,
            html: content.html,
            text: content.text,
            unsubscribeUrl,
            tags: {
              batch_id: row.id,
              brand_slug: brandSlug,
            },
          };
        });

        const dispatchRes = await emailClient.sendBatchNotification(messages, {
          idempotencyKey: `drop-alert:${row.id}`,
        });
        dispatchedCount = dispatchRes.totalSent;
        dryRun = dispatchRes.dryRun;
      }

      if (dryRun) {
        await (supabase.from("product_batches" as any) as any)
          .update({ drop_alert_claimed_at: null })
          .eq("id", row.id);
      } else {
        await (supabase.from("product_batches" as any) as any)
          .update({
            drop_alert_sent_at: new Date().toISOString(),
            drop_alert_claimed_at: null,
          })
          .eq("id", row.id);
      }

      processedBatches++;
      emailsDispatched += dispatchedCount;
      batchResults.push({
        batchId: row.id,
        title: row.title,
        recipientCount: subscribers.length,
        dispatchedCount,
        dryRun,
      });
    } catch (err) {
      await (supabase.from("product_batches" as any) as any)
        .update({ drop_alert_claimed_at: null })
        .eq("id", row.id);
      throw err;
    }
  }

  return {
    processedBatches,
    emailsDispatched,
    skippedBatches,
    batchResults,
  };
}
