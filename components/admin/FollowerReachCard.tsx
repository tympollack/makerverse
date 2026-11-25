// components/admin/FollowerReachCard.tsx
"use client";

import Link from "next/link";
import { ArrowUpRight, Mail, Users } from "lucide-react";
import { FrostedCard } from "@/components/ui/FrostedCard";
import { MonoValue } from "@/components/ui/MonoValue";
import { EMPTY_VENDOR_EMAIL_TELEMETRY, type VendorEmailTelemetry } from "@/lib/db/emailTelemetry";
import { cn } from "@/lib/utils";

interface FollowerReachCardProps {
  telemetry?: VendorEmailTelemetry;
  className?: string;
}

export function FollowerReachCard({
  telemetry = EMPTY_VENDOR_EMAIL_TELEMETRY,
  className,
}: FollowerReachCardProps) {
  const { reach, totals, recentBatches } = telemetry;

  return (
    <FrostedCard noPadding className={cn("overflow-hidden", className)}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
        <div className="flex items-center gap-2">
          <Users className="w-3.5 h-3.5 text-[#22D3EE]" />
          <h2 className="text-xs font-semibold text-white/70 uppercase tracking-widest">
            Follower Reach &amp; Drop Email Telemetry
          </h2>
        </div>
        <Link
          href="/vendor/schedule"
          className="flex items-center gap-1 text-[10px] font-mono text-orange-400 hover:text-orange-300 transition-colors"
        >
          Drop Calendar <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="p-4 space-y-4">
        {/* Reach Breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg bg-white/3 border border-white/8 p-3">
            <p className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
              Active Email Reach
            </p>
            <MonoValue glow="cyan" className="text-xl font-bold mt-1">
              {reach.uniqueSubscribers.toLocaleString()}
            </MonoValue>
            <p className="text-[10px] font-mono text-white/35 mt-0.5">
              Deduplicated subscribers
            </p>
          </div>

          <div className="rounded-lg bg-white/3 border border-white/8 p-3">
            <p className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
              Brand Followers
            </p>
            <MonoValue className="text-xl font-bold mt-1">
              {reach.brandFollowers.toLocaleString()}
            </MonoValue>
            <p className="text-[10px] font-mono text-white/35 mt-0.5">
              {reach.productLineFollowers} product line
            </p>
          </div>

          <div className="rounded-lg bg-white/3 border border-white/8 p-3">
            <p className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
              Drop Notify-Me
            </p>
            <MonoValue glow="orange" className="text-xl font-bold mt-1">
              {reach.batchNotifySignups.toLocaleString()}
            </MonoValue>
            <p className="text-[10px] font-mono text-white/35 mt-0.5">
              Upcoming drop opt-ins
            </p>
          </div>

          <div className="rounded-lg bg-white/3 border border-white/8 p-3">
            <p className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
              Delivered / Open
            </p>
            <MonoValue className="text-xl font-bold mt-1 text-emerald-300">
              {totals.deliveryRatePct}% · {totals.openRatePct}%
            </MonoValue>
            <p className="text-[10px] font-mono text-white/35 mt-0.5">
              {totals.sent.toLocaleString()} sent · {totals.clicked.toLocaleString()} clicks
            </p>
          </div>
        </div>

        {/* Recent Drop Blast Performance */}
        {recentBatches.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/10 bg-black/20 px-4 py-5 text-center space-y-1">
            <Mail className="w-5 h-5 text-white/25 mx-auto" />
            <p className="font-mono text-xs text-white/55">
              No drop alerts dispatched yet
            </p>
            <p className="font-mono text-[10px] text-white/35">
              Delivery, open, click, and bounce metrics appear here automatically once a scheduled drop goes live.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5 rounded-lg border border-white/8 bg-black/20">
            {recentBatches.slice(0, 3).map((batch) => (
              <div
                key={batch.batchId}
                className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 text-xs"
              >
                <div className="min-w-0">
                  <p className="font-medium text-white/85 truncate">
                    {batch.batchTitle || `Drop ${batch.batchId.slice(0, 8)}`}
                  </p>
                  <p className="font-mono text-[10px] text-white/35">
                    {batch.brandSlug ? `@${batch.brandSlug} · ` : ""}
                    {batch.sent} sent · {batch.delivered} delivered
                  </p>
                </div>

                <div className="flex items-center gap-3 font-mono text-[10px]">
                  <span className="text-emerald-300">{batch.deliveryRatePct}% deliv</span>
                  <span className="text-[#22D3EE]">{batch.openRatePct}% open</span>
                  <span className="text-orange-300">{batch.clickRatePct}% click</span>
                  {batch.bounced + batch.complained > 0 && (
                    <span className="text-amber-300">
                      {batch.bounced + batch.complained} issue
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </FrostedCard>
  );
}
