// components/admin/DropPresetsSection.tsx
"use client";

import { Sparkles, Type, GitBranch } from "lucide-react";
import type { ChipTier } from "@/lib/mock/shopData";
import { cn } from "@/lib/utils";

export interface DropPresetConfig {
  id: "stunt_tee" | "art_print" | "fine_art_auction";
  label: string;
  badge: string;
  priceUsd: number;
  chipTier: ChipTier;
  stockQty: number;
  uncapped: boolean;
  auctionEnabled: boolean;
  durationHours: number | null;
  coSignRequired: boolean;
  defaultTitlePrefix: string;
}

export const DROP_PRESETS: DropPresetConfig[] = [
  {
    id: "stunt_tee",
    label: "24hr Pure-Type Stunt Tee",
    badge: "$25 · NTAG213 · #69 Auction",
    priceUsd: 25,
    chipTier: "NTAG213_SERIALIZED",
    stockQty: 100,
    uncapped: true,
    auctionEnabled: true,
    durationHours: 24,
    coSignRequired: false,
    defaultTitlePrefix: "24hr Pure-Type Tee — ",
  },
  {
    id: "art_print",
    label: "Numbered Art Print Run",
    badge: "$40 · QR_SERIAL · $5 Vanity",
    priceUsd: 40,
    chipTier: "QR_REGISTRY",
    stockQty: 50,
    uncapped: false,
    auctionEnabled: true,
    durationHours: 168,
    coSignRequired: false,
    defaultTitlePrefix: "Numbered Archival Print — ",
  },
  {
    id: "fine_art_auction",
    label: "1-of-1 Fine Art Auction",
    badge: "NTAG424_DNA · Soft-Close",
    priceUsd: 250,
    chipTier: "NTAG424_DNA",
    stockQty: 1,
    uncapped: false,
    auctionEnabled: true,
    durationHours: 72,
    coSignRequired: true,
    defaultTitlePrefix: "1-of-1 Studio Original — ",
  },
];

interface DropPresetsSectionProps {
  selectedPresetId: string | null;
  onApplyPreset: (preset: DropPresetConfig) => void;
  versionTag: string;
  parentSku?: string | null;
  artistAttribution: string;
  onArtistAttributionChange: (val: string) => void;
  frontChestStamp: string;
  onFrontChestStampChange: (val: string) => void;
  backStatement: string;
  onBackStatementChange: (val: string) => void;
}

export function DropPresetsSection({
  selectedPresetId,
  onApplyPreset,
  versionTag,
  parentSku,
  artistAttribution,
  onArtistAttributionChange,
  frontChestStamp,
  onFrontChestStampChange,
  backStatement,
  onBackStatementChange,
}: DropPresetsSectionProps) {
  const isV2 = versionTag.toLowerCase().startsWith("v2");

  return (
    <div className="space-y-4">
      {/* Quick-Start Drop Presets */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-semibold text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Quick-Start Drop Presets</span>
          </span>
          <span className="text-[10px] font-mono text-white/40">1-Click Template</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {DROP_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onApplyPreset(preset)}
              className={cn(
                "text-left p-2.5 rounded-xl border transition-all cursor-pointer",
                selectedPresetId === preset.id
                  ? "bg-[#CC5500]/20 border-[#CC5500] text-orange-100"
                  : "bg-white/5 border-white/10 hover:border-white/25 text-white/75",
              )}
            >
              <span className="block text-xs font-bold leading-snug">{preset.label}</span>
              <span className="block font-mono text-[9px] text-cyan-300 mt-1">
                {preset.badge}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* v2.0 Graduation & Artist Attribution */}
      {isV2 && (
        <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/35 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold text-purple-200 flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5 text-purple-300" />
              <span>v2.0 Artist Edition Graduation</span>
            </span>
            {parentSku && (
              <span className="font-mono text-[10px] text-purple-300/80">
                Parent: {parentSku}
              </span>
            )}
          </div>
          <input
            type="text"
            value={artistAttribution}
            onChange={(e) => onArtistAttributionChange(e.target.value)}
            placeholder="Co-Signed Artist Attribution (e.g. Co-Signed x Studio Kestrel)"
            aria-label="Co-Signed Artist Attribution"
            className="w-full bg-black/40 border border-purple-500/30 rounded-lg px-3 py-2 font-mono text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-purple-400"
          />
        </div>
      )}

      {/* Pure-Type Graphic Generator */}
      <div className="p-3.5 rounded-xl bg-white/3 border border-white/8 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] font-semibold text-cyan-300 flex items-center gap-1.5">
            <Type className="w-3.5 h-3.5" />
            <span>Pure-Type Graphic Generator</span>
          </span>
          <span className="font-mono text-[9px] text-white/40">Typography Apparel Preview</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <input
            type="text"
            value={frontChestStamp}
            onChange={(e) => onFrontChestStampChange(e.target.value)}
            placeholder="Front Chest Stamp (e.g. GET BENT)"
            aria-label="Front Chest Stamp"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 font-mono text-xs text-white placeholder:text-white/25 focus:outline-none focus:border-[#CC5500]"
          />
          <input
            type="text"
            value={backStatement}
            onChange={(e) => onBackStatementChange(e.target.value)}
            placeholder="Back Statement (e.g. NOT ON SALE.)"
            aria-label="Back Statement"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 font-mono text-xs text-white placeholder:text-white/25 focus:outline-none focus:border-[#CC5500]"
          />
        </div>

        {(frontChestStamp || backStatement) && (
          <div className="p-3 rounded-lg bg-[#1A1A1A] border border-white/10 grid grid-cols-2 gap-2 font-mono text-center">
            <div className="p-2 rounded bg-black/50 border border-white/5">
              <span className="block text-[9px] text-white/35 uppercase">Front Chest</span>
              <span className="block text-xs font-extrabold tracking-widest text-[#F9F9F9] mt-1">
                {frontChestStamp || "—"}
              </span>
            </div>
            <div className="p-2 rounded bg-black/50 border border-white/5">
              <span className="block text-[9px] text-white/35 uppercase">Back Statement</span>
              <span className="block text-xs font-extrabold tracking-wider text-[#CC5500] mt-1">
                {backStatement || "—"}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
