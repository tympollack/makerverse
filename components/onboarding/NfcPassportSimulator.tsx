// components/onboarding/NfcPassportSimulator.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Nfc,
  ShieldCheck,
  ArrowRight,
  Radio,
  Wallet,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type PassportSimState =
  | "UNCLAIMED_STUDIO"
  | "CLAIMED_OWNER"
  | "SECONDARY_RESALE_ROYALTY";

interface StateDetail {
  id: PassportSimState;
  stepLabel: string;
  badge: string;
  title: string;
  subtitle: string;
  ownerLabel: string;
  ownerValue: string;
  proofMethod: string;
  tapCount: number;
  royaltyReadout: string;
  creatorPayout: string;
  accentClass: string;
  borderClass: string;
}

const SIM_STATES: StateDetail[] = [
  {
    id: "UNCLAIMED_STUDIO",
    stepLabel: "1. At Booth",
    badge: "Ready on Booth Rack",
    title: "Studio Mint · Ready for First Buyer",
    subtitle:
      "A small NFC tag inside Serial #014 / 114 links this piece to its digital passport. Ready for a buyer's phone tap at your booth or at unboxing.",
    ownerLabel: "Current Custody",
    ownerValue: "Maker Studio (Unclaimed)",
    proofMethod: "Tap-to-Verify Tag (NTAG213 / NTAG424)",
    tapCount: 1,
    royaltyReadout: "5%–10% Resale Royalty Armed",
    creatorPayout: "98% of List Price ($0.05 min fee)",
    accentClass: "text-amber-300 bg-amber-500/15 border-amber-500/35",
    borderClass: "border-amber-500/30",
  },
  {
    id: "CLAIMED_OWNER",
    stepLabel: "2. Claimed",
    badge: "Collector Verified",
    title: "Collector Claimed · Proof of Authenticity",
    subtitle:
      "The buyer tapped their phone and claimed ownership using Apple/Google pass or email. No crypto wallet, seed phrase, or app download needed.",
    ownerLabel: "Registered Owner",
    ownerValue: "@elena_collects · Verified Pass",
    proofMethod: "Verified Original · Signed NFC Tag",
    tapCount: 2,
    royaltyReadout: "7.5% Creator Royalty Locked",
    creatorPayout: "+$73.50 Net Studio Payout",
    accentClass: "text-cyan-300 bg-cyan-500/15 border-cyan-500/35",
    borderClass: "border-cyan-500/35",
  },
  {
    id: "SECONDARY_RESALE_ROYALTY",
    stepLabel: "3. Resold",
    badge: "Resale Royalty Paid",
    title: "Resold Later · Automatic Creator Royalty",
    subtitle:
      "When the piece is resold for $180, the next buyer taps to transfer the passport and your 5%–10% creator royalty routes automatically.",
    ownerLabel: "New Verified Owner",
    ownerValue: "@marcus_v · Secondary Collector",
    proofMethod: "Encrypted Tag Transfer #19",
    tapCount: 19,
    royaltyReadout: "7.5% Resale Royalty Disbursed",
    creatorPayout: "+$13.50 Passive Creator Royalty",
    accentClass: "text-orange-300 bg-[#CC5500]/20 border-[#CC5500]/45",
    borderClass: "border-[#CC5500]/45",
  },
];

export function NfcPassportSimulator() {
  const [stateIndex, setStateIndex] = useState(0);
  const [isTapping, setIsTapping] = useState(false);

  const current = SIM_STATES[stateIndex];

  const handleSimulateTap = () => {
    setIsTapping(true);
    setStateIndex((prev) => (prev + 1) % SIM_STATES.length);
    setTimeout(() => setIsTapping(false), 380);
  };

  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="pointer-events-none absolute -inset-3 rounded-[2.5rem] bg-gradient-to-b from-[#CC5500]/20 via-cyan-500/10 to-transparent blur-2xl" />

      <div
        className={cn(
          "relative rounded-[2.25rem] bg-[#141414] border-2 p-4 sm:p-5 shadow-2xl transition-colors duration-300",
          current.borderClass,
        )}
      >
        {/* Top Phone Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#22D3EE] animate-pulse" />
            <span className="font-mono text-[10px] text-white/65 uppercase tracking-widest">
              Digital Passport Preview
            </span>
          </div>
          <span className="font-mono text-xs font-bold text-[#22D3EE] px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/25">
            #014 / 114
          </span>
        </div>

        {/* Plain-Language Step Selector */}
        <div className="grid grid-cols-3 gap-1.5 mb-4 p-1 rounded-xl bg-black/50 border border-white/10">
          {SIM_STATES.map((item, idx) => {
            const active = idx === stateIndex;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setStateIndex(idx)}
                className={cn(
                  "px-2 py-1.5 rounded-lg font-mono text-[10px] font-semibold truncate transition-all cursor-pointer",
                  active
                    ? "bg-[#CC5500] text-white shadow-[0_0_12px_rgba(204,85,0,0.4)]"
                    : "text-white/45 hover:text-white/80",
                )}
              >
                {item.stepLabel}
              </button>
            );
          })}
        </div>

        {/* Dynamic Passport Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 p-4 space-y-4"
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span
                className={cn(
                  "font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full border",
                  current.accentClass,
                )}
              >
                {current.badge}
              </span>
              <span className="font-mono text-[10px] text-white/45 flex items-center gap-1">
                <Radio className="w-3 h-3 text-[#22D3EE]" />
                Scan #{String(current.tapCount).padStart(2, "0")}
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-orange-400 uppercase tracking-wider">
                  Verified Limited Edition · #014 of 114
                </span>
                <ShieldCheck className="w-4 h-4 text-[#22D3EE]" />
              </div>
              <h3 className="text-base font-bold text-[#F9F9F9] mt-1">
                {current.title}
              </h3>
              <p className="text-xs text-white/70 mt-1 leading-relaxed">
                {current.subtitle}
              </p>
            </div>

            {/* Plain-Language Provenance Summary */}
            <div className="rounded-xl bg-black/50 border border-white/10 p-3 space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-white/45">{current.ownerLabel}</span>
                <span className="text-white/95 font-medium text-right">
                  {current.ownerValue}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-white/8 pt-2">
                <span className="text-white/45">Verification</span>
                <span className="text-[#22D3EE] font-mono text-[11px] text-right">
                  {current.proofMethod}
                </span>
              </div>
            </div>

            {/* Creator Payout Summary */}
            <div className="rounded-xl bg-[#CC5500]/10 border border-[#CC5500]/30 p-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="font-mono text-[10px] text-orange-300 uppercase flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  {current.royaltyReadout}
                </span>
                <span className="font-mono text-xs font-bold text-[#F9F9F9] mt-0.5 block">
                  {current.creatorPayout}
                </span>
              </div>
              <div className="px-2.5 py-1 rounded-lg bg-black/40 border border-white/10 font-mono text-[10px] text-emerald-300 flex items-center gap-1 flex-shrink-0">
                <Wallet className="w-3 h-3" />
                No Wallet Needed
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Tactile Tap CTA */}
        <div className="mt-4 space-y-2">
          <button
            type="button"
            onClick={handleSimulateTap}
            className={cn(
              "w-full py-3 px-4 rounded-xl font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all cursor-pointer",
              "bg-[#CC5500] hover:bg-[#e0621a] text-[#F9F9F9] shadow-[0_0_24px_rgba(204,85,0,0.4)]",
              isTapping && "scale-[0.98] ring-2 ring-[#22D3EE]",
            )}
          >
            <Nfc className="w-4 h-4 text-[#22D3EE]" />
            <span>Simulate NFC Tap</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <p className="text-center font-mono text-[10px] text-white/45">
            Tap to preview: At Booth → Collector Claimed → Secondary Resale
          </p>
        </div>
      </div>
    </div>
  );
}
