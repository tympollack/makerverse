// components/shop/get-bent/ShirtPreviewCard.tsx
"use client";

import { useState } from "react";
import { Nfc, ShieldCheck, Flame, RotateCw, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface ShirtPreviewCardProps {
  totalMinted: number;
  topBidDollars: number;
}

export function ShirtPreviewCard({
  totalMinted,
  topBidDollars,
}: ShirtPreviewCardProps) {
  const [side, setSide] = useState<"BACK" | "FRONT">("BACK");

  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 shadow-2xl rounded-xl p-5 sm:p-6 space-y-5">
      {/* Card Header & Front/Back Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <span className="font-mono text-[10px] text-[#22D3EE] uppercase tracking-widest block">
            PURE-TYPOGRAPHY HEAVYWEIGHT GARMENT SPEC
          </span>
          <h2 className="text-lg sm:text-xl font-bold text-[#F9F9F9]">
            Batch 001 — The Black Friday Opt-Out Tee
          </h2>
        </div>

        <div
          role="group"
          aria-label="Garment side toggle"
          className="inline-flex rounded-xl bg-black/60 border border-white/15 p-1 gap-1 self-start"
        >
          <button
            type="button"
            onClick={() => setSide("FRONT")}
            className={cn(
              "px-3 py-1.5 rounded-lg font-mono text-xs font-semibold transition-all cursor-pointer",
              side === "FRONT"
                ? "bg-[#CC5500] text-[#F9F9F9] shadow-[0_0_12px_rgba(204,85,0,0.4)]"
                : "text-white/50 hover:text-white",
            )}
          >
            Front View
          </button>
          <button
            type="button"
            onClick={() => setSide("BACK")}
            className={cn(
              "px-3 py-1.5 rounded-lg font-mono text-xs font-semibold transition-all cursor-pointer",
              side === "BACK"
                ? "bg-[#CC5500] text-[#F9F9F9] shadow-[0_0_12px_rgba(204,85,0,0.4)]"
                : "text-white/50 hover:text-white",
            )}
          >
            Back View
          </button>
        </div>
      </div>

      {/* Pure-Typography Garment Canvas (#1A1A1A Heavyweight Tee Silhouette) */}
      <div className="relative rounded-2xl bg-[#111111] border border-white/10 p-6 sm:p-8 min-h-[410px] flex flex-col items-center justify-between overflow-hidden">
        {/* Subtle technical grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        {/* Top Bar inside Canvas: Serial Passport + #69 Auction Status Callout */}
        <div className="relative z-10 w-full flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono text-[11px] px-2.5 py-1 rounded-md bg-black/70 border border-white/15 text-white/75">
            COLLAR PASSPORT: <strong className="text-[#22D3EE]">#XX / {totalMinted}</strong>
          </span>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#CC5500]/20 border border-[#CC5500]/50 font-mono text-[11px] font-bold text-orange-300 shadow-[0_0_16px_rgba(204,85,0,0.25)]">
            <Flame className="w-3.5 h-3.5 text-[#CC5500]" />
            <span>#069 / N — AUCTION EDITION</span>
            <span className="text-[#22D3EE]">(${topBidDollars.toFixed(2)})</span>
          </div>
        </div>

        {/* Heavyweight Charcoal #1A1A1A Tee Frame */}
        <div className="relative z-10 my-4 w-full max-w-md rounded-2xl bg-[#1A1A1A] border-2 border-white/15 shadow-[0_25px_60px_rgba(0,0,0,0.85)] px-6 py-10 sm:px-8 sm:py-12 flex flex-col justify-between min-h-[260px]">
          {/* Ribbed Collar Detail */}
          <div className="mx-auto -mt-6 mb-4 px-4 py-1 rounded-b-xl bg-[#141414] border-x border-b border-white/15 font-mono text-[9px] text-white/40 uppercase tracking-widest">
            GET BENT · 280GSM COMBED RING-SPUN · #XX / N
          </div>

          {side === "FRONT" ? (
            /* Front Left Chest Stamp (JetBrains Mono) */
            <div className="flex-1 flex flex-col justify-center">
              <div className="ml-auto mr-4 sm:mr-6 p-3.5 rounded-lg border border-white/15 bg-black/35 text-left max-w-[210px]">
                <span className="font-mono text-[9px] text-white/40 uppercase tracking-widest block mb-1">
                  LEFT CHEST STAMP
                </span>
                <p className="font-mono text-sm sm:text-base font-bold tracking-wider text-[#F9F9F9]">
                  GET BENT // BF-2026
                </p>
                <span className="font-mono text-[10px] text-[#22D3EE] block mt-1">
                  BATCH 001 · SERIAL #XX/{totalMinted}
                </span>
              </div>
            </div>
          ) : (
            /* Back Full Print (Inter Bold / Off-White #F9F9F9 with Burnt Orange #CC5500 highlight) */
            <div className="flex-1 flex flex-col items-center justify-center text-center px-2">
              <span className="font-mono text-[9px] text-white/35 uppercase tracking-widest mb-2">
                FULL BACK PLASTISOL TYPOGRAPHY PRINT
              </span>
              <p className="font-sans text-xl sm:text-2xl font-extrabold tracking-tight leading-snug text-[#F9F9F9] uppercase max-w-sm">
                &ldquo;I BOUGHT THIS SHIRT{" "}
                <span className="text-[#CC5500] underline decoration-[#CC5500]/60 underline-offset-4">
                  INSTEAD OF SHOPPING
                </span>{" "}
                ON BLACK FRIDAY.&rdquo;
              </p>
              <span className="font-mono text-[10px] text-white/45 mt-3 tracking-widest">
                GET BENT // BF-2026 · EDITION #XX / {totalMinted}
              </span>
            </div>
          )}

          {/* Woven Hem NTAG213 Tag Indicator */}
          <div className="mt-6 pt-3 border-t border-white/10 flex items-center justify-between font-mono text-[10px] text-white/50">
            <span className="flex items-center gap-1.5 text-[#22D3EE]">
              <Nfc className="w-3.5 h-3.5" />
              WOVEN HEM NTAG213 CHIP
            </span>
            <button
              type="button"
              onClick={() => setSide(side === "FRONT" ? "BACK" : "FRONT")}
              className="inline-flex items-center gap-1 text-orange-300 hover:text-orange-200 cursor-pointer"
            >
              <RotateCw className="w-3 h-3" />
              Flip to {side === "FRONT" ? "Back" : "Front"}
            </button>
          </div>
        </div>

        {/* Bottom Canvas Footnote */}
        <div className="relative z-10 w-full flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] text-white/50">
          <span>COLORWAY: DEEP CHARCOAL (#1A1A1A)</span>
          <span className="text-orange-300">
            EDITION CAP: UNCAPPED 24HR WINDOW (N = {totalMinted})
          </span>
        </div>
      </div>

      {/* Phygital Tag Spec Box */}
      <div className="rounded-xl bg-black/50 border border-white/10 p-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#22D3EE]" />
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#F9F9F9]">
              Phygital Tag Spec · NTAG213 + Inside-Collar Passport
            </span>
          </div>
          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/25 text-[#22D3EE]">
            13.56 MHz NFC
          </span>
        </div>

        <p className="text-xs text-white/70 leading-relaxed">
          Woven hem <span className="font-mono text-[#22D3EE]">NTAG213</span> chip + inside-collar serialized passport (<span className="font-mono text-[#F9F9F9]">#XX / N</span>) — permanently retired once the 24-hour clock hits zero.
        </p>

        <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-[10px]">
          <div className="p-2 rounded-lg bg-white/5 border border-white/8">
            <span className="text-white/40 block">HEM SILICON</span>
            <span className="text-[#22D3EE] font-semibold">NXP NTAG213</span>
          </div>
          <div className="p-2 rounded-lg bg-white/5 border border-white/8">
            <span className="text-white/40 block">COLLAR STAMP</span>
            <span className="text-[#F9F9F9] font-semibold">Serial #XX / {totalMinted}</span>
          </div>
          <div className="p-2 rounded-lg bg-white/5 border border-white/8">
            <span className="text-white/40 block">DIE-LOCK</span>
            <span className="text-orange-300 font-semibold flex items-center gap-1">
              <Lock className="w-2.5 h-2.5" /> Retired at 00:00
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
