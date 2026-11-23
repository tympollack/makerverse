// components/onboarding/NfcPassportSimulator.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Nfc,
  ShieldCheck,
  Sparkles,
  Cpu,
  CheckCircle2,
  ArrowRight,
  Lock,
  Radio,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type PassportSimState =
  | "UNCLAIMED_STUDIO"
  | "CLAIMED_OWNER"
  | "SECONDARY_RESALE_ROYALTY";

interface StateDetail {
  id: PassportSimState;
  badge: string;
  title: string;
  subtitle: string;
  ownerLabel: string;
  ownerValue: string;
  chipModel: string;
  cmacHash: string;
  tapCount: number;
  royaltyReadout: string;
  creatorPayout: string;
  accentClass: string;
  borderClass: string;
}

const SIM_STATES: StateDetail[] = [
  {
    id: "UNCLAIMED_STUDIO",
    badge: "UNCLAIMED_STUDIO",
    title: "Studio Mint · Ready on Booth Rack",
    subtitle:
      "Embedded NTAG213 / NTAG424 chip is cryptographically sealed to Serial #014 / 114. Waiting for buyer smartphone tap at the festival booth or unboxing.",
    ownerLabel: "CUSTODY STATE",
    ownerValue: "Maker Studio Vault (Unclaimed)",
    chipModel: "NTAG213 / NTAG424 DNA · 13.56 MHz",
    cmacHash: "CMAC: 7F4A9C1E8B20D314",
    tapCount: 1,
    royaltyReadout: "5%–10% EIP-2981 Royalty Armed",
    creatorPayout: "98.0% Base Sale ($0.05 min fee)",
    accentClass: "text-amber-300 bg-amber-500/15 border-amber-500/35",
    borderClass: "border-amber-500/30",
  },
  {
    id: "CLAIMED_OWNER",
    badge: "CLAIMED_OWNER",
    title: "Collector Verified · Zero Crypto Wallet Friction",
    subtitle:
      "Collector tapped their phone to claim ownership via Apple/Google pass or email custody. Provenance passport is permanently bound to the physical piece.",
    ownerLabel: "REGISTERED COLLECTOR",
    ownerValue: "@elena_collects · Verified Pass",
    chipModel: "NTAG213 / NTAG424 DNA · SUN-CMAC Verified",
    cmacHash: "CMAC: 9E21C408A7F3B509",
    tapCount: 2,
    royaltyReadout: "7.5% EIP-2981 Creator Royalty Locked",
    creatorPayout: "+$73.50 Net Studio Payout",
    accentClass: "text-cyan-300 bg-cyan-500/15 border-cyan-500/35",
    borderClass: "border-cyan-500/35",
  },
  {
    id: "SECONDARY_RESALE_ROYALTY",
    badge: "SECONDARY_RESALE_ROYALTY",
    title: "Resold 14 Months Later · Automated Creator Royalty",
    subtitle:
      "Piece traded hands between collectors for $180.00. The next NFC tap transfers the living passport and routes your 5%–10% creator royalty automatically.",
    ownerLabel: "NEW VERIFIED OWNER",
    ownerValue: "@marcus_v · Secondary Trade #02",
    chipModel: "NTAG424 DNA · Monotonic Tap Counter #19",
    cmacHash: "CMAC: D309F184C6E277A1",
    tapCount: 19,
    royaltyReadout: "5%–10% Automated EIP-2981 Split Disbursed",
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
      {/* Ambient glow behind phone frame */}
      <div className="pointer-events-none absolute -inset-3 rounded-[2.5rem] bg-gradient-to-b from-[#CC5500]/20 via-cyan-500/10 to-transparent blur-2xl" />

      {/* Tactile Phone Frame */}
      <div
        className={cn(
          "relative rounded-[2.25rem] bg-[#141414] border-2 p-4 sm:p-5 shadow-2xl transition-colors duration-300",
          current.borderClass,
        )}
      >
        {/* Top Speaker Notch & NFC Sensor Indicator */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#22D3EE] animate-pulse" />
            <span className="font-mono text-[10px] text-white/60 uppercase tracking-widest">
              LIVING PASSPORT SIMULATOR
            </span>
          </div>
          <span className="font-mono text-xs font-bold text-[#22D3EE] px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/25">
            #014 / 114
          </span>
        </div>

        {/* State Pill Selector Row */}
        <div className="grid grid-cols-3 gap-1.5 mb-4 p-1 rounded-xl bg-black/50 border border-white/10">
          {SIM_STATES.map((item, idx) => {
            const active = idx === stateIndex;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setStateIndex(idx)}
                className={cn(
                  "px-2 py-1.5 rounded-lg font-mono text-[9px] font-semibold truncate transition-all cursor-pointer",
                  active
                    ? "bg-[#CC5500] text-white shadow-[0_0_12px_rgba(204,85,0,0.4)]"
                    : "text-white/40 hover:text-white/75",
                )}
              >
                {item.id}
              </button>
            );
          })}
        </div>

        {/* Dynamic Passport Screen */}
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 p-4 space-y-4"
          >
            {/* Status & Serial Header */}
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
                TAP #{String(current.tapCount).padStart(3, "0")}
              </span>
            </div>

            {/* Piece Title & Provenance Narrative */}
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-orange-400 uppercase tracking-wider">
                  LIMITED STUDIO EDITION · #014 / 114
                </span>
                <ShieldCheck className="w-4 h-4 text-[#22D3EE]" />
              </div>
              <h3 className="text-base font-bold text-[#F9F9F9] mt-1">
                {current.title}
              </h3>
              <p className="text-xs text-white/65 mt-1 leading-relaxed">
                {current.subtitle}
              </p>
            </div>

            {/* Live NTAG213 / NTAG424 Hardware Telemetry Box */}
            <div className="rounded-xl bg-black/55 border border-white/10 p-3 space-y-2 font-mono text-[11px]">
              <div className="flex items-center justify-between text-white/45 text-[10px]">
                <span className="flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-[#22D3EE]" />
                  HARDWARE TELEMETRY
                </span>
                <span className="text-[#22D3EE]">NTAG213 / NTAG424</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/40">CHIP SPEC</span>
                <span className="text-[#F9F9F9] truncate max-w-[200px]">
                  {current.chipModel}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/40">DYNAMIC SIG</span>
                <span className="text-[#22D3EE]">{current.cmacHash}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/40">{current.ownerLabel}</span>
                <span className="text-white/90 font-semibold">{current.ownerValue}</span>
              </div>
            </div>

            {/* EIP-2981 Royalty & Creator Split Footer */}
            <div className="rounded-xl bg-[#CC5500]/10 border border-[#CC5500]/30 p-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="font-mono text-[10px] text-orange-300 uppercase block">
                  {current.royaltyReadout}
                </span>
                <span className="font-mono text-xs font-bold text-[#F9F9F9]">
                  {current.creatorPayout}
                </span>
              </div>
              <div className="px-2.5 py-1 rounded-lg bg-black/40 border border-white/10 font-mono text-[10px] text-emerald-300 flex items-center gap-1 flex-shrink-0">
                <Wallet className="w-3 h-3" />
                No Seed Phrase
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Tactile "Simulate NFC Tap" CTA Button */}
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
          <p className="text-center font-mono text-[10px] text-white/40">
            Click to cycle: UNCLAIMED_STUDIO → CLAIMED_OWNER → SECONDARY_RESALE_ROYALTY
          </p>
        </div>
      </div>
    </div>
  );
}
