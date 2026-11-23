// components/shop/ActiveBatchBanner.tsx
"use client";

import Link from "next/link";
import { Sparkles, X } from "lucide-react";
import type { ProductBatch } from "@/lib/drops/lifecycle";

export function matchBatchQueryParam(
  batches: ProductBatch[],
  batchParam: string | null | undefined,
): ProductBatch | null {
  const needle = (batchParam || "").trim();
  if (!needle) return null;
  const upperNeedle = needle.toUpperCase();
  return (
    batches.find(
      (b) => b.id === needle || (b.sku && b.sku.toUpperCase() === upperNeedle),
    ) ?? null
  );
}

export async function fetchActiveBatchByParam(
  brandHandle: string,
  batchParam: string | null | undefined,
): Promise<ProductBatch | null> {
  const needle = (batchParam || "").trim();
  if (!needle) return null;

  try {
    const res = await fetch(
      `/api/drops?brand=${encodeURIComponent(brandHandle)}&mode=live`,
    );
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.batches)) {
        const matched = matchBatchQueryParam(data.batches, needle);
        if (matched) return matched;
      }
    }
  } catch {
    // Best-effort lookup; storefront catalog remains visible if offline
  }

  return null;
}

export function ActiveBatchBanner({
  batch,
  clearHref,
}: {
  batch: ProductBatch | null;
  clearHref?: string;
}) {
  if (!batch) return null;

  return (
    <div
      data-testid="active-batch-banner"
      className="p-4 rounded-xl bg-[#CC5500]/15 border border-[#CC5500]/45 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
    >
      <div className="flex items-start sm:items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#CC5500]/25 border border-[#CC5500]/50 flex items-center justify-center text-orange-300 flex-shrink-0">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="space-y-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-orange-300">
              LIVE DROP FEATURED
            </span>
            <span className="px-2 py-0.5 rounded bg-black/40 border border-white/15 font-mono text-[10px] text-[#22D3EE]">
              {batch.sku}
            </span>
            <span className="px-2 py-0.5 rounded bg-white/10 font-mono text-[10px] text-white/80">
              {batch.versionTag}
            </span>
          </div>
          <p className="text-sm font-bold text-white">{batch.title}</p>
        </div>
      </div>

      {clearHref && (
        <Link
          href={clearHref}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 font-mono text-[11px] text-white/70 hover:text-white self-start sm:self-center"
        >
          <X className="w-3 h-3" />
          <span>View All</span>
        </Link>
      )}
    </div>
  );
}
