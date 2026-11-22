// lib/db/batches.ts
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  MOCK_SCHEDULED_BATCHES,
  resolveBatchLifecycleStatus,
  type ProductBatch,
  type BatchMetadata,
} from "@/lib/drops/lifecycle";
import { IS_MOCK_ENABLED } from "@/lib/mock/adminData";
import type { ChipTier } from "@/lib/mock/shopData";

function mapChipTier(tier: string | null | undefined): ChipTier {
  if (tier === "NTAG424_DNA_CMAC" || tier === "NTAG424_DNA") return "NTAG424_DNA";
  if (tier === "NTAG215_SERIALIZED") return "NTAG215_SERIALIZED";
  if (tier === "NTAG213_SERIALIZED") return "NTAG213_SERIALIZED";
  return "QR_REGISTRY";
}

function mapRowToBatch(row: Record<string, any>): ProductBatch {
  const brandRel = Array.isArray(row.brands) ? row.brands[0] : row.brands;
  const meta = (typeof row.metadata === "object" && row.metadata ? row.metadata : {}) as BatchMetadata;

  const mapped: ProductBatch = {
    id: row.id,
    brandId: row.brand_id,
    brandHandle: brandRel?.slug || row.brand_handle || "get-bent",
    productId: row.product_id ?? null,
    parentBatchId: row.parent_batch_id ?? null,
    title: row.title,
    sku: row.sku || `MKR-${String(row.batch_number ?? 1).padStart(3, "0")}`,
    batchNumber: row.batch_number ?? 1,
    isPublished: Boolean(row.is_published),
    goesLiveAt: row.goes_live_at,
    autoRetireAt: row.auto_retire_at ?? null,
    versionTag: row.version_tag || "v1.0",
    isPublicTeaser: Boolean(row.is_public_teaser),
    artistAttribution: row.artist_attribution ?? null,
    chipTier: mapChipTier(row.chip_tier),
    basePriceCents: row.base_price_cents ?? 2500,
    maxCap: row.max_cap ?? null,
    mintedCount: row.minted_count ?? 0,
    vanityAuctionEnabled: Boolean(row.vanity_auction_enabled),
    metadata: meta,
    notifyCount: row.notify_count ?? 0,
  };

  mapped.releaseStatus =
    row.release_status || resolveBatchLifecycleStatus(mapped);

  return mapped;
}

/**
 * Fetch all batches for the vendor schedule console.
 */
export async function getVendorBatches(brandHandle?: string): Promise<ProductBatch[]> {
  const supabase = getSupabaseServerClient();

  if (supabase) {
    try {
      let query = (supabase.from("v_batch_lifecycle" as any) as any)
        .select("*, brands(slug)")
        .order("goes_live_at", { ascending: true });

      if (brandHandle) {
        const normalized = brandHandle.toLowerCase().replace(/^@/, "");
        query = query.eq("brands.slug", normalized);
      }

      const { data, error } = await query;
      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map(mapRowToBatch);
      }
      if (error) {
        console.warn("[getVendorBatches] Database query notice:", error.message);
      }
    } catch (err) {
      console.warn("[getVendorBatches] Unexpected query error:", err);
    }
  }

  if (!IS_MOCK_ENABLED) {
    return [];
  }

  const normalized = brandHandle?.toLowerCase().replace(/^@/, "");
  const list = normalized
    ? MOCK_SCHEDULED_BATCHES.filter((b) => b.brandHandle.toLowerCase() === normalized)
    : MOCK_SCHEDULED_BATCHES;

  return list.map((b) => ({
    ...b,
    releaseStatus: resolveBatchLifecycleStatus(b),
  }));
}

/**
 * Fetch upcoming SCHEDULED batches with is_public_teaser = true for a brand storefront.
 * Ordered by goes_live_at ASC.
 */
export async function getScheduledTeasers(brandHandle?: string): Promise<ProductBatch[]> {
  const all = await getVendorBatches(brandHandle);
  const now = Date.now();
  return all
    .map((b) => ({
      ...b,
      releaseStatus: resolveBatchLifecycleStatus(b, now),
    }))
    .filter((b) => b.releaseStatus === "SCHEDULED" && b.isPublicTeaser)
    .sort((a, b) => Date.parse(a.goesLiveAt) - Date.parse(b.goesLiveAt));
}

/**
 * Summary payload used by dynamic OpenGraph drop cards.
 */
export async function getActiveDropOgSummary(brandHandle: string): Promise<{
  brandName: string;
  brandHandle: string;
  dropHeadline: string;
  mintedCount: number;
  topBidDollars: number;
  versionTag: string;
  releaseStatus: string;
}> {
  const normalized = brandHandle.toLowerCase().replace(/^@/, "");
  const batches = await getVendorBatches(normalized);
  const activeOrNext =
    batches.find((b) => resolveBatchLifecycleStatus(b) === "LIVE") ||
    batches.find((b) => resolveBatchLifecycleStatus(b) === "SCHEDULED") ||
    batches[0];

  const defaultBrandName =
    normalized === "get-bent"
      ? "GET BENT CLOTHING"
      : normalized
          .split("-")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");

  return {
    brandName: defaultBrandName,
    brandHandle: `@${normalized}`,
    dropHeadline:
      activeOrNext?.title || "Batch 001: The 24-Hour Phygital Drop",
    mintedCount: activeOrNext?.mintedCount ?? (normalized === "get-bent" ? 114 : 0),
    topBidDollars:
      activeOrNext?.metadata?.topBidDollars ?? (normalized === "get-bent" ? 69 : 25),
    versionTag: activeOrNext?.versionTag || "v1.0",
    releaseStatus: activeOrNext
      ? resolveBatchLifecycleStatus(activeOrNext)
      : "LIVE",
  };
}
