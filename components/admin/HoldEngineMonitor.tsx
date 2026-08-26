// components/admin/HoldEngineMonitor.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Hash,
  Package,
} from "lucide-react";
import { FrostedCard } from "@/components/ui/FrostedCard";
import { MonoValue } from "@/components/ui/MonoValue";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CountdownTimer, TTLBar } from "@/components/ui/CountdownTimer";
import { ACTIVE_HOLDS } from "@/lib/mock/adminData";
import type { HoldEntry, HoldState } from "@/lib/mock/adminData";
import { cn } from "@/lib/utils";

// ─── Summary Counts ────────────────────────────────────────────────────────────

function HoldSummaryBar({ holds }: { holds: HoldEntry[] }) {
  const counts = {
    ACTIVE_HOLD: holds.filter((h) => h.state === "ACTIVE_HOLD").length,
    PAYMENT_RETRYING: holds.filter((h) => h.state === "PAYMENT_RETRYING").length,
    EXPIRED_RELEASE: holds.filter((h) => h.state === "EXPIRED_RELEASE").length,
  };

  const items = [
    {
      state: "ACTIVE_HOLD" as HoldState,
      count: counts.ACTIVE_HOLD,
      icon: CheckCircle2,
      label: "Active",
      color: "text-emerald-400",
    },
    {
      state: "PAYMENT_RETRYING" as HoldState,
      count: counts.PAYMENT_RETRYING,
      icon: AlertCircle,
      label: "Retrying",
      color: "text-amber-400",
    },
    {
      state: "EXPIRED_RELEASE" as HoldState,
      count: counts.EXPIRED_RELEASE,
      icon: XCircle,
      label: "Expired",
      color: "text-red-400",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map((item) => (
        <FrostedCard key={item.state} className="flex items-center gap-3">
          <item.icon className={cn("w-5 h-5 flex-shrink-0", item.color)} />
          <div>
            <MonoValue glow="white" className="text-xl font-bold">
              {item.count}
            </MonoValue>
            <p className="text-[10px] font-mono text-white/35 uppercase tracking-wide">
              {item.label}
            </p>
          </div>
          <StatusBadge variant={item.state} className="ml-auto" />
        </FrostedCard>
      ))}
    </div>
  );
}

// ─── Hold Row ──────────────────────────────────────────────────────────────────

function HoldRow({ hold, isExpired }: { hold: HoldEntry; isExpired: boolean }) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        layout
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 8, height: 0 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "border-b border-white/5 last:border-0",
          isExpired && "opacity-50",
        )}
      >
        {/* Main row */}
        <div className="flex items-start gap-4 px-4 py-3">
          {/* State indicator */}
          <div className="mt-0.5 flex-shrink-0">
            {hold.state === "ACTIVE_HOLD" && (
              <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1" />
            )}
            {hold.state === "PAYMENT_RETRYING" && (
              <div className="w-2 h-2 rounded-full bg-amber-400 mt-1 animate-pulse" />
            )}
            {hold.state === "EXPIRED_RELEASE" && (
              <div className="w-2 h-2 rounded-full bg-red-500 mt-1" />
            )}
          </div>

          {/* Product + buyer */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs font-medium text-white/85">{hold.productTitle}</p>
              <StatusBadge variant={hold.state} />
              {hold.retryCount !== undefined && hold.retryCount > 0 && (
                <span className="font-mono text-[9px] text-amber-400/70">
                  retry #{hold.retryCount}
                </span>
              )}
            </div>

            {/* Redis key */}
            <div className="flex items-center gap-1.5 mt-1">
              <Hash className="w-3 h-3 text-white/20" />
              <MonoValue className="text-[9px] text-white/30">{hold.redisKey}</MonoValue>
            </div>

            <div className="flex items-center gap-4 mt-1.5">
              <div className="flex items-center gap-1.5">
                <User className="w-3 h-3 text-white/20" />
                <MonoValue className="text-[10px] text-white/45">{hold.buyerHandle}</MonoValue>
              </div>
              <div className="flex items-center gap-1.5">
                <Package className="w-3 h-3 text-white/20" />
                <MonoValue className="text-[10px] text-white/35">{hold.sku}</MonoValue>
              </div>
            </div>

            {/* TTL bar */}
            <TTLBar
              createdAt={hold.createdAt}
              expiresAt={hold.expiresAt}
              className="mt-2 max-w-xs"
            />
          </div>

          {/* Timer + actions */}
          <div className="flex-shrink-0 text-right space-y-1">
            <div className="flex items-center gap-1.5 justify-end">
              <Clock className="w-3 h-3 text-white/25" />
              <CountdownTimer expiresAt={hold.expiresAt} className="text-sm font-semibold" />
            </div>
            <MonoValue className="text-[9px] text-white/25">
              /{hold.ttlSeconds}s TTL
            </MonoValue>
            {hold.state === "EXPIRED_RELEASE" && (
              <button
                onClick={() => setDismissed(true)}
                className="text-[9px] font-mono text-white/25 hover:text-red-400 transition-colors mt-1 block"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>

        {/* Buyer address sub-row */}
        <div className="px-4 pb-2 ml-6">
          <MonoValue className="text-[9px] text-white/20">
            {hold.buyerAddress}
          </MonoValue>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Event Log ─────────────────────────────────────────────────────────────────

const MOCK_LOG_ENTRIES = [
  { time: "14:08:22", event: "HOLD_CREATED", key: "ffff0000-aaaa...", detail: "FC-MTL-BKL-RNCH-022 · @solstice_made" },
  { time: "14:02:11", event: "HOLD_CREATED", key: "dead1234-cafe...", detail: "FC-LTH-KEY-FOB-019 · @grove_supply" },
  { time: "13:56:44", event: "PAYMENT_RETRY", key: "a1b2c3d4-e5f6...", detail: "attempt #2 · FC-LTH-WLT-003" },
  { time: "13:52:31", event: "HOLD_CREATED", key: "a1b2c3d4-e5f6...", detail: "FC-LTH-WLT-003 · @threadline_co" },
  { time: "13:44:09", event: "HOLD_EXPIRED", key: "1a2b3c4d-5e6f...", detail: "auto-released · 1 unit returned to pool" },
  { time: "13:38:55", event: "HOLD_CREATED", key: "7f3a1b2c-d4e5...", detail: "FC-BLT-K1-001 · @ironwood_maren" },
];

const EVENT_COLOR: Record<string, string> = {
  HOLD_CREATED: "text-emerald-400",
  PAYMENT_RETRY: "text-amber-400",
  HOLD_EXPIRED: "text-red-400",
  HOLD_REDEEMED: "text-cyan-400",
};

function EventLog() {
  return (
    <FrostedCard noPadding>
      <div className="px-4 py-3 border-b border-white/8 flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <h3 className="text-xs font-semibold text-white/60 uppercase tracking-widest">
          Live Event Stream
        </h3>
        <span className="ml-auto font-mono text-[9px] text-white/20">
          makerverse:hold:events
        </span>
      </div>
      <div className="divide-y divide-white/5 max-h-52 overflow-y-auto">
        {MOCK_LOG_ENTRIES.map((entry, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-2">
            <MonoValue className="text-[9px] text-white/25 w-14 flex-shrink-0">
              {entry.time}
            </MonoValue>
            <span
              className={cn(
                "font-mono text-[9px] font-semibold w-24 flex-shrink-0 uppercase",
                EVENT_COLOR[entry.event] ?? "text-white/50",
              )}
            >
              {entry.event}
            </span>
            <MonoValue className="text-[9px] text-white/35 flex-1 truncate">
              {entry.key}
            </MonoValue>
            <span className="text-[9px] font-mono text-white/25 hidden sm:block truncate max-w-xs">
              {entry.detail}
            </span>
          </div>
        ))}
      </div>
    </FrostedCard>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function HoldEngineMonitor() {
  const [holds, setHolds] = useState(ACTIVE_HOLDS);
  const [filter, setFilter] = useState<HoldState | "ALL">("ALL");
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const filtered =
    filter === "ALL" ? holds : holds.filter((h) => h.state === filter);

  const refresh = () => {
    setLastRefresh(new Date());
    setHolds([...ACTIVE_HOLDS]);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white">Commerce State Machine</h1>
          <p className="text-xs font-mono text-white/35 mt-0.5">
            Hold Engine Monitor · Redis TTL Streams · Auto-Release Engine
          </p>
        </div>
        <button
          onClick={refresh}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs text-white/60 font-medium transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Summary bar */}
      <HoldSummaryBar holds={holds} />

      {/* Last refresh */}
      <div className="flex items-center gap-2">
        <MonoValue className="text-[9px] text-white/20">
          Last sync: {lastRefresh.toLocaleTimeString()}
        </MonoValue>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2">
        {(["ALL", "ACTIVE_HOLD", "PAYMENT_RETRYING", "EXPIRED_RELEASE"] as const).map(
          (state) => (
            <button
              key={state}
              onClick={() => setFilter(state)}
              className={cn(
                "px-3 py-1.5 rounded-lg font-mono text-[10px] border transition-all uppercase tracking-wide",
                filter === state
                  ? "border-orange-500/40 bg-orange-500/15 text-orange-300"
                  : "border-white/10 bg-white/3 text-white/35 hover:text-white/60",
              )}
            >
              {state === "ALL"
                ? `All (${holds.length})`
                : state === "ACTIVE_HOLD"
                  ? `Active (${holds.filter((h) => h.state === "ACTIVE_HOLD").length})`
                  : state === "PAYMENT_RETRYING"
                    ? `Retrying (${holds.filter((h) => h.state === "PAYMENT_RETRYING").length})`
                    : `Expired (${holds.filter((h) => h.state === "EXPIRED_RELEASE").length})`}
            </button>
          ),
        )}
      </div>

      {/* Hold stream */}
      <FrostedCard noPadding>
        <div className="px-4 py-3 border-b border-white/8">
          <h2 className="text-xs font-semibold text-white/60 uppercase tracking-widest">
            Live Reservation Stream
          </h2>
        </div>
        <AnimatePresence>
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <MonoValue className="text-xs text-white/25">No reservations matching filter</MonoValue>
            </div>
          ) : (
            <div>
              {filtered.map((hold) => (
                <HoldRow
                  key={hold.holdId}
                  hold={hold}
                  isExpired={hold.state === "EXPIRED_RELEASE"}
                />
              ))}
            </div>
          )}
        </AnimatePresence>
      </FrostedCard>

      {/* Event log */}
      <EventLog />
    </div>
  );
}
