// app/(admin)/vendor/schedule/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getSupabaseServerClient, getSupabaseServiceRoleClient } from "@/lib/supabase/server";
import {
  resolveBatchLifecycleStatus,
  type ProductBatch,
  type BatchMetadata,
} from "@/lib/drops/lifecycle";
import { dispatchPendingDropAlerts } from "@/lib/email/dropAlerts";
import { IS_MOCK_ENABLED } from "@/lib/mock/adminData";
import { ALL_BRANDS, type ChipTier } from "@/lib/mock/shopData";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ScheduleBatchInput {
  brandId?: string;
  brandHandle?: string;
  productId?: string | null;
  productLineId?: string | null;
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
  authToken?: string;
}

export interface BatchActionResult {
  success: boolean;
  persistedToDb: boolean;
  batch?: ProductBatch;
  alertsDispatched?: number;
  error?: string;
}

async function maybeDispatchImmediateDropAlert(
  supabase: NonNullable<ReturnType<typeof getSupabaseServiceRoleClient>>,
  batchId: string,
  status: string,
): Promise<number> {
  if (status !== "LIVE") {
    return 0;
  }
  try {
    const res = await dispatchPendingDropAlerts({
      supabase: supabase as any,
      batchId,
    });
    return res.emailsDispatched;
  } catch (err) {
    console.warn("[schedule/actions] Immediate drop alert dispatch notice:", err);
    return 0;
  }
}

async function resolveCallerAuth(
  supabase: NonNullable<ReturnType<typeof getSupabaseServiceRoleClient>>,
  explicitToken?: string,
): Promise<{ authorized: boolean; userId?: string; isAdmin?: boolean; error?: string }> {
  let token = explicitToken?.trim() || "";
  if (!token) {
    try {
      const hdrs = await headers();
      const authHeader = hdrs.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.substring(7).trim();
      }
    } catch {
      // Called outside Next.js request header scope (e.g. unit test)
    }
  }

  if (!token) {
    return { authorized: false, error: "UNAUTHORIZED_MISSING_CREDENTIALS" };
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const adminSecret = process.env.ADMIN_API_KEY;
  if ((serviceKey && token === serviceKey) || (adminSecret && token === adminSecret)) {
    return { authorized: true, isAdmin: true };
  }

  const { data: userRes, error } = await supabase.auth.getUser(token);
  if (error || !userRes?.user) {
    return { authorized: false, error: "UNAUTHORIZED_INVALID_TOKEN" };
  }

  const role = userRes.user.app_metadata?.role;
  return {
    authorized: true,
    userId: userRes.user.id,
    isAdmin: role === "admin" || role === "service_role",
  };
}

async function resolveAndVerifyBrand(
  supabase: NonNullable<ReturnType<typeof getSupabaseServiceRoleClient>>,
  brandIdArg: string | undefined,
  brandHandleArg: string | undefined,
  caller: { userId?: string; isAdmin?: boolean },
): Promise<{ ok: boolean; brandId?: string; brandHandle?: string; error?: string }> {
  const normalizedHandle = (brandHandleArg || "").toLowerCase().replace(/^@/, "");
  let query = (supabase.from("brands" as any) as any).select("id, slug, owner_id");

  if (brandIdArg && UUID_REGEX.test(brandIdArg)) {
    query = query.eq("id", brandIdArg);
  } else if (normalizedHandle) {
    query = query.eq("slug", normalizedHandle);
  } else {
    return { ok: false, error: "MISSING_BRAND_IDENTIFIER" };
  }

  const { data: brand, error } = await query.maybeSingle();
  if (error) {
    return { ok: false, error: error.message };
  }
  if (!brand) {
    return { ok: false, error: "BRAND_NOT_FOUND" };
  }

  if (!caller.isAdmin && brand.owner_id !== caller.userId) {
    return { ok: false, error: "FORBIDDEN_BRAND_OWNERSHIP" };
  }

  return { ok: true, brandId: brand.id, brandHandle: brand.slug };
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

  const brandHandle = (input.brandHandle || "get-bent").toLowerCase().replace(/^@/, "");
  const matchedMockBrand = ALL_BRANDS.find((b) => b.handle.toLowerCase() === brandHandle);
  const fallbackBrandId = input.brandId || matchedMockBrand?.id || `brand_${brandHandle}`;
  const isPublished = input.isPublished ?? true;
  const isPublicTeaser = input.isPublicTeaser ?? true;
  const versionTag = input.versionTag || "v1.0";
  const chipTier: ChipTier = input.chipTier || "NTAG213_SERIALIZED";

  const candidateBatch: ProductBatch = {
    id: `batch_${Date.now().toString(36)}`,
    brandId: fallbackBrandId,
    brandHandle,
    productId: input.productId ?? null,
    productLineId: input.productLineId ?? null,
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
  if (supabase) {
    const caller = await resolveCallerAuth(supabase as any, input.authToken);
    if (!caller.authorized) {
      return { success: false, persistedToDb: false, error: caller.error };
    }

    const brandCheck = await resolveAndVerifyBrand(
      supabase as any,
      input.brandId,
      brandHandle,
      caller,
    );
    if (!brandCheck.ok || !brandCheck.brandId) {
      return { success: false, persistedToDb: false, error: brandCheck.error };
    }

    const dbTier = chipTier === "NTAG424_DNA" ? "NTAG424_DNA_CMAC" : chipTier;
    const { data, error } = await (supabase.from("product_batches" as any) as any)
      .insert({
        brand_id: brandCheck.brandId,
        product_id: input.productId && UUID_REGEX.test(input.productId) ? input.productId : null,
        product_line_id: input.productLineId && UUID_REGEX.test(input.productLineId) ? input.productLineId : null,
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

    if (error || !data) {
      return {
        success: false,
        persistedToDb: false,
        error: error?.message || "BATCH_INSERT_FAILED",
      };
    }

    candidateBatch.id = data.id;
    candidateBatch.brandId = brandCheck.brandId;
    candidateBatch.brandHandle = brandCheck.brandHandle || brandHandle;

    const alertsDispatched = await maybeDispatchImmediateDropAlert(
      supabase as any,
      candidateBatch.id,
      candidateBatch.releaseStatus || resolveBatchLifecycleStatus(candidateBatch),
    );

    revalidatePath("/vendor/schedule");
    revalidatePath(`/${candidateBatch.brandHandle}`);
    return {
      success: true,
      persistedToDb: true,
      batch: candidateBatch,
      alertsDispatched,
    };
  }

  if (!IS_MOCK_ENABLED) {
    return { success: false, persistedToDb: false, error: "DATABASE_NOT_CONFIGURED" };
  }

  revalidatePath("/vendor/schedule");
  return { success: true, persistedToDb: false, batch: candidateBatch };
}

export async function rescheduleBatchWindow(input: {
  batchId: string;
  goesLiveAt: string;
  autoRetireAt?: string | null;
  isPublished?: boolean;
  productId?: string | null;
  productLineId?: string | null;
  title?: string;
  sku?: string;
  versionTag?: string;
  isPublicTeaser?: boolean;
  chipTier?: ChipTier;
  basePriceCents?: number;
  authToken?: string;
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
    const caller = await resolveCallerAuth(supabase as any, input.authToken);
    if (!caller.authorized) {
      return { success: false, persistedToDb: false, error: caller.error };
    }

    const { data: existing, error: fetchErr } = await (supabase.from("product_batches" as any) as any)
      .select("id, brand_id, is_published, goes_live_at, auto_retire_at")
      .eq("id", input.batchId)
      .maybeSingle();

    if (fetchErr) {
      return { success: false, persistedToDb: false, error: fetchErr.message };
    }
    if (!existing) {
      return { success: false, persistedToDb: false, error: "BATCH_NOT_FOUND" };
    }

    const brandCheck = await resolveAndVerifyBrand(supabase as any, existing.brand_id, undefined, caller);
    if (!brandCheck.ok) {
      return { success: false, persistedToDb: false, error: brandCheck.error };
    }

    const currentStatus = resolveBatchLifecycleStatus({
      isPublished: Boolean(existing.is_published),
      goesLiveAt: existing.goes_live_at,
      autoRetireAt: existing.auto_retire_at,
    });
    if (currentStatus === "RETIRED") {
      return { success: false, persistedToDb: false, error: "RETIRED_BATCH_LOCKED" };
    }

    const dbTier = input.chipTier === "NTAG424_DNA" ? "NTAG424_DNA_CMAC" : input.chipTier;
    const { error: updateErr } = await (supabase.from("product_batches" as any) as any)
      .update({
        goes_live_at: normalizedLive,
        auto_retire_at: normalizedRetire,
        ...(input.isPublished !== undefined ? { is_published: input.isPublished } : {}),
        ...(input.productId !== undefined
          ? { product_id: input.productId && UUID_REGEX.test(input.productId) ? input.productId : null }
          : {}),
        ...(input.productLineId !== undefined
          ? {
              product_line_id:
                input.productLineId && UUID_REGEX.test(input.productLineId)
                  ? input.productLineId
                  : null,
            }
          : {}),
        ...(input.title !== undefined ? { title: input.title.trim() } : {}),
        ...(input.sku !== undefined ? { sku: input.sku.trim().toUpperCase() } : {}),
        ...(input.versionTag !== undefined ? { version_tag: input.versionTag } : {}),
        ...(input.isPublicTeaser !== undefined ? { is_public_teaser: input.isPublicTeaser } : {}),
        ...(dbTier !== undefined ? { chip_tier: dbTier } : {}),
        ...(input.basePriceCents !== undefined ? { base_price_cents: input.basePriceCents } : {}),
      })
      .eq("id", input.batchId);

    if (updateErr) {
      return { success: false, persistedToDb: false, error: updateErr.message };
    }

    const updatedStatus = resolveBatchLifecycleStatus({
      isPublished: input.isPublished ?? Boolean(existing.is_published),
      goesLiveAt: normalizedLive,
      autoRetireAt: normalizedRetire,
    });
    const alertsDispatched = await maybeDispatchImmediateDropAlert(
      supabase as any,
      input.batchId,
      updatedStatus,
    );

    revalidatePath("/vendor/schedule");
    return { success: true, persistedToDb: true, alertsDispatched };
  }

  if (!IS_MOCK_ENABLED) {
    return { success: false, persistedToDb: false, error: "DATABASE_NOT_CONFIGURED" };
  }

  return { success: true, persistedToDb: false };
}

export async function togglePublicTeaser(input: {
  batchId: string;
  isPublicTeaser: boolean;
  authToken?: string;
}): Promise<BatchActionResult> {
  if (!input.batchId) {
    return { success: false, persistedToDb: false, error: "MISSING_BATCH_ID" };
  }

  const supabase = getSupabaseServiceRoleClient() || getSupabaseServerClient();
  if (supabase && UUID_REGEX.test(input.batchId)) {
    const caller = await resolveCallerAuth(supabase as any, input.authToken);
    if (!caller.authorized) {
      return { success: false, persistedToDb: false, error: caller.error };
    }

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

    const brandCheck = await resolveAndVerifyBrand(supabase as any, existing.brand_id, undefined, caller);
    if (!brandCheck.ok) {
      return { success: false, persistedToDb: false, error: brandCheck.error };
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

  if (!IS_MOCK_ENABLED) {
    return { success: false, persistedToDb: false, error: "DATABASE_NOT_CONFIGURED" };
  }

  return { success: true, persistedToDb: false };
}

export async function getVendorAuthorizedBrands(input?: {
  authToken?: string;
}): Promise<Array<{ id: string; handle: string; name: string }>> {
  const supabase = getSupabaseServiceRoleClient() || getSupabaseServerClient();
  if (supabase) {
    const caller = await resolveCallerAuth(supabase as any, input?.authToken);
    if (!caller.authorized) {
      return [];
    }

    let query = (supabase.from("brands" as any) as any)
      .select("id, slug, name")
      .order("created_at", { ascending: true });

    if (!caller.isAdmin && caller.userId) {
      query = query.eq("owner_id", caller.userId);
    }

    const { data, error } = await query;
    if (!error && Array.isArray(data)) {
      return data.map((b: any) => ({
        id: b.id,
        handle: b.slug,
        name: b.name || b.slug,
      }));
    }
    return [];
  }

  return IS_MOCK_ENABLED
    ? ALL_BRANDS.map((b) => ({ id: b.id, handle: b.handle, name: b.name }))
    : [];
}
