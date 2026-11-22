// app/(admin)/vendor/schedule/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient, getSupabaseServiceRoleClient } from "@/lib/supabase/server";
import {
  resolveBatchLifecycleStatus,
  type ProductBatch,
  type BatchMetadata,
} from "@/lib/drops/lifecycle";
import type { ChipTier } from "@/lib/mock/shopData";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ScheduleBatchInput {
  brandId?: string;
  brandHandle?: string;
  title: string;
  sku?: string;
  goesLiveAt: string;
  autoRetireAt?: string | null;
  versionTag?: string;
  isPublicTeaser?: boolean;
  isPublished?: boolean;
  artistAttribution?: string | null;
  parentBatchId?: string | null;
  chipTier?: ChipTier;
  basePriceCents?: number;
  maxCap?: number | null;
  vanityAuctionEnabled?: boolean;
  metadata?: BatchMetadata;
  actorUserId?: string;
}

export interface BatchActionResult {
  success: boolean;
  persistedToDb: boolean;
  batch?: ProductBatch;
  error?: string;
}

async function verifyBrandOwnership(
  supabase: NonNullable<ReturnType<typeof getSupabaseServiceRoleClient>>,
  brandId: string,
  actorUserId?: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!UUID_REGEX.test(brandId)) {
    return { ok: true };
  }

  const { data: brand, error } = await (supabase.from("brands" as any) as any)
    .select("id, owner_id")
    .eq("id", brandId)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!brand) {
    return { ok: false, error: "BRAND_NOT_FOUND" };
  }

  if (brand.owner_id && actorUserId && brand.owner_id !== actorUserId) {
    return { ok: false, error: "FORBIDDEN_BRAND_OWNERSHIP" };
  }

  return { ok: true };
}

function validateScheduleWindow(goesLiveAt: string, autoRetireAt?: string | null): string | null {
  const startMs = Date.parse(goesLiveAt);
  if (!Number.isFinite(startMs)) {
    return "INVALID_GOES_LIVE_AT";
  }

  if (autoRetireAt) {
    const endMs = Date.parse(autoRetireAt);
    if (!Number.isFinite(endMs) || endMs <= startMs) {
      return "AUTO_RETIRE_MUST_BE_AFTER_GOES_LIVE";
    }
  }

  return null;
}

export async function scheduleBatchRelease(
  input: ScheduleBatchInput,
): Promise<BatchActionResult> {
  const title = (input.title || "").trim();
  if (!title) {
    return { success: false, persistedToDb: false, error: "MISSING_TITLE" };
  }

  const windowError = validateScheduleWindow(input.goesLiveAt, input.autoRetireAt);
  if (windowError) {
    return { success: false, persistedToDb: false, error: windowError };
  }

  const brandId = input.brandId || "b0000001-0000-0000-0000-000000000001";
  const brandHandle = (input.brandHandle || "get-bent").toLowerCase().replace(/^@/, "");
  const isPublished = input.isPublished ?? true;
  const isPublicTeaser = input.isPublicTeaser ?? true;
  const versionTag = input.versionTag || "v1.0";
  const chipTier: ChipTier = input.chipTier || "NTAG213_SERIALIZED";

  const candidateBatch: ProductBatch = {
    id: `batch_${Date.now().toString(36)}`,
    brandId,
    brandHandle,
    parentBatchId: input.parentBatchId ?? null,
    title,
    sku: (input.sku || `MKR-${Date.now().toString(36).slice(-4)}`).toUpperCase(),
    batchNumber: 1,
    isPublished,
    goesLiveAt: new Date(input.goesLiveAt).toISOString(),
    autoRetireAt: input.autoRetireAt ? new Date(input.autoRetireAt).toISOString() : null,
    versionTag,
    isPublicTeaser,
    artistAttribution: input.artistAttribution ?? null,
    chipTier,
    basePriceCents: input.basePriceCents ?? 2500,
    maxCap: input.maxCap ?? null,
    mintedCount: 0,
    vanityAuctionEnabled: input.vanityAuctionEnabled ?? true,
    metadata: input.metadata || {},
  };
  candidateBatch.releaseStatus = resolveBatchLifecycleStatus(candidateBatch);

  const supabase = getSupabaseServiceRoleClient() || getSupabaseServerClient();
  if (supabase && UUID_REGEX.test(brandId)) {
    const ownership = await verifyBrandOwnership(supabase as any, brandId, input.actorUserId);
    if (!ownership.ok) {
      return { success: false, persistedToDb: false, error: ownership.error };
    }

    const dbTier = chipTier === "NTAG424_DNA" ? "NTAG424_DNA_CMAC" : chipTier;
    const { data, error } = await (supabase.from("product_batches" as any) as any)
      .insert({
        brand_id: brandId,
        parent_batch_id: input.parentBatchId && UUID_REGEX.test(input.parentBatchId) ? input.parentBatchId : null,
        title: candidateBatch.title,
        sku: candidateBatch.sku,
        is_published: candidateBatch.isPublished,
        goes_live_at: candidateBatch.goesLiveAt,
        auto_retire_at: candidateBatch.autoRetireAt,
        version_tag: candidateBatch.versionTag,
        is_public_teaser: candidateBatch.isPublicTeaser,
        artist_attribution: candidateBatch.artistAttribution,
        chip_tier: dbTier,
        base_price_cents: candidateBatch.basePriceCents,
        max_cap: candidateBatch.maxCap,
        vanity_auction_enabled: candidateBatch.vanityAuctionEnabled,
        metadata: candidateBatch.metadata,
      })
      .select("*")
      .maybeSingle();

    if (error) {
      console.warn("[scheduleBatchRelease] DB notice:", error.message);
      return { success: true, persistedToDb: false, batch: candidateBatch };
    }

    if (data) {
      candidateBatch.id = data.id;
    }

    revalidatePath("/vendor/schedule");
    revalidatePath(`/${brandHandle}`);
    return { success: true, persistedToDb: true, batch: candidateBatch };
  }

  revalidatePath("/vendor/schedule");
  return { success: true, persistedToDb: false, batch: candidateBatch };
}

export async function rescheduleBatchWindow(input: {
  batchId: string;
  goesLiveAt: string;
  autoRetireAt?: string | null;
  isPublished?: boolean;
  actorUserId?: string;
}): Promise<BatchActionResult> {
  if (!input.batchId) {
    return { success: false, persistedToDb: false, error: "MISSING_BATCH_ID" };
  }

  const windowError = validateScheduleWindow(input.goesLiveAt, input.autoRetireAt);
  if (windowError) {
    return { success: false, persistedToDb: false, error: windowError };
  }

  const normalizedLive = new Date(input.goesLiveAt).toISOString();
  const normalizedRetire = input.autoRetireAt ? new Date(input.autoRetireAt).toISOString() : null;
  const supabase = getSupabaseServiceRoleClient() || getSupabaseServerClient();

  if (supabase && UUID_REGEX.test(input.batchId)) {
    const { data: existing, error: fetchErr } = await (supabase.from("product_batches" as any) as any)
      .select("id, brand_id, is_published")
      .eq("id", input.batchId)
      .maybeSingle();

    if (fetchErr) {
      return { success: false, persistedToDb: false, error: fetchErr.message };
    }
    if (!existing) {
      return { success: false, persistedToDb: false, error: "BATCH_NOT_FOUND" };
    }

    const ownership = await verifyBrandOwnership(supabase as any, existing.brand_id, input.actorUserId);
    if (!ownership.ok) {
      return { success: false, persistedToDb: false, error: ownership.error };
    }

    const { error: updateErr } = await (supabase.from("product_batches" as any) as any)
      .update({
        goes_live_at: normalizedLive,
        auto_retire_at: normalizedRetire,
        ...(input.isPublished !== undefined ? { is_published: input.isPublished } : {}),
      })
      .eq("id", input.batchId);

    if (updateErr) {
      return { success: false, persistedToDb: false, error: updateErr.message };
    }

    revalidatePath("/vendor/schedule");
    return { success: true, persistedToDb: true };
  }

  return { success: true, persistedToDb: false };
}

export async function togglePublicTeaser(input: {
  batchId: string;
  isPublicTeaser: boolean;
  actorUserId?: string;
}): Promise<BatchActionResult> {
  if (!input.batchId) {
    return { success: false, persistedToDb: false, error: "MISSING_BATCH_ID" };
  }

  const supabase = getSupabaseServiceRoleClient() || getSupabaseServerClient();
  if (supabase && UUID_REGEX.test(input.batchId)) {
    const { data: existing, error: fetchErr } = await (supabase.from("product_batches" as any) as any)
      .select("id, brand_id")
      .eq("id", input.batchId)
      .maybeSingle();

    if (fetchErr) {
      return { success: false, persistedToDb: false, error: fetchErr.message };
    }
    if (!existing) {
      return { success: false, persistedToDb: false, error: "BATCH_NOT_FOUND" };
    }

    const ownership = await verifyBrandOwnership(supabase as any, existing.brand_id, input.actorUserId);
    if (!ownership.ok) {
      return { success: false, persistedToDb: false, error: ownership.error };
    }

    const { error: updateErr } = await (supabase.from("product_batches" as any) as any)
      .update({ is_public_teaser: input.isPublicTeaser })
      .eq("id", input.batchId);

    if (updateErr) {
      return { success: false, persistedToDb: false, error: updateErr.message };
    }

    revalidatePath("/vendor/schedule");
    return { success: true, persistedToDb: true };
  }

  return { success: true, persistedToDb: false };
}
