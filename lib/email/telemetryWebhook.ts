// lib/email/telemetryWebhook.ts
import crypto from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/types";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEFAULT_TOLERANCE_SECONDS = 300;

export interface WebhookSignatureHeaders {
  id: string;
  timestamp: string;
  signature: string;
}

export interface VerifyWebhookResult {
  ok: boolean;
  error?: string;
}

export interface ResendWebhookPayload {
  type: string;
  created_at?: string;
  data: {
    email_id?: string;
    message_id?: string;
    from?: string;
    to?: string[] | string;
    subject?: string;
    created_at?: string;
    tags?: Record<string, string> | Array<{ name: string; value: string }>;
    bounce?: {
      message?: string;
      subType?: string;
      type?: string;
    };
    click?: {
      ipAddress?: string;
      link?: string;
      timestamp?: string;
      userAgent?: string;
    };
    failed?: {
      reason?: string;
    };
    suppressed?: {
      message?: string;
      type?: string;
    };
    [key: string]: unknown;
  };
}

export interface IngestResendWebhookResult {
  received: boolean;
  ingested: boolean;
  deduplicated: boolean;
  ignored?: boolean;
  reason?: string;
  eventType: string;
  eventId: string | null;
  resendEmailId?: string;
  batchId: string | null;
  brandId: string | null;
  brandSlug: string | null;
  autoUnsubscribed: boolean;
}

export function extractWebhookHeaders(hdrs: Headers): WebhookSignatureHeaders {
  return {
    id: (hdrs.get("svix-id") || hdrs.get("webhook-id") || "").trim(),
    timestamp: (hdrs.get("svix-timestamp") || hdrs.get("webhook-timestamp") || "").trim(),
    signature: (hdrs.get("svix-signature") || hdrs.get("webhook-signature") || "").trim(),
  };
}

function decodeWebhookSecret(secret: string): Buffer {
  const trimmed = secret.trim();
  if (trimmed.startsWith("whsec_")) {
    return Buffer.from(trimmed.slice("whsec_".length), "base64");
  }
  return Buffer.from(trimmed, "utf8");
}

/**
 * Verifies Svix / StandardWebhooks HMAC-SHA256 signatures sent by Resend webhooks.
 */
export function verifyResendWebhookSignature(params: {
  rawBody: string;
  headers: WebhookSignatureHeaders;
  secret: string;
  nowSeconds?: number;
  toleranceSeconds?: number;
}): VerifyWebhookResult {
  const { rawBody, headers, secret } = params;
  const tolerance = params.toleranceSeconds ?? DEFAULT_TOLERANCE_SECONDS;

  if (!secret || !secret.trim()) {
    return { ok: false, error: "Webhook signing secret is not configured" };
  }

  if (!headers.id || !headers.timestamp || !headers.signature) {
    return { ok: false, error: "Missing webhook signature headers" };
  }

  const tsSeconds = Number(headers.timestamp);
  if (!Number.isFinite(tsSeconds) || !Number.isInteger(tsSeconds)) {
    return { ok: false, error: "Invalid webhook timestamp header" };
  }

  const nowSeconds = params.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - tsSeconds) > tolerance) {
    return { ok: false, error: "Webhook timestamp outside replay tolerance" };
  }

  const secretKey = decodeWebhookSecret(secret);
  const signedContent = `${headers.id}.${headers.timestamp}.${rawBody}`;
  const expectedBase64 = crypto
    .createHmac("sha256", secretKey)
    .update(signedContent, "utf8")
    .digest("base64");
  const expectedBuf = Buffer.from(expectedBase64, "utf8");

  const candidateTokens = headers.signature.split(/\s+/).filter(Boolean);
  for (const token of candidateTokens) {
    const commaIdx = token.indexOf(",");
    if (commaIdx <= 0) continue;
    const version = token.slice(0, commaIdx);
    const sigValue = token.slice(commaIdx + 1);
    if (version !== "v1" || !sigValue) continue;

    const actualBuf = Buffer.from(sigValue, "utf8");
    if (actualBuf.length === expectedBuf.length && crypto.timingSafeEqual(actualBuf, expectedBuf)) {
      return { ok: true };
    }
  }

  return { ok: false, error: "Invalid webhook signature" };
}

export function normalizeResendTags(tags: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!tags) return out;

  if (Array.isArray(tags)) {
    for (const entry of tags) {
      if (
        entry &&
        typeof entry === "object" &&
        typeof (entry as { name?: unknown }).name === "string" &&
        typeof (entry as { value?: unknown }).value === "string"
      ) {
        const key = (entry as { name: string }).name.trim();
        const val = (entry as { value: string }).value.trim();
        if (key) out[key] = val;
      }
    }
    return out;
  }

  if (typeof tags === "object") {
    for (const [k, v] of Object.entries(tags as Record<string, unknown>)) {
      if (typeof v === "string" && k.trim()) {
        out[k.trim()] = v.trim();
      }
    }
  }

  return out;
}

function extractRecipientEmail(toField: unknown): string | null {
  const raw = Array.isArray(toField) ? toField[0] : toField;
  if (typeof raw !== "string") return null;
  const cleaned = raw.trim().toLowerCase();
  if (!cleaned || !cleaned.includes("@")) return null;
  return cleaned;
}

function resolveOccurredAt(dataCreatedAt: unknown, topCreatedAt: unknown): string {
  for (const candidate of [dataCreatedAt, topCreatedAt]) {
    if (typeof candidate === "string" && candidate.trim()) {
      const ms = Date.parse(candidate);
      if (Number.isFinite(ms)) {
        return new Date(ms).toISOString();
      }
    }
  }
  return new Date().toISOString();
}

function shouldAutoUnsubscribe(eventType: string, data: ResendWebhookPayload["data"]): boolean {
  if (eventType === "email.complained" || eventType === "email.suppressed") {
    return true;
  }
  if (eventType === "email.bounced") {
    const bounceType = String(data.bounce?.type || "").trim().toLowerCase();
    return bounceType !== "transient";
  }
  return false;
}

/**
 * Normalizes and persists a verified Resend webhook event into `makerverse.email_telemetry_events`.
 * Enforces `svix_id` idempotency and automatically deactivates `drop_subscriptions` on complaints/hard bounces.
 */
export async function ingestResendWebhookEvent(params: {
  supabase: SupabaseClient<Database, "makerverse">;
  payload: ResendWebhookPayload;
  svixId?: string | null;
}): Promise<IngestResendWebhookResult> {
  const { supabase, payload } = params;
  const eventType = String(payload.type || "").trim();
  const data = payload.data;

  if (!eventType.startsWith("email.")) {
    return {
      received: true,
      ingested: false,
      deduplicated: false,
      ignored: true,
      reason: "non_email_event",
      eventType,
      eventId: null,
      batchId: null,
      brandId: null,
      brandSlug: null,
      autoUnsubscribed: false,
    };
  }

  const tags = normalizeResendTags(data.tags);
  if (tags.app_id && tags.app_id !== "makerverse") {
    return {
      received: true,
      ingested: false,
      deduplicated: false,
      ignored: true,
      reason: "app_mismatch",
      eventType,
      eventId: null,
      batchId: null,
      brandId: null,
      brandSlug: null,
      autoUnsubscribed: false,
    };
  }

  const resendEmailId = String(data.email_id || data.message_id || "").trim();
  if (!resendEmailId) {
    throw new Error("MISSING_RESEND_EMAIL_ID");
  }

  const channel = tags.channel || null;
  const brandSlug = tags.brand_slug ? tags.brand_slug.toLowerCase().replace(/^@/, "") : null;
  const candidateBatchId = tags.batch_id && UUID_REGEX.test(tags.batch_id) ? tags.batch_id : null;
  const candidateBrandId = tags.brand_id && UUID_REGEX.test(tags.brand_id) ? tags.brand_id : null;

  let resolvedBatchId: string | null = null;
  let resolvedBrandId: string | null = null;

  if (candidateBatchId) {
    const { data: batchRow } = await (supabase.from("product_batches" as any) as any)
      .select("id, brand_id")
      .eq("id", candidateBatchId)
      .maybeSingle();

    if (batchRow?.id) {
      resolvedBatchId = batchRow.id;
      resolvedBrandId = batchRow.brand_id ?? null;
    }
  }

  if (!resolvedBrandId && candidateBrandId) {
    const { data: brandById } = await (supabase.from("brands" as any) as any)
      .select("id")
      .eq("id", candidateBrandId)
      .maybeSingle();

    if (brandById?.id) {
      resolvedBrandId = brandById.id;
    }
  }

  if (!resolvedBrandId && brandSlug) {
    const { data: brandBySlug } = await (supabase.from("brands" as any) as any)
      .select("id")
      .eq("slug", brandSlug)
      .maybeSingle();

    if (brandBySlug?.id) {
      resolvedBrandId = brandBySlug.id;
    }
  }

  const recipientEmail = extractRecipientEmail(data.to);
  const occurredAt = resolveOccurredAt(data.created_at, payload.created_at);
  const svixId = params.svixId?.trim() || null;

  const row = {
    svix_id: svixId,
    resend_email_id: resendEmailId,
    event_type: eventType,
    app_id: tags.app_id || "makerverse",
    channel,
    brand_id: resolvedBrandId,
    brand_slug: brandSlug,
    batch_id: resolvedBatchId,
    recipient_email: recipientEmail,
    subject: typeof data.subject === "string" ? data.subject : null,
    occurred_at: occurredAt,
    payload: payload as unknown as Json,
  };

  let eventId: string | null = null;
  let deduplicated = false;

  if (svixId) {
    const { data: upserted, error: upsertErr } = await (
      supabase.from("email_telemetry_events" as any) as any
    )
      .upsert(row, { onConflict: "svix_id", ignoreDuplicates: true })
      .select("id")
      .maybeSingle();

    if (upsertErr) {
      if (upsertErr.code === "23505") {
        deduplicated = true;
      } else {
        throw new Error(`Failed to ingest email telemetry event: ${upsertErr.message}`);
      }
    } else if (!upserted) {
      deduplicated = true;
    } else {
      eventId = upserted.id ?? null;
    }
  } else {
    const { data: inserted, error: insertErr } = await (
      supabase.from("email_telemetry_events" as any) as any
    )
      .insert(row)
      .select("id")
      .maybeSingle();

    if (insertErr) {
      if (insertErr.code === "23505") {
        deduplicated = true;
      } else {
        throw new Error(`Failed to ingest email telemetry event: ${insertErr.message}`);
      }
    } else {
      eventId = inserted?.id ?? null;
    }
  }

  let autoUnsubscribed = false;
  if (!deduplicated && recipientEmail && shouldAutoUnsubscribe(eventType, data)) {
    const { error: unsubErr } = await (supabase.from("drop_subscriptions" as any) as any)
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("email", recipientEmail)
      .eq("is_active", true);

    if (!unsubErr) {
      autoUnsubscribed = true;
    }
  }

  return {
    received: true,
    ingested: !deduplicated,
    deduplicated,
    eventType,
    eventId,
    resendEmailId,
    batchId: resolvedBatchId,
    brandId: resolvedBrandId,
    brandSlug,
    autoUnsubscribed,
  };
}
