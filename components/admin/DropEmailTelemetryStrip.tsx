// components/admin/DropEmailTelemetryStrip.tsx
"use client";

import { Mail, Users, CheckCircle2, Eye, MousePointerClick, AlertTriangle } from "lucide-react";
import { EMPTY_VENDOR_EMAIL_TELEMETRY, type VendorEmailTelemetry } from "@/lib/db/emailTelemetry";
import { cn } from "@/lib/utils";

interface DropEmailTelemetryStripProps {
  telemetry?: VendorEmailTelemetry;
  className?: string;
}

export function DropEmailTelemetryStrip({
  telemetry = EMPTY_VENDOR_EMAIL_TELEMETRY,
  className,
}: DropEmailTelemetryStripProps) {
  const { reach, totals } = telemetry;
  const hasTelemetry = totals.sent > 0 || totals.delivered > 0;

  return (
    <section
      aria-label="Native Drop Email Telemetry"
      className={cn(
        "rounded-xl bg-[#141414] border border-white/10 p-3.5 sm:p-4 space-y-3",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[#CC5500]/15 border border-[#CC5500]/35 flex items-center justify-center">
            <Mail className="w-3.5 h-3.5 text-[#CC5500]" />
          </div>
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-white/85">
            Native Drop Email Telemetry
          </span>
          <span
            className={cn(
              "px-2 py-0.5 rounded-full border font-mono text-[9px] font-bold uppercase tracking-wider",
              hasTelemetry
                ? "bg-emerald-500/15 border-emerald-500/35 text-emerald-300"
                : "bg-white/5 border-white/10 text-white/45",
            )}
          >
            {hasTelemetry ? "Resend Live" : "Awaiting First Blast"}
          </span>
        </div>

        <span className="font-mono text-[10px] text-white/40">
          {totals.dispatchedBatches} drop blast{totals.dispatchedBatches === 1 ? "" : "s"} tracked
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {/* Follower Reach */}
        <div className="rounded-lg bg-black/30 border border-white/8 px-3 py-2">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-white/45 uppercase tracking-wider">
            <Users className="w-3 h-3 text-[#22D3EE]" />
            <span>Follower Reach</span>
          </div>
          <p className="font-mono text-base font-bold text-white mt-0.5 tabular-nums">
            {reach.uniqueSubscribers.toLocaleString()}
          </p>
          <p className="font-mono text-[9px] text-white/35 truncate">
            {reach.brandFollowers} brand · {reach.batchNotifySignups} notify
          </p>
        </div>

        {/* Alerts Sent */}
        <div className="rounded-lg bg-black/30 border border-white/8 px-3 py-2">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-white/45 uppercase tracking-wider">
            <Mail className="w-3 h-3 text-orange-400" />
            <span>Alerts Sent</span>
          </div>
          <p className="font-mono text-base font-bold text-white mt-0.5 tabular-nums">
            {totals.sent.toLocaleString()}
          </p>
          <p className="font-mono text-[9px] text-white/35">Resend batch events</p>
        </div>

        {/* Delivered */}
        <div className="rounded-lg bg-black/30 border border-white/8 px-3 py-2">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-white/45 uppercase tracking-wider">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>Delivered</span>
          </div>
          <p className="font-mono text-base font-bold text-emerald-300 mt-0.5 tabular-nums">
            {totals.deliveryRatePct}%
          </p>
          <p className="font-mono text-[9px] text-white/35">
            {totals.delivered.toLocaleString()} confirmed
          </p>
        </div>

        {/* Open Rate */}
        <div className="rounded-lg bg-black/30 border border-white/8 px-3 py-2">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-white/45 uppercase tracking-wider">
            <Eye className="w-3 h-3 text-[#22D3EE]" />
            <span>Open Rate</span>
          </div>
          <p className="font-mono text-base font-bold text-[#22D3EE] mt-0.5 tabular-nums">
            {totals.openRatePct}%
          </p>
          <p className="font-mono text-[9px] text-white/35">
            {totals.opened.toLocaleString()} opened
          </p>
        </div>

        {/* Click Rate */}
        <div className="rounded-lg bg-black/30 border border-white/8 px-3 py-2">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-white/45 uppercase tracking-wider">
            <MousePointerClick className="w-3 h-3 text-orange-300" />
            <span>Click Rate</span>
          </div>
          <p className="font-mono text-base font-bold text-orange-200 mt-0.5 tabular-nums">
            {totals.clickRatePct}%
          </p>
          <p className="font-mono text-[9px] text-white/35">
            {totals.clicked.toLocaleString()} clicked
          </p>
        </div>

        {/* Bounces & Complaints */}
        <div className="rounded-lg bg-black/30 border border-white/8 px-3 py-2">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-white/45 uppercase tracking-wider">
            <AlertTriangle
              className={cn("w-3 h-3", totals.issueCount > 0 ? "text-amber-400" : "text-white/35")}
            />
            <span>Bounces / Spam</span>
          </div>
          <p
            className={cn(
              "font-mono text-base font-bold mt-0.5 tabular-nums",
              totals.issueCount > 0 ? "text-amber-300" : "text-white/70",
            )}
          >
            {totals.issueCount.toLocaleString()}
          </p>
          <p className="font-mono text-[9px] text-white/35">
            {totals.bounced} bounced · {totals.complained} spam
          </p>
        </div>
      </div>
    </section>
  );
}
