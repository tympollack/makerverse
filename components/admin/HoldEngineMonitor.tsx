// components/admin/HoldEngineMonitor.tsx
"use client";

import { useState, useEffect, useRef } from "react";
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
  Plus,
  Play,
  Pause,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Zap,
  Activity,
  Code2,
  X,
  RotateCcw,
  ShoppingBag,
} from "lucide-react";
import { FrostedCard } from "@/components/ui/FrostedCard";
import { MonoValue } from "@/components/ui/MonoValue";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CountdownTimer, TTLBar, formatTTL } from "@/components/ui/CountdownTimer";
import { VersionReleaseBadge } from "@/components/admin/VersionReleaseBadge";
import { ACTIVE_HOLDS } from "@/lib/mock/adminData";
import type { HoldEntry, HoldState } from "@/lib/mock/adminData";
import { cn } from "@/lib/utils";

// ─── Stream Event Types ────────────────────────────────────────────────────────

export interface StreamEventItem {
  id: string;
  time: string;
  timestamp: number;
  event_type:
    | "commerce.hold_created"
    | "commerce.payment_failed"
    | "commerce.reservation_released"
    | "commerce.fulfilled";
  hold_id: string;
  product_id: string;
  sku: string;
  user_id: string;
  detail: string;
  payload: Record<string, unknown>;
}

const INITIAL_EVENTS: StreamEventItem[] = [
  {
    id: "evt_101",
    time: "14:08:22",
    timestamp: Date.now() - 30_000,
    event_type: "commerce.hold_created",
    hold_id: "hold_ffff0000-aaaa-bbbb-cccc-ddddeeee1111",
    product_id: "prod_006",
    sku: "FC-MTL-BKL-RNCH-022",
    user_id: "@solstice_made",
    detail: "Cart reservation established · 600s TTL lock",
    payload: {
      event_id: "evt_101",
      event_type: "commerce.hold_created",
      hold_id: "hold_ffff0000-aaaa-bbbb-cccc-ddddeeee1111",
      product_id: "prod_006",
      sku: "FC-MTL-BKL-RNCH-022",
      user_id: "@solstice_made",
      qty: 1,
      expires_at: Date.now() + 570_000,
      created_at: Date.now() - 30_000,
    },
  },
  {
    id: "evt_102",
    time: "14:02:11",
    timestamp: Date.now() - 120_000,
    event_type: "commerce.hold_created",
    hold_id: "hold_7f3a1b2c-d4e5-4f6a-8b9c-0d1e2f3a4b5c",
    product_id: "prod_001",
    sku: "FC-BLT-K1-001",
    user_id: "@ironwood_maren",
    detail: "Cart reservation established · 600s TTL lock",
    payload: {
      event_id: "evt_102",
      event_type: "commerce.hold_created",
      hold_id: "hold_7f3a1b2c-d4e5-4f6a-8b9c-0d1e2f3a4b5c",
      product_id: "prod_001",
      sku: "FC-BLT-K1-001",
      user_id: "@ironwood_maren",
      qty: 1,
      expires_at: Date.now() + 480_000,
      created_at: Date.now() - 120_000,
    },
  },
  {
    id: "evt_103",
    time: "13:56:44",
    timestamp: Date.now() - 240_000,
    event_type: "commerce.payment_failed",
    hold_id: "hold_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    product_id: "prod_002",
    sku: "FC-LTH-WLT-003",
    user_id: "@threadline_co",
    detail: "Payment retry #2 · card_declined_insufficient_funds · +120s TTL extended",
    payload: {
      event_id: "evt_103",
      event_type: "commerce.payment_failed",
      hold_id: "hold_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      product_id: "prod_002",
      user_id: "@threadline_co",
      reason: "card_declined_insufficient_funds",
      retry_count: 2,
      timestamp: Date.now() - 240_000,
    },
  },
  {
    id: "evt_104",
    time: "13:44:09",
    timestamp: Date.now() - 620_000,
    event_type: "commerce.reservation_released",
    hold_id: "hold_dead1234-cafe-babe-feed-000000000001",
    product_id: "prod_005",
    sku: "FC-LTH-KEY-FOB-019",
    user_id: "@grove_supply",
    detail: "TTL expired (0s) · auto-released 1 unit to product stock pool",
    payload: {
      event_id: "evt_104",
      event_type: "commerce.reservation_released",
      hold_id: "hold_dead1234-cafe-babe-feed-000000000001",
      product_id: "prod_005",
      user_id: "@grove_supply",
      qty: 1,
      reason: "expired",
      released_at: Date.now() - 620_000,
    },
  },
];

const EVENT_CONFIG: Record<
  StreamEventItem["event_type"],
  { color: string; badgeClass: string; label: string }
> = {
  "commerce.hold_created": {
    color: "text-emerald-400",
    badgeClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    label: "hold_created",
  },
  "commerce.payment_failed": {
    color: "text-amber-400",
    badgeClass: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    label: "payment_failed",
  },
  "commerce.reservation_released": {
    color: "text-red-400",
    badgeClass: "bg-red-500/15 text-red-400 border-red-500/30",
    label: "reservation_released",
  },
  "commerce.fulfilled": {
    color: "text-cyan-400",
    badgeClass: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
    label: "fulfilled",
  },
};

// ─── Summary Metrics Bar ───────────────────────────────────────────────────────

function HoldSummaryBar({
  holds,
  filter,
  setFilter,
}: {
  holds: HoldEntry[];
  filter: HoldState | "ALL";
  setFilter: (s: HoldState | "ALL") => void;
}) {
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
      label: "Active Holds",
      sublabel: "600s TTL active locks",
      color: "text-emerald-400",
      borderGlow: "hover:border-emerald-500/40 hover:shadow-[0_0_24px_rgba(16,185,129,0.18)]",
      activeBg: "bg-emerald-500/10 border-emerald-500/40 shadow-[0_0_24px_rgba(16,185,129,0.2)]",
    },
    {
      state: "PAYMENT_RETRYING" as HoldState,
      count: counts.PAYMENT_RETRYING,
      icon: AlertCircle,
      label: "Payment Retries",
      sublabel: "Grace period (+120s)",
      color: "text-amber-400",
      borderGlow: "hover:border-amber-500/40 hover:shadow-[0_0_24px_rgba(245,158,11,0.18)]",
      activeBg: "bg-amber-500/10 border-amber-500/40 shadow-[0_0_24px_rgba(245,158,11,0.2)]",
    },
    {
      state: "EXPIRED_RELEASE" as HoldState,
      count: counts.EXPIRED_RELEASE,
      icon: XCircle,
      label: "Expired Releases",
      sublabel: "Restored to stock pool",
      color: "text-red-400",
      borderGlow: "hover:border-red-500/40 hover:shadow-[0_0_24px_rgba(239,68,68,0.18)]",
      activeBg: "bg-red-500/10 border-red-500/40 shadow-[0_0_24px_rgba(239,68,68,0.2)]",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {items.map((item) => {
        const isSelected = filter === item.state;
        return (
          <button
            key={item.state}
            onClick={() => setFilter(isSelected ? "ALL" : item.state)}
            className="text-left cursor-pointer transition-all duration-200"
          >
            <FrostedCard
              className={cn(
                "flex items-center gap-3.5 transition-all duration-200",
                item.borderGlow,
                isSelected ? item.activeBg : "bg-white/4 border-white/8",
              )}
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-white/5 border border-white/10",
                  isSelected && "border-current",
                )}
              >
                <item.icon className={cn("w-5 h-5", item.color)} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <MonoValue glow="white" className="text-2xl font-bold">
                    {item.count}
                  </MonoValue>
                  <StatusBadge variant={item.state} className="text-[9px] px-1.5 py-0" />
                </div>
                <p className="text-xs font-semibold text-white/80 mt-0.5">{item.label}</p>
                <p className="text-[10px] font-mono text-white/35 truncate">{item.sublabel}</p>
              </div>
            </FrostedCard>
          </button>
        );
      })}
    </div>
  );
}

// ─── Payload Inspection Modal ──────────────────────────────────────────────────

function PayloadModal({
  hold,
  onClose,
}: {
  hold: HoldEntry | null;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  if (!hold) return null;

  const redisHash = {
    redis_key: hold.redisKey,
    hold_id: hold.holdId,
    product_id: hold.productId,
    product_title: hold.productTitle,
    sku: hold.sku,
    user_handle: hold.buyerHandle,
    user_address: hold.buyerAddress,
    state: hold.state,
    qty: 1,
    initial_ttl_seconds: hold.ttlSeconds,
    created_at_iso: new Date(hold.createdAt).toISOString(),
    expires_at_iso: new Date(hold.expiresAt).toISOString(),
    remaining_ms: Math.max(0, hold.expiresAt - Date.now()),
    retry_count: hold.retryCount ?? 0,
    concurrency_engine: "Lua Atomic Script (NIST SP 800-38B Verified)",
  };

  const jsonStr = JSON.stringify(redisHash, null, 2);

  const copyPayload = () => {
    navigator.clipboard.writeText(jsonStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-xl bg-[#171717] border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/3">
          <div className="flex items-center gap-2.5">
            <Code2 className="w-4 h-4 text-orange-400" />
            <span className="font-mono text-xs font-semibold text-white/90">
              Redis Hash & State Machine Inspector
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StatusBadge variant={hold.state} />
              <span className="font-mono text-[10px] text-white/40">{hold.productTitle}</span>
            </div>
            <button
              onClick={copyPayload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-mono text-white/70 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy JSON"}
            </button>
          </div>

          <pre className="p-4 rounded-xl bg-black/60 border border-white/8 text-[11px] font-mono text-cyan-300/90 overflow-x-auto leading-relaxed selection:bg-cyan-500/30">
            {jsonStr}
          </pre>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Hold Row Component ────────────────────────────────────────────────────────

function HoldRow({
  hold,
  onExtendTTL,
  onRelease,
  onFulfill,
  onInspect,
}: {
  hold: HoldEntry;
  onExtendTTL: (holdId: string) => void;
  onRelease: (holdId: string) => void;
  onFulfill: (holdId: string) => void;
  onInspect: (hold: HoldEntry) => void;
}) {
  const [copiedKey, setCopiedKey] = useState(false);
  const isExpired = hold.state === "EXPIRED_RELEASE";

  const copyKey = () => {
    navigator.clipboard.writeText(hold.redisKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, overflow: "hidden" }}
      transition={{ duration: 0.2 }}
      className={cn(
        "border-b border-white/6 last:border-0 p-4 transition-colors",
        isExpired ? "bg-white/[0.01] opacity-60" : "hover:bg-white/[0.02]",
      )}
    >
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        {/* Left column: Status, product, buyer, redis key */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="mt-1 flex-shrink-0">
            {hold.state === "ACTIVE_HOLD" && (
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            )}
            {hold.state === "PAYMENT_RETRYING" && (
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)] animate-pulse" />
            )}
            {hold.state === "EXPIRED_RELEASE" && (
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-600" />
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-sm font-semibold text-white/90 truncate">
                {hold.productTitle}
              </span>
              <StatusBadge variant={hold.state} />
              {hold.retryCount !== undefined && hold.retryCount > 0 && (
                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/25 text-amber-400 font-semibold animate-pulse">
                  RETRY #{hold.retryCount}
                </span>
              )}
            </div>

            {/* Metadata badges */}
            <div className="flex items-center gap-3.5 flex-wrap text-xs">
              <div className="flex items-center gap-1.5 text-white/50">
                <User className="w-3.5 h-3.5 text-white/30" />
                <MonoValue className="text-[11px] text-white/70">{hold.buyerHandle}</MonoValue>
              </div>

              <div className="flex items-center gap-1.5 text-white/50">
                <Package className="w-3.5 h-3.5 text-white/30" />
                <MonoValue className="text-[10px] text-white/40">{hold.sku}</MonoValue>
              </div>

              <button
                onClick={copyKey}
                title="Click to copy Redis Key"
                className="flex items-center gap-1 font-mono text-[10px] text-white/30 hover:text-cyan-300 transition-colors"
              >
                <Hash className="w-3 h-3 text-white/20" />
                <span className="truncate max-w-[200px]">{hold.redisKey}</span>
                {copiedKey ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-2.5 h-2.5 text-white/20" />
                )}
              </button>
            </div>

            {/* Depleting progress bar */}
            <div className="pt-1 max-w-sm">
              <div className="flex items-center justify-between text-[10px] font-mono text-white/30 mb-1">
                <span>TTL Countdown</span>
                <span>{hold.ttlSeconds}s Max Window</span>
              </div>
              <TTLBar createdAt={hold.createdAt} expiresAt={hold.expiresAt} />
            </div>
          </div>
        </div>

        {/* Right column: Monospaced countdown + action buttons */}
        <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-2 flex-shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-white/5">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-white/30" />
            <CountdownTimer expiresAt={hold.expiresAt} className="text-base font-bold" />
          </div>

          {/* Quick action buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => onInspect(hold)}
              className="px-2.5 py-1 rounded-lg border border-white/10 bg-white/4 hover:bg-white/10 text-[11px] font-mono text-white/60 hover:text-white transition-all"
              title="Inspect Redis Payload"
            >
              Payload
            </button>

            {hold.state !== "EXPIRED_RELEASE" && (
              <>
                <button
                  onClick={() => onExtendTTL(hold.holdId)}
                  className="px-2.5 py-1 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-[11px] font-mono text-amber-300 transition-all"
                  title="Extend TTL (+120s) and enter payment retry state"
                >
                  +120s Retry
                </button>
                <button
                  onClick={() => onRelease(hold.holdId)}
                  className="px-2.5 py-1 rounded-lg border border-red-500/25 bg-red-500/10 hover:bg-red-500/20 text-[11px] font-mono text-red-400 transition-all"
                  title="Release reserved stock back to pool"
                >
                  Release
                </button>
                <button
                  onClick={() => onFulfill(hold.holdId)}
                  className="px-2.5 py-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-[11px] font-mono text-cyan-300 transition-all"
                  title="Fulfill and mint ownership"
                >
                  Fulfill
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Live Event Log Stream ─────────────────────────────────────────────────────

function EventStreamLog({
  events,
  isStreaming,
  setIsStreaming,
  onClear,
  onInspectPayload,
}: {
  events: StreamEventItem[];
  isStreaming: boolean;
  setIsStreaming: (s: boolean | ((prev: boolean) => boolean)) => void;
  onClear: () => void;
  onInspectPayload: (payload: Record<string, unknown>) => void;
}) {
  const [selectedEventType, setSelectedEventType] = useState<string>("ALL");
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  const filteredEvents =
    selectedEventType === "ALL"
      ? events
      : events.filter((e) => e.event_type === selectedEventType);

  return (
    <FrostedCard noPadding className="overflow-hidden">
      {/* Stream header */}
      <div className="px-4 py-3.5 border-b border-white/8 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              "w-2 h-2 rounded-full",
              isStreaming ? "bg-emerald-400 animate-pulse" : "bg-zinc-500",
            )}
          />
          <h3 className="text-xs font-semibold text-white/80 uppercase tracking-widest flex items-center gap-2">
            <span>Live Stream Event Log</span>
            <span className="font-mono text-[9px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/40 lowercase">
              makerverse:events:commerce
            </span>
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {/* Pause / Resume button */}
          <button
            onClick={() => setIsStreaming((prev) => !prev)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono transition-all",
              isStreaming
                ? "border-white/15 bg-white/5 text-white/70 hover:bg-white/10"
                : "border-amber-500/40 bg-amber-500/15 text-amber-300",
            )}
          >
            {isStreaming ? (
              <>
                <Pause className="w-3 h-3 text-amber-400" />
                Pause Stream
              </>
            ) : (
              <>
                <Play className="w-3 h-3 text-emerald-400" />
                Resume Stream
              </>
            )}
          </button>

          <button
            onClick={onClear}
            className="px-2.5 py-1 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-mono text-white/40 hover:text-white/70 transition-all"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Filter sub-bar */}
      <div className="px-4 py-2 border-b border-white/5 bg-white/[0.02] flex items-center gap-2 overflow-x-auto text-[10px] font-mono">
        <span className="text-white/30 uppercase tracking-wider">Filter:</span>
        {["ALL", "commerce.hold_created", "commerce.payment_failed", "commerce.reservation_released", "commerce.fulfilled"].map((type) => (
          <button
            key={type}
            onClick={() => setSelectedEventType(type)}
            className={cn(
              "px-2 py-1 rounded transition-all whitespace-nowrap",
              selectedEventType === type
                ? "bg-orange-500/20 text-orange-300 border border-orange-500/40"
                : "text-white/40 hover:text-white hover:bg-white/5",
            )}
          >
            {type === "ALL" ? "All Events" : type.replace("commerce.", "")}
          </button>
        ))}
      </div>

      {/* Stream event list */}
      <div className="divide-y divide-white/5 max-h-72 overflow-y-auto font-mono text-xs">
        {filteredEvents.length === 0 ? (
          <div className="p-8 text-center text-white/30 text-xs font-mono">
            No events logged matching filter
          </div>
        ) : (
          filteredEvents.map((entry) => {
            const isExpanded = expandedEventId === entry.id;
            const config = EVENT_CONFIG[entry.event_type] || {
              color: "text-white/70",
              badgeClass: "bg-white/10 text-white/70 border-white/15",
              label: entry.event_type,
            };

            return (
              <div key={entry.id} className="transition-colors hover:bg-white/[0.02]">
                <div
                  onClick={() => setExpandedEventId(isExpanded ? null : entry.id)}
                  className="flex items-center gap-3 px-4 py-2.5 cursor-pointer select-none"
                >
                  <span className="text-[10px] text-white/30 w-16 flex-shrink-0">
                    {entry.time}
                  </span>

                  <span
                    className={cn(
                      "text-[9px] px-2 py-0.5 rounded border uppercase font-semibold flex-shrink-0",
                      config.badgeClass,
                    )}
                  >
                    {config.label}
                  </span>

                  <span className="text-[10px] text-cyan-300/80 truncate w-32 hidden sm:block">
                    {entry.hold_id.replace("hold_", "")}
                  </span>

                  <span className="text-[11px] text-white/60 flex-1 truncate">
                    {entry.detail}
                  </span>

                  <div className="flex items-center gap-1.5 flex-shrink-0 text-white/30">
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                  </div>
                </div>

                {/* Expandable JSON Payload view */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.15 }}
                      className="px-4 pb-3 pt-1 bg-black/40 border-t border-white/5"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-mono text-white/35">
                          Stream Payload: {entry.event_type}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(JSON.stringify(entry.payload, null, 2));
                          }}
                          className="text-[10px] font-mono text-cyan-400 hover:underline flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" />
                          Copy JSON
                        </button>
                      </div>
                      <pre className="p-3 rounded-lg bg-black/70 border border-white/8 text-[10px] font-mono text-emerald-300/90 overflow-x-auto">
                        {JSON.stringify(entry.payload, null, 2)}
                      </pre>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>
    </FrostedCard>
  );
}

// ─── Main Component: HoldEngineMonitor ─────────────────────────────────────────

export function HoldEngineMonitor() {
  const [holds, setHolds] = useState<HoldEntry[]>(ACTIVE_HOLDS);
  const [events, setEvents] = useState<StreamEventItem[]>(INITIAL_EVENTS);
  const [filter, setFilter] = useState<HoldState | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isStreaming, setIsStreaming] = useState(true);
  const [lastSync, setLastSync] = useState(new Date());
  const [inspectedHold, setInspectedHold] = useState<HoldEntry | null>(null);

  // Auto-expire check: periodically checks if active holds crossed expiration timestamp
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setHolds((prevHolds) => {
        let changed = false;
        const updated = prevHolds.map((h) => {
          if (h.state !== "EXPIRED_RELEASE" && h.expiresAt <= now) {
            changed = true;
            // Record auto-release stream event
            const newEvt: StreamEventItem = {
              id: `evt_${Date.now()}`,
              time: new Date().toLocaleTimeString(),
              timestamp: now,
              event_type: "commerce.reservation_released",
              hold_id: h.holdId,
              product_id: h.productId,
              sku: h.sku,
              user_id: h.buyerHandle,
              detail: `TTL expired (${formatTTL(0)}) · auto-released 1 unit to stock pool`,
              payload: {
                event_id: `evt_${Date.now()}`,
                event_type: "commerce.reservation_released",
                hold_id: h.holdId,
                product_id: h.productId,
                user_id: h.buyerHandle,
                qty: 1,
                reason: "expired",
                released_at: now,
              },
            };
            setEvents((evts) => [newEvt, ...evts]);
            return { ...h, state: "EXPIRED_RELEASE" as HoldState };
          }
          return h;
        });
        return changed ? updated : prevHolds;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Filtered hold list
  const filteredHolds = holds.filter((h) => {
    const matchesState = filter === "ALL" || h.state === filter;
    const matchesSearch =
      searchQuery === "" ||
      h.productTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.buyerHandle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.holdId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesState && matchesSearch;
  });

  // Action: Extend TTL (+120s)
  const handleExtendTTL = (holdId: string) => {
    const now = Date.now();
    setHolds((prev) =>
      prev.map((h) => {
        if (h.holdId === holdId) {
          const newExpires = now + 120_000;
          const newRetryCount = (h.retryCount || 0) + 1;
          const newEvt: StreamEventItem = {
            id: `evt_${Date.now()}`,
            time: new Date().toLocaleTimeString(),
            timestamp: now,
            event_type: "commerce.payment_failed",
            hold_id: h.holdId,
            product_id: h.productId,
            sku: h.sku,
            user_id: h.buyerHandle,
            detail: `Payment retry #${newRetryCount} · manual grace extension · +120s TTL`,
            payload: {
              event_id: `evt_${Date.now()}`,
              event_type: "commerce.payment_failed",
              hold_id: h.holdId,
              product_id: h.productId,
              user_id: h.buyerHandle,
              reason: "payment_retry_extension",
              retry_count: newRetryCount,
              timestamp: now,
            },
          };
          setEvents((evts) => [newEvt, ...evts]);
          return {
            ...h,
            state: "PAYMENT_RETRYING" as HoldState,
            expiresAt: newExpires,
            retryCount: newRetryCount,
          };
        }
        return h;
      }),
    );
  };

  // Action: Manual Release
  const handleRelease = (holdId: string) => {
    const now = Date.now();
    setHolds((prev) =>
      prev.map((h) => {
        if (h.holdId === holdId) {
          const newEvt: StreamEventItem = {
            id: `evt_${Date.now()}`,
            time: new Date().toLocaleTimeString(),
            timestamp: now,
            event_type: "commerce.reservation_released",
            hold_id: h.holdId,
            product_id: h.productId,
            sku: h.sku,
            user_id: h.buyerHandle,
            detail: `Admin override release · restored 1 unit ${h.sku} to active inventory`,
            payload: {
              event_id: `evt_${Date.now()}`,
              event_type: "commerce.reservation_released",
              hold_id: h.holdId,
              product_id: h.productId,
              user_id: h.buyerHandle,
              qty: 1,
              reason: "admin_override",
              released_at: now,
            },
          };
          setEvents((evts) => [newEvt, ...evts]);
          return { ...h, state: "EXPIRED_RELEASE" as HoldState, expiresAt: now - 1000 };
        }
        return h;
      }),
    );
  };

  // Action: Fulfill
  const handleFulfill = (holdId: string) => {
    const now = Date.now();
    const target = holds.find((h) => h.holdId === holdId);
    if (!target) return;

    const txHash = `0x${Math.random().toString(16).substring(2, 10)}...${Math.random().toString(16).substring(2, 6)}`;
    const newEvt: StreamEventItem = {
      id: `evt_${Date.now()}`,
      time: new Date().toLocaleTimeString(),
      timestamp: now,
      event_type: "commerce.fulfilled",
      hold_id: target.holdId,
      product_id: target.productId,
      sku: target.sku,
      user_id: target.buyerHandle,
      detail: `Payment fulfilled · ${target.productTitle} minted to ${target.buyerHandle} (${txHash})`,
      payload: {
        event_id: `evt_${Date.now()}`,
        event_type: "commerce.fulfilled",
        hold_id: target.holdId,
        order_id: `ord_${Math.random().toString(36).substring(2, 8)}`,
        product_id: target.productId,
        sku: target.sku,
        user_id: target.buyerHandle,
        qty: 1,
        total_cents: 14800,
        tx_hash: txHash,
        timestamp: now,
      },
    };
    setEvents((evts) => [newEvt, ...evts]);
    // Remove fulfilled hold from active stream
    setHolds((prev) => prev.filter((h) => h.holdId !== holdId));
  };

  // Simulate incoming new hold
  const handleSimulateNewHold = () => {
    const now = Date.now();
    const id = `hold_${Math.random().toString(16).substring(2, 10)}-${Math.random().toString(16).substring(2, 6)}`;
    const mockBuyers = ["@alder_crafts", "@copper_and_oak", "@selvedge_denim", "@solstice_mfg"];
    const mockProducts = [
      { id: "prod_001", sku: "FC-BLT-K1-001", title: "Blackened Copper Keyring — Gen 1" },
      { id: "prod_002", sku: "FC-LTH-WLT-003", title: "Bridle Leather Bifold — Horween #003" },
      { id: "prod_005", sku: "FC-LTH-KEY-FOB-019", title: "Veg-Tan Key Fob — NTAG424" },
    ];
    const buyer = mockBuyers[Math.floor(Math.random() * mockBuyers.length)];
    const product = mockProducts[Math.floor(Math.random() * mockProducts.length)];

    const newHold: HoldEntry = {
      holdId: id,
      redisKey: `makerverse:hold:${id.replace("hold_", "")}`,
      productId: product.id,
      productTitle: product.title,
      sku: product.sku,
      buyerHandle: buyer,
      buyerAddress: `0x${Math.random().toString(16).substring(2, 6)}...${Math.random().toString(16).substring(2, 6)}`,
      createdAt: now,
      expiresAt: now + 600_000,
      ttlSeconds: 600,
      state: "ACTIVE_HOLD",
    };

    const newEvt: StreamEventItem = {
      id: `evt_${Date.now()}`,
      time: new Date().toLocaleTimeString(),
      timestamp: now,
      event_type: "commerce.hold_created",
      hold_id: newHold.holdId,
      product_id: newHold.productId,
      sku: newHold.sku,
      user_id: newHold.buyerHandle,
      detail: `Inbound cart hold reservation · 600s TTL key created`,
      payload: {
        event_id: `evt_${Date.now()}`,
        event_type: "commerce.hold_created",
        hold_id: newHold.holdId,
        product_id: newHold.productId,
        sku: newHold.sku,
        user_id: newHold.buyerHandle,
        qty: 1,
        expires_at: now + 600_000,
        created_at: now,
      },
    };

    setHolds((prev) => [newHold, ...prev]);
    setEvents((evts) => [newEvt, ...evts]);
  };

  const handleRefresh = () => {
    setLastSync(new Date());
    setHolds([...ACTIVE_HOLDS]);
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header & simulation toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold text-white tracking-wide">
              Commerce Hold Engine Monitor
            </h1>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              Redis Live Engine
            </span>
            <VersionReleaseBadge variant="pill" />
          </div>
          <p className="text-xs font-mono text-white/40 mt-1">
            Distributed 600s TTL State Machine · Atomic Lua Concurrency · Redis Stream Bus
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleSimulateNewHold}
            className="btn-cta flex items-center gap-1.5 text-xs py-2 px-3 shadow-[0_0_16px_rgba(204,85,0,0.3)]"
          >
            <Plus className="w-3.5 h-3.5" />
            Simulate Inbound Hold
          </button>

          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs text-white/70 font-medium transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Sync ({lastSync.toLocaleTimeString()})
          </button>
        </div>
      </div>

      {/* Summary metric cards */}
      <HoldSummaryBar holds={holds} filter={filter} setFilter={setFilter} />

      {/* Filterable tabs & Search bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(["ALL", "ACTIVE_HOLD", "PAYMENT_RETRYING", "EXPIRED_RELEASE"] as const).map((state) => {
            const count =
              state === "ALL"
                ? holds.length
                : holds.filter((h) => h.state === state).length;
            const isSelected = filter === state;

            return (
              <button
                key={state}
                onClick={() => setFilter(state)}
                className={cn(
                  "px-3 py-1.5 rounded-lg font-mono text-xs border transition-all flex items-center gap-2 uppercase tracking-wide",
                  isSelected
                    ? "border-orange-500/50 bg-orange-500/20 text-orange-200 shadow-[0_0_12px_rgba(204,85,0,0.2)]"
                    : "border-white/8 bg-white/3 text-white/40 hover:text-white/70 hover:bg-white/6",
                )}
              >
                <span>{state === "ALL" ? "All Reservations" : state.replace("_", " ")}</span>
                <span
                  className={cn(
                    "px-1.5 py-0.2 rounded text-[10px]",
                    isSelected ? "bg-orange-500/30 text-white font-bold" : "bg-white/10 text-white/50",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="w-full sm:w-64">
          <input
            type="text"
            placeholder="Search SKU, buyer, title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-white placeholder:text-white/25 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/30 transition-all"
          />
        </div>
      </div>

      {/* Live Hold Reservation List */}
      <FrostedCard noPadding className="overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-orange-400" />
            <h2 className="text-xs font-semibold text-white/80 uppercase tracking-widest">
              Live Hold Reservation Pool
            </h2>
          </div>
          <span className="font-mono text-[10px] text-white/35">
            {filteredHolds.length} item{filteredHolds.length === 1 ? "" : "s"} tracked
          </span>
        </div>

        <AnimatePresence mode="popLayout">
          {filteredHolds.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Package className="w-8 h-8 text-white/20 mx-auto" />
              <p className="text-xs font-mono text-white/40">
                No active reservations matching current filter
              </p>
            </div>
          ) : (
            <div>
              {filteredHolds.map((hold) => (
                <HoldRow
                  key={hold.holdId}
                  hold={hold}
                  onExtendTTL={handleExtendTTL}
                  onRelease={handleRelease}
                  onFulfill={handleFulfill}
                  onInspect={setInspectedHold}
                />
              ))}
            </div>
          )}
        </AnimatePresence>
      </FrostedCard>

      {/* Live Stream Event Log */}
      <EventStreamLog
        events={events}
        isStreaming={isStreaming}
        setIsStreaming={setIsStreaming}
        onClear={() => setEvents([])}
        onInspectPayload={(p) => setInspectedHold(null)}
      />

      {/* Payload Modal */}
      <AnimatePresence>
        {inspectedHold && (
          <PayloadModal hold={inspectedHold} onClose={() => setInspectedHold(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
