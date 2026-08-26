// components/ui/StatusBadge.tsx
"use client";

import { cn } from "@/lib/utils";
import type { HoldState, ChipLockState, StockStatus, TxStatus, POSMode } from "@/lib/mock/adminData";
import type { ChipTier } from "@/lib/mock/shopData";

type BadgeVariant =
  | HoldState
  | ChipLockState
  | StockStatus
  | TxStatus
  | POSMode
  | "CONNECTED"
  | "DEGRADED"
  | "OFFLINE"
  | "VERIFIED"
  | "COZY_MEMBER";

const VARIANT_STYLES: Record<BadgeVariant, string> = {
  // Hold states
  ACTIVE_HOLD:
    "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  PAYMENT_RETRYING:
    "bg-amber-500/15 text-amber-400 border-amber-500/30 animate-pulse",
  EXPIRED_RELEASE:
    "bg-red-500/15 text-red-400 border-red-500/30",
  // Chip lock states
  UNLOCKED:
    "bg-white/10 text-white/50 border-white/10",
  PASSWORD_PROTECTED:
    "bg-orange-500/15 text-orange-400 border-orange-500/30",
  LOCK_BITS_SET:
    "bg-purple-500/15 text-purple-400 border-purple-500/30",
  // Stock
  IN_STOCK:
    "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  LOW_STOCK:
    "bg-amber-500/15 text-amber-400 border-amber-500/30",
  OUT_OF_STOCK:
    "bg-red-500/15 text-red-400 border-red-500/30",
  // POS Tx
  MINT_PENDING:
    "bg-cyan-500/15 text-cyan-400 border-cyan-500/30 animate-pulse",
  MINT_COMPLETE:
    "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  UNCLAIMED:
    "bg-white/10 text-white/40 border-white/10",
  BATCH_QUEUED:
    "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
  // POS Mode
  HIGH_TOUCH:
    "bg-orange-500/20 text-orange-300 border-orange-500/40",
  LOW_TOUCH:
    "bg-sky-500/15 text-sky-400 border-sky-500/30",
  // Edge node
  CONNECTED:
    "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  DEGRADED:
    "bg-amber-500/15 text-amber-400 border-amber-500/30 animate-pulse",
  OFFLINE:
    "bg-red-500/15 text-red-400 border-red-500/30",
  // Misc
  VERIFIED:
    "bg-orange-500/20 text-orange-300 border-orange-500/40",
  COZY_MEMBER:
    "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
};

const VARIANT_LABELS: Partial<Record<BadgeVariant, string>> = {
  ACTIVE_HOLD: "Active Hold",
  PAYMENT_RETRYING: "Retrying Payment",
  EXPIRED_RELEASE: "Expired · Released",
  PASSWORD_PROTECTED: "PW Protected",
  LOCK_BITS_SET: "Lock Bits Set",
  MINT_PENDING: "Mint Pending",
  MINT_COMPLETE: "Mint Complete",
  BATCH_QUEUED: "Batch Queued",
  HIGH_TOUCH: "High-Touch",
  LOW_TOUCH: "Low-Touch",
  CONNECTED: "Edge Connected",
  COZY_MEMBER: "Cozy Member",
};

interface StatusBadgeProps {
  variant: BadgeVariant;
  label?: string;
  className?: string;
  dot?: boolean;
}

export function StatusBadge({ variant, label, className, dot = false }: StatusBadgeProps) {
  const displayLabel = label ?? VARIANT_LABELS[variant] ?? variant.replace(/_/g, " ");
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[10px] font-mono font-medium uppercase tracking-wider",
        VARIANT_STYLES[variant],
        className,
      )}
    >
      {dot && (
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
      )}
      {displayLabel}
    </span>
  );
}

// ─── Chip Tier Badge ──────────────────────────────────────────────────────────

const CHIP_TIER_STYLES: Record<ChipTier, { label: string; style: string }> = {
  QR_REGISTRY: {
    label: "QR Registry",
    style: "bg-white/8 text-white/50 border-white/15",
  },
  NTAG213_SERIALIZED: {
    label: "NTAG213 · Serialized",
    style: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  },
  NTAG215_SERIALIZED: {
    label: "NTAG215 · Serialized",
    style: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  },
  NTAG424_DNA: {
    label: "NTAG424 · DNA",
    style: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  },
};

interface ChipBadgeProps {
  tier: ChipTier;
  className?: string;
}

export function ChipTierBadge({ tier, className }: ChipBadgeProps) {
  const { label, style } = CHIP_TIER_STYLES[tier];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[10px] font-mono font-medium tracking-wide",
        style,
        className,
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {label}
    </span>
  );
}
