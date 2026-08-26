// components/ui/ProvenanceBadge.tsx
"use client";

import { cn } from "@/lib/utils";
import { Cpu, QrCode, ShieldCheck } from "lucide-react";
import type { ChipTier } from "@/lib/mock/shopData";

const TIER_CONFIG: Record<
  ChipTier,
  {
    label: string;
    sublabel: string;
    icon: React.ElementType;
    containerStyle: string;
    iconStyle: string;
    textStyle: string;
  }
> = {
  QR_REGISTRY: {
    label: "QR Registry",
    sublabel: "Maker Certificate",
    icon: QrCode,
    containerStyle: "border-white/15 bg-white/5",
    iconStyle: "text-white/40",
    textStyle: "text-white/50",
  },
  NTAG213_SERIALIZED: {
    label: "NTAG213",
    sublabel: "NFC Serialized",
    icon: Cpu,
    containerStyle: "border-sky-500/25 bg-sky-500/8",
    iconStyle: "text-sky-400",
    textStyle: "text-sky-300",
  },
  NTAG215_SERIALIZED: {
    label: "NTAG215",
    sublabel: "NFC Serialized",
    icon: Cpu,
    containerStyle: "border-sky-400/35 bg-sky-500/12",
    iconStyle: "text-sky-300",
    textStyle: "text-sky-200",
  },
  NTAG424_DNA: {
    label: "NTAG424 DNA",
    sublabel: "Cryptographic CMAC",
    icon: ShieldCheck,
    containerStyle:
      "border-violet-500/40 bg-violet-500/10 shadow-[0_0_16px_rgba(139,92,246,0.15)]",
    iconStyle: "text-violet-300",
    textStyle: "text-violet-200",
  },
};

interface ProvenanceBadgeProps {
  tier: ChipTier;
  /** compact renders icon + short label only */
  compact?: boolean;
  className?: string;
}

export function ProvenanceBadge({ tier, compact = false, className }: ProvenanceBadgeProps) {
  const { label, sublabel, icon: Icon, containerStyle, iconStyle, textStyle } = TIER_CONFIG[tier];

  if (compact) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-mono font-medium",
          containerStyle,
          textStyle,
          className,
        )}
      >
        <Icon className={cn("w-3 h-3", iconStyle)} />
        {label}
      </span>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl border",
        containerStyle,
        className,
      )}
    >
      <div
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center bg-black/20",
          iconStyle,
        )}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className={cn("font-mono text-xs font-semibold leading-tight", textStyle)}>
          {label}
        </p>
        <p className="font-mono text-[10px] text-white/30 leading-tight">{sublabel}</p>
      </div>
    </div>
  );
}
