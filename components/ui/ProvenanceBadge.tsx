// components/ui/ProvenanceBadge.tsx
"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Cpu, QrCode, ShieldCheck, Layers, Sparkles, CheckCircle2, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { ChipTier } from "@/lib/mock/shopData";

export interface TierConfig {
  label: string;
  shortLabel: string;
  sublabel: string;
  description: string;
  hardwareLevel: string;
  securityLevel: string;
  icon: React.ElementType;
  containerStyle: string;
  iconStyle: string;
  textStyle: string;
  dotColor: string;
  glowColor: string;
}

export const TIER_CONFIG: Record<ChipTier, TierConfig> = {
  QR_REGISTRY: {
    label: "QR Registry",
    shortLabel: "QR Registry",
    sublabel: "Maker Certificate",
    description: "Static ledger certificate bound to physical QR etch. Verifiable on-chain provenance.",
    hardwareLevel: "Tier 1: Optical Registry",
    securityLevel: "Standard Verification",
    icon: QrCode,
    containerStyle: "border-white/15 bg-white/5",
    iconStyle: "text-white/60",
    textStyle: "text-white/70",
    dotColor: "bg-white/40",
    glowColor: "rgba(255,255,255,0.1)",
  },
  NTAG213_SERIALIZED: {
    label: "NTAG213 Serialized",
    shortLabel: "NTAG213",
    sublabel: "NFC Hardware UID",
    description: "Factory-programmed 7-byte UID locked with Makerverse master key. Physical tap verification.",
    hardwareLevel: "Tier 2: Serialized Silicon",
    securityLevel: "Hardware Serialized",
    icon: Cpu,
    containerStyle: "border-sky-500/30 bg-sky-500/10",
    iconStyle: "text-sky-400",
    textStyle: "text-sky-300",
    dotColor: "bg-sky-400",
    glowColor: "rgba(56,189,248,0.25)",
  },
  NTAG215_SERIALIZED: {
    label: "NTAG215 Serialized",
    shortLabel: "NTAG215",
    sublabel: "Dynamic NDEF Lot Record",
    description: "High-capacity NFC chip with password-protected memory sectors & dynamic batch provenance.",
    hardwareLevel: "Tier 3: Dynamic NDEF Silicon",
    securityLevel: "High Batch Security",
    icon: Layers,
    containerStyle: "border-cyan-500/35 bg-cyan-500/12",
    iconStyle: "text-cyan-300",
    textStyle: "text-cyan-200",
    dotColor: "bg-cyan-400",
    glowColor: "rgba(34,211,238,0.3)",
  },
  NTAG424_DNA: {
    label: "NTAG424 Cryptographic DNA",
    shortLabel: "NTAG424 DNA",
    sublabel: "AES-128 SUN-CMAC Anti-Cloning",
    description: "Cryptographic DNA generating dynamic AES-128 CMAC signatures on each tap. Mathematical zero-clone guarantee.",
    hardwareLevel: "Tier 4: Cryptographic Zero-Trust",
    securityLevel: "Military-Grade Anti-Cloning",
    icon: ShieldCheck,
    containerStyle: "border-violet-500/40 bg-violet-500/10 shadow-[0_0_16px_rgba(139,92,246,0.18)]",
    iconStyle: "text-violet-300",
    textStyle: "text-violet-200",
    dotColor: "bg-violet-400",
    glowColor: "rgba(139,92,246,0.35)",
  },
};

interface ProvenanceBadgeProps {
  tier: ChipTier;
  /** compact renders icon + short label with status dot */
  compact?: boolean;
  /** showStatusDot displays a pulsing hardware status light */
  showStatusDot?: boolean;
  /** interactive allows clicking or hovering to view chip specs */
  interactive?: boolean;
  className?: string;
  onClick?: () => void;
}

export function ProvenanceBadge({
  tier,
  compact = false,
  showStatusDot = true,
  interactive = false,
  className,
  onClick,
}: ProvenanceBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const config = TIER_CONFIG[tier] || TIER_CONFIG.QR_REGISTRY;
  const {
    label,
    shortLabel,
    sublabel,
    description,
    hardwareLevel,
    securityLevel,
    icon: Icon,
    containerStyle,
    iconStyle,
    textStyle,
    dotColor,
  } = config;

  if (compact) {
    return (
      <div className="relative inline-block">
        <button
          type="button"
          onClick={onClick}
          onMouseEnter={() => interactive && setShowTooltip(true)}
          onMouseLeave={() => interactive && setShowTooltip(false)}
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-mono font-medium transition-all duration-200 select-none",
            containerStyle,
            textStyle,
            interactive && "hover:scale-[1.02] cursor-pointer",
            className,
          )}
        >
          {showStatusDot && (
            <span className="relative flex h-2 w-2">
              <span
                className={cn(
                  "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                  dotColor,
                )}
              />
              <span
                className={cn("relative inline-flex rounded-full h-2 w-2", dotColor)}
              />
            </span>
          )}
          <Icon className={cn("w-3.5 h-3.5", iconStyle)} />
          <span>{shortLabel}</span>
        </button>

        {interactive && (
          <AnimatePresence>
            {showTooltip && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute z-50 bottom-full mb-2 left-0 w-64 p-3 rounded-xl bg-[#1A1A1A]/95 backdrop-blur-xl border border-white/15 shadow-2xl pointer-events-none text-left"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-[10px] font-mono font-semibold uppercase text-cyan-400">
                    {hardwareLevel}
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-white/70">
                    {securityLevel}
                  </span>
                </div>
                <p className="text-xs font-semibold text-white/90 mb-1">{label}</p>
                <p className="text-[11px] text-white/60 leading-relaxed">{description}</p>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-3.5 px-3.5 py-3 rounded-xl border transition-all duration-200",
        containerStyle,
        interactive && "hover:border-white/30 cursor-pointer",
        className,
      )}
    >
      <div
        className={cn(
          "w-9 h-9 rounded-lg flex items-center justify-center bg-black/30 border border-white/5 relative flex-shrink-0",
          iconStyle,
        )}
      >
        <Icon className="w-5 h-5" />
        {showStatusDot && (
          <span
            className={cn(
              "absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-[#1A1A1A]",
              dotColor,
            )}
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={cn("font-mono text-xs font-semibold leading-tight truncate", textStyle)}>
            {label}
          </p>
          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/10 text-white/50 flex-shrink-0">
            {securityLevel}
          </span>
        </div>
        <p className="font-mono text-[10px] text-white/40 leading-tight mt-0.5">
          {sublabel}
        </p>
      </div>
    </div>
  );
}
