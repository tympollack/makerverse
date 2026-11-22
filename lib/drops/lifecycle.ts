// lib/drops/lifecycle.ts
import type { ChipTier } from "@/lib/mock/shopData";
import { IS_MOCK_ENABLED } from "@/lib/mock/adminData";

export type BatchReleaseStatus = "DRAFT" | "SCHEDULED" | "LIVE" | "RETIRED";

export interface BatchMetadata {
  oneLiner?: string;
  frontChestStamp?: string;
  backStatement?: string;
  durationPreset?: "24h" | "72h" | "7d" | "open";
  topBidDollars?: number;
  sizeBreakdown?: Partial<Record<"S" | "M" | "L" | "XL" | "XXL", number>>;
}

export interface ProductBatch {
  id: string;
  brandId: string;
  brandHandle: string;
  productId?: string | null;
  parentBatchId?: string | null;
  title: string;
  sku: string;
  batchNumber: number;
  isPublished: boolean;
  goesLiveAt: string; // ISO 8601 timestamp
  autoRetireAt: string | null; // ISO 8601 timestamp or null for open-ended
  versionTag: string; // e.g. "v1.0" or "v2.0"
  isPublicTeaser: boolean;
  artistAttribution?: string | null;
  chipTier: ChipTier;
  basePriceCents: number;
  maxCap: number | null;
  mintedCount: number;
  vanityAuctionEnabled: boolean;
  metadata?: BatchMetadata;
  releaseStatus?: BatchReleaseStatus;
  notifyCount?: number;
}

export interface OverlapAdvisory {
  batchIdA: string;
  batchIdB: string;
  reason: "WINDOW_OVERLAP" | "BACK_TO_BACK_FULFILLMENT";
  message: string;
}

function toTimestampMs(value: string | number | Date | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const parsed = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Dynamically resolves a batch's lifecycle state matching `makerverse.v_batch_lifecycle`.
 * - DRAFT: not published
 * - RETIRED: published and auto_retire_at <= now (locks denominator N permanently)
 * - SCHEDULED: published and now < goes_live_at (checkout locked)
 * - LIVE: published and goes_live_at <= now < auto_retire_at (or open-ended)
 */
export function resolveBatchLifecycleStatus(
  batch: Pick<ProductBatch, "isPublished" | "goesLiveAt" | "autoRetireAt">,
  now: Date | number = Date.now(),
): BatchReleaseStatus {
  if (!batch.isPublished) {
    return "DRAFT";
  }

  const nowMs = now instanceof Date ? now.getTime() : now;
  const goesLiveMs = toTimestampMs(batch.goesLiveAt);
  const autoRetireMs = toTimestampMs(batch.autoRetireAt);

  if (autoRetireMs !== null && nowMs >= autoRetireMs) {
    return "RETIRED";
  }

  if (goesLiveMs !== null && nowMs < goesLiveMs) {
    return "SCHEDULED";
  }

  return "LIVE";
}

/**
 * Checkout is strictly locked unless the batch is LIVE.
 */
export function isBatchCheckoutUnlocked(
  batch: Pick<ProductBatch, "isPublished" | "goesLiveAt" | "autoRetireAt">,
  now: Date | number = Date.now(),
): boolean {
  return resolveBatchLifecycleStatus(batch, now) === "LIVE";
}

/**
 * Returns the next countdown target timestamp in ms:
 * - SCHEDULED -> goesLiveAt
 * - LIVE -> autoRetireAt (if timed)
 * - DRAFT / RETIRED -> null
 */
export function getCountdownTargetMs(
  batch: Pick<ProductBatch, "isPublished" | "goesLiveAt" | "autoRetireAt">,
  now: Date | number = Date.now(),
): number | null {
  const status = resolveBatchLifecycleStatus(batch, now);
  if (status === "SCHEDULED") {
    return toTimestampMs(batch.goesLiveAt);
  }
  if (status === "LIVE") {
    return toTimestampMs(batch.autoRetireAt);
  }
  return null;
}

const FULFILLMENT_BUFFER_MS = 24 * 60 * 60 * 1000; // 24 hours between drops

/**
 * Detects overlapping drop windows or back-to-back fulfillment windows (< 24h apart)
 * across non-draft batches so vendors receive a Fulfillment Overlap Advisory.
 */
export function detectFulfillmentOverlaps(
  batches: ProductBatch[],
): { overlappingIds: Set<string>; advisories: OverlapAdvisory[] } {
  const overlappingIds = new Set<string>();
  const advisories: OverlapAdvisory[] = [];

  const active = batches
    .map((b) => {
      const start = toTimestampMs(b.goesLiveAt) ?? 0;
      const end = b.autoRetireAt
        ? (toTimestampMs(b.autoRetireAt) ?? Number.POSITIVE_INFINITY)
        : Number.POSITIVE_INFINITY;
      return { batch: b, start, end };
    })
    .sort((a, b) => a.start - b.start);

  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i];
      const b = active[j];

      const windowsOverlap = b.start < a.end;
      const backToBack = !windowsOverlap && b.start - a.end < FULFILLMENT_BUFFER_MS;

      if (windowsOverlap || backToBack) {
        overlappingIds.add(a.batch.id);
        overlappingIds.add(b.batch.id);
        advisories.push({
          batchIdA: a.batch.id,
          batchIdB: b.batch.id,
          reason: windowsOverlap ? "WINDOW_OVERLAP" : "BACK_TO_BACK_FULFILLMENT",
          message: windowsOverlap
            ? `Release overlap: "${a.batch.title}" and "${b.batch.title}" run concurrently.`
            : `Tight fulfillment window (<24h gap) between "${a.batch.title}" and "${b.batch.title}".`,
        });
      }
    }
  }

  return { overlappingIds, advisories };
}

/**
 * Realistic sample scheduled batches when NEXT_PUBLIC_USE_MOCKS=true in dev/test.
 * Strictly returns [] in production when DB has zero rows.
 */
function buildMockBatches(): ProductBatch[] {
  const now = Date.now();
  const hour = 3_600_000;
  const day = 24 * hour;

  return [
    {
      id: "batch_gb_001",
      brandId: "b0000001-0000-0000-0000-000000000001",
      brandHandle: "get-bent",
      title: "Batch 001: Black Friday Boycott Tee",
      sku: "GB-BF-001",
      batchNumber: 1,
      isPublished: true,
      goesLiveAt: new Date(now - 12 * hour).toISOString(),
      autoRetireAt: new Date(now + 12 * hour).toISOString(),
      versionTag: "v1.0",
      isPublicTeaser: true,
      chipTier: "NTAG213_SERIALIZED",
      basePriceCents: 2500,
      maxCap: null,
      mintedCount: 114,
      vanityAuctionEnabled: true,
      metadata: {
        oneLiner: "Heavyweight pure-type 24hr edition with #069 soft-close auction.",
        frontChestStamp: "GET BENT",
        backStatement: "NOT ON SALE. EVER.",
        durationPreset: "24h",
        topBidDollars: 69,
      },
      notifyCount: 42,
    },
    {
      id: "batch_gb_002",
      brandId: "b0000001-0000-0000-0000-000000000001",
      brandHandle: "get-bent",
      title: "Batch 002: Zero-Discount Heavyweight Hoodie",
      sku: "GB-HD-002",
      batchNumber: 2,
      isPublished: true,
      goesLiveAt: new Date(now + 2 * day).toISOString(),
      autoRetireAt: new Date(now + 5 * day).toISOString(),
      versionTag: "v2.0",
      isPublicTeaser: true,
      artistAttribution: "Co-Signed x Studio Kestrel",
      chipTier: "NTAG213_SERIALIZED",
      basePriceCents: 6800,
      maxCap: null,
      mintedCount: 0,
      vanityAuctionEnabled: true,
      metadata: {
        oneLiner: "500gsm fleece with puff-ink back manifesto and woven NTAG213 tag.",
        frontChestStamp: "BATCH 002",
        backStatement: "PRINTED TO ORDER. LOCKED FOREVER.",
        durationPreset: "72h",
      },
      notifyCount: 89,
    },
    {
      id: "batch_fc_003",
      brandId: "b0000001-0000-0000-0000-000000000001",
      brandHandle: "forge-collective",
      title: "Forge Gen-2 Patina Copper Keyring",
      sku: "FC-BLT-K2-003",
      batchNumber: 3,
      isPublished: true,
      goesLiveAt: new Date(now + 2 * day + 6 * hour).toISOString(),
      autoRetireAt: new Date(now + 9 * day).toISOString(),
      versionTag: "v2.0",
      isPublicTeaser: true,
      artistAttribution: "Master Smith E. Vance",
      chipTier: "NTAG424_DNA",
      basePriceCents: 14800,
      maxCap: 36,
      mintedCount: 0,
      vanityAuctionEnabled: true,
      metadata: {
        oneLiner: "AES-128 SUN-CMAC NTAG424 DNA copper anchor with numbered #001-#036 run.",
        durationPreset: "7d",
      },
      notifyCount: 31,
    },
    {
      id: "batch_gb_draft_004",
      brandId: "b0000001-0000-0000-0000-000000000001",
      brandHandle: "get-bent",
      title: "Solstice Midnight Acid-Wash Cap",
      sku: "GB-CAP-004",
      batchNumber: 4,
      isPublished: false,
      goesLiveAt: new Date(now + 10 * day).toISOString(),
      autoRetireAt: new Date(now + 11 * day).toISOString(),
      versionTag: "v1.0",
      isPublicTeaser: false,
      chipTier: "QR_REGISTRY",
      basePriceCents: 3200,
      maxCap: 50,
      mintedCount: 0,
      vanityAuctionEnabled: false,
      metadata: {
        oneLiner: "Draft colorway awaiting embroidery sample sign-off.",
        durationPreset: "24h",
      },
      notifyCount: 0,
    },
    {
      id: "batch_gb_000_retired",
      brandId: "b0000001-0000-0000-0000-000000000001",
      brandHandle: "get-bent",
      title: "Batch 000: Founder Proof Tee (Locked N=48)",
      sku: "GB-FND-000",
      batchNumber: 0,
      isPublished: true,
      goesLiveAt: new Date(now - 10 * day).toISOString(),
      autoRetireAt: new Date(now - 9 * day).toISOString(),
      versionTag: "v1.0",
      isPublicTeaser: true,
      chipTier: "NTAG213_SERIALIZED",
      basePriceCents: 2500,
      maxCap: 48,
      mintedCount: 48,
      vanityAuctionEnabled: true,
      metadata: {
        oneLiner: "Genesis test run permanently locked at 1-of-48.",
        durationPreset: "24h",
        topBidDollars: 85,
      },
      notifyCount: 18,
    },
  ];
}

export const MOCK_SCHEDULED_BATCHES: ProductBatch[] = IS_MOCK_ENABLED ? buildMockBatches() : [];
