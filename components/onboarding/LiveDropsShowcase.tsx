// components/onboarding/LiveDropsShowcase.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Flame, CalendarClock, ArrowRight, Sparkles } from "lucide-react";
import { FrostedCard } from "@/components/ui/FrostedCard";
import { CountdownTimer } from "@/components/ui/CountdownTimer";
import {
  MOCK_SCHEDULED_BATCHES,
  resolveBatchLifecycleStatus,
  type ProductBatch,
} from "@/lib/drops/lifecycle";
import { IS_MOCK_ENABLED } from "@/lib/mock/adminData";
import { formatCents } from "@/lib/utils";

function getInitialDrops(): { live: ProductBatch[]; upcoming: ProductBatch[] } {
  if (!IS_MOCK_ENABLED) {
    return { live: [], upcoming: [] };
  }
  const now = Date.now();
  const live: ProductBatch[] = [];
  const upcoming: ProductBatch[] = [];

  for (const batch of MOCK_SCHEDULED_BATCHES) {
    const status = resolveBatchLifecycleStatus(batch, now);
    if (status === "LIVE") live.push(batch);
    else if (status === "SCHEDULED" && batch.isPublicTeaser) upcoming.push(batch);
  }

  return {
    live: live.sort((a, b) => Date.parse(b.goesLiveAt) - Date.parse(a.goesLiveAt)),
    upcoming: upcoming.sort((a, b) => Date.parse(a.goesLiveAt) - Date.parse(b.goesLiveAt)),
  };
}

function getDropHref(batch: ProductBatch): string {
  if (batch.brandHandle === "get-bent") {
    return batch.batchNumber === 1 ? "/get-bent" : `/get-bent?batch=${encodeURIComponent(batch.sku || batch.id)}`;
  }
  return `/${batch.brandHandle}?batch=${encodeURIComponent(batch.sku || batch.id)}`;
}

export function LiveDropsShowcase() {
  const initial = getInitialDrops();
  const [liveBatches, setLiveBatches] = useState<ProductBatch[]>(initial.live);
  const [upcomingBatches, setUpcomingBatches] = useState<ProductBatch[]>(initial.upcoming);

  useEffect(() => {
    if (typeof fetch !== "function") return;
    let active = true;

    Promise.all([
      fetch("/api/drops?mode=live")
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch("/api/drops?mode=teasers")
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ]).then(([liveData, teaserData]) => {
      if (!active) return;
      if (liveData && Array.isArray(liveData.batches)) {
        setLiveBatches(liveData.batches);
      }
      if (teaserData && Array.isArray(teaserData.teasers)) {
        setUpcomingBatches(teaserData.teasers);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  const combined = [
    ...liveBatches.map((b) => ({ batch: b, kind: "LIVE" as const })),
    ...upcomingBatches.map((b) => ({ batch: b, kind: "UPCOMING" as const })),
  ].slice(0, 6);

  return (
    <section id="drops" className="scroll-mt-24 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <span className="font-mono text-xs text-[#22D3EE] uppercase tracking-widest flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-[#CC5500]" />
            <span>Live &amp; Upcoming Drops</span>
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#F9F9F9] tracking-tight">
            See Real Maker Drops Running on Makerverse
          </h2>
          <p className="text-sm text-white/65 max-w-2xl">
            Every drop uses timed release windows, numbered editions, and tap-to-verify passports.
          </p>
        </div>

        <Link
          href="/get-bent"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 font-mono text-xs font-semibold text-[#22D3EE] transition-colors self-start sm:self-auto"
        >
          <span>Open Flagship Drop (/get-bent)</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {combined.length === 0 ? (
        <FrostedCard className="p-8 text-center space-y-3">
          <Sparkles className="w-7 h-7 text-[#CC5500] mx-auto" />
          <p className="text-sm font-semibold text-white">
            No drops are live right now
          </p>
          <p className="text-xs text-white/55 max-w-md mx-auto">
            Check back soon for the next timed artist drop, or preview the flagship storefront experience.
          </p>
          <div className="pt-1">
            <Link
              href="/get-bent"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#CC5500] hover:bg-[#e0621a] text-white font-mono text-xs font-semibold transition-colors"
            >
              <span>Preview Flagship Drop</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </FrostedCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {combined.map(({ batch, kind }) => {
            const isLive = kind === "LIVE";
            const targetTimestamp = isLive
              ? batch.autoRetireAt
                ? Date.parse(batch.autoRetireAt)
                : null
              : Date.parse(batch.goesLiveAt);

            return (
              <FrostedCard
                key={batch.id}
                glowOnHover
                className="flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    {isLive ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#CC5500]/20 border border-[#CC5500]/50 font-mono text-[10px] font-bold text-orange-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#CC5500] animate-pulse" />
                        LIVE NOW
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/35 font-mono text-[10px] font-bold text-[#22D3EE]">
                        <CalendarClock className="w-3 h-3" />
                        UPCOMING
                      </span>
                    )}
                    <span className="font-mono text-xs font-bold text-white/85">
                      {formatCents(batch.basePriceCents)}
                    </span>
                  </div>

                  <div>
                    <p className="font-mono text-[11px] text-white/45">
                      @{batch.brandHandle}
                    </p>
                    <h3 className="text-base font-bold text-[#F9F9F9] mt-0.5 leading-snug">
                      {batch.title}
                    </h3>
                    {batch.metadata?.oneLiner && (
                      <p className="text-xs text-white/65 mt-1.5 line-clamp-2 leading-relaxed">
                        {batch.metadata.oneLiner}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-white/10">
                  <div className="flex items-center justify-between font-mono text-[11px]">
                    <span className="text-white/50">
                      {isLive
                        ? `${batch.mintedCount} minted${batch.maxCap ? ` / ${batch.maxCap}` : ""}`
                        : batch.maxCap
                          ? `Limited to ${batch.maxCap}`
                          : "Open 24hr window"}
                    </span>
                    {targetTimestamp && Number.isFinite(targetTimestamp) ? (
                      <span className="flex items-center gap-1.5 text-[#22D3EE]">
                        <span className="text-[10px] text-white/40">
                          {isLive ? "CLOSES" : "OPENS"}
                        </span>
                        <CountdownTimer
                          expiresAt={targetTimestamp}
                          format="drop"
                          className="text-xs font-bold text-[#22D3EE]"
                        />
                      </span>
                    ) : (
                      <span className="text-emerald-300">Open Edition</span>
                    )}
                  </div>

                  <Link
                    href={getDropHref(batch)}
                    className={
                      isLive
                        ? "w-full py-2.5 px-4 rounded-xl bg-[#CC5500] hover:bg-[#e0621a] text-white font-mono text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                        : "w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-white/90 font-mono text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    }
                  >
                    <span>{isLive ? "Shop Live Drop" : "Preview Drop"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </FrostedCard>
            );
          })}
        </div>
      )}
    </section>
  );
}
