// components/shop/UpcomingDropsRail.tsx
"use client";

import { useEffect, useState } from "react";
import { CalendarClock } from "lucide-react";
import { UpcomingDropCard } from "@/components/shop/UpcomingDropCard";
import {
  MOCK_SCHEDULED_BATCHES,
  resolveBatchLifecycleStatus,
  type ProductBatch,
} from "@/lib/drops/lifecycle";
import { IS_MOCK_ENABLED } from "@/lib/mock/adminData";

function getInitialTeasers(brandHandle: string): ProductBatch[] {
  if (!IS_MOCK_ENABLED) return [];
  const normalized = brandHandle.toLowerCase().replace(/^@/, "");
  return MOCK_SCHEDULED_BATCHES.filter(
    (b) =>
      b.brandHandle.toLowerCase() === normalized &&
      b.isPublicTeaser &&
      resolveBatchLifecycleStatus(b) === "SCHEDULED",
  ).sort((a, b) => Date.parse(a.goesLiveAt) - Date.parse(b.goesLiveAt));
}

export function UpcomingDropsRail({
  brandHandle,
  initialTeasers,
}: {
  brandHandle: string;
  initialTeasers?: ProductBatch[];
}) {
  const [fetchedTeasers, setFetchedTeasers] = useState<ProductBatch[] | null>(null);
  const teasers = initialTeasers ?? fetchedTeasers ?? getInitialTeasers(brandHandle);

  useEffect(() => {
    if (initialTeasers) return;

    let active = true;
    const normalized = brandHandle.toLowerCase().replace(/^@/, "");
    fetch(`/api/drops?brand=${encodeURIComponent(normalized)}&mode=teasers`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!active || !data?.teasers) return;
        if (Array.isArray(data.teasers) && data.teasers.length > 0) {
          setFetchedTeasers(data.teasers);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [brandHandle, initialTeasers]);

  if (teasers.length === 0) {
    return null;
  }

  return (
    <section aria-label="Upcoming Drops Queued" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#22D3EE]/15 border border-[#22D3EE]/35 flex items-center justify-center text-[#22D3EE]">
            <CalendarClock className="w-4 h-4" />
          </div>
          <h2 className="font-mono text-sm sm:text-base font-bold tracking-wider uppercase text-white">
            UPCOMING DROPS // QUEUED
          </h2>
          <span className="px-2 py-0.5 rounded-full bg-[#22D3EE]/15 border border-[#22D3EE]/35 font-mono text-[10px] font-bold text-[#22D3EE]">
            {teasers.length} QUEUED
          </span>
        </div>
        <span className="font-mono text-[11px] text-white/45">
          Checkout locked until exact goes_live_at timestamp
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teasers.map((batch) => (
          <UpcomingDropCard key={batch.id} batch={batch} />
        ))}
      </div>
    </section>
  );
}
