// app/(shop)/get-bent/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  Clock,
  Flame,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { CountdownTimer } from "@/components/ui/CountdownTimer";
import { ShirtPreviewCard } from "@/components/shop/get-bent/ShirtPreviewCard";
import { DualTrackCheckoutPanel } from "@/components/shop/get-bent/DualTrackCheckoutPanel";
import { UpcomingDropsRail } from "@/components/shop/UpcomingDropsRail";
import { DropShareBar } from "@/components/shop/DropShareBar";

// Friday, Nov 27, 2026 at 11:59 PM EST
const BLACK_FRIDAY_CUTOFF_MS = new Date("2026-11-27T23:59:00-05:00").getTime();

export default function GetBentFlagshipDropPage() {
  const [totalMinted, setTotalMinted] = useState<number>(114);
  const [topBidDollars, setTopBidDollars] = useState<number>(69);

  return (
    <main className="min-h-screen bg-[#1A1A1A] text-[#F9F9F9] selection:bg-[#CC5500]/40 selection:text-white">
      {/* Top Bar */}
      <nav className="sticky top-0 z-40 border-b border-white/10 bg-[#1A1A1A]/85 backdrop-blur-xl px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Link
              href="/"
              className="font-mono text-xs sm:text-sm font-bold tracking-widest text-orange-400 hover:text-orange-300 transition-colors flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-[#CC5500] animate-pulse" />
              <span>MAKERVERSE</span>
            </Link>
            <span className="text-white/25">/</span>
            <span className="font-mono text-xs text-[#F9F9F9] font-semibold">
              @get-bent
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/#apply"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 font-mono text-xs text-white/80 transition-colors"
            >
              <span>Launch Your Shop</span>
            </Link>
            <Link
              href="/vendor"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#CC5500]/15 hover:bg-[#CC5500]/25 border border-[#CC5500]/40 font-mono text-xs text-orange-200 transition-colors"
            >
              <ExternalLink className="w-3 h-3 text-[#CC5500]" />
              <span>Vendor Portal</span>
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-10 space-y-10">
        {/* 1. Brand & 24hr Urgency Header */}
        <header className="bg-white/5 backdrop-blur-md border border-white/10 shadow-2xl rounded-xl p-6 sm:p-8 space-y-6 relative overflow-hidden">
          <div className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 rounded-full bg-[#CC5500]/15 blur-3xl" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-[#F9F9F9]">
                  GET BENT CLOTHING
                </h1>
                <span className="font-mono text-xs sm:text-sm text-[#22D3EE] font-semibold">
                  (@get-bent)
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#CC5500]/20 border border-[#CC5500]/50 font-mono text-[11px] font-bold text-orange-300">
                  <BadgeCheck className="w-3.5 h-3.5 text-[#CC5500]" />
                  VERIFIED FOUNDER STORE
                </span>
              </div>

              <p className="text-sm text-white/70 max-w-2xl leading-relaxed">
                Batch 001: The 24-Hour Black Friday Drop. Pure heavyweight typography paired with woven NTAG213 provenance and our uncapped #069/N soft-close auction + sequential hopper engine.
              </p>
            </div>

            {/* Live 24-Hour Monospaced Countdown Timer */}
            <div className="rounded-xl bg-black/60 border border-white/15 px-5 py-4 flex flex-col items-start lg:items-end justify-center flex-shrink-0">
              <div className="flex items-center gap-1.5 font-mono text-[10px] text-orange-300 uppercase tracking-widest">
                <Clock className="w-3.5 h-3.5 text-[#CC5500]" />
                <span>CLOSES FRI, NOV 27, 2026 · 11:59 PM EST</span>
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-mono text-xs text-white/45">24HR WINDOW:</span>
                <CountdownTimer
                  expiresAt={BLACK_FRIDAY_CUTOFF_MS}
                  className="text-xl sm:text-2xl font-bold text-[#22D3EE]"
                />
              </div>
            </div>
          </div>

          {/* Live Uncapped Edition Counter & Anti-Discount Readout Strip */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pt-4 border-t border-white/10 font-mono text-xs">
            <div className="p-3.5 rounded-xl bg-black/50 border border-[#22D3EE]/30 flex items-center justify-between gap-2">
              <span className="text-[#F9F9F9] font-bold">
                BLACK FRIDAY BOYCOTT POOL: {totalMinted} SHIRTS MINTED SO FAR — NEVER REPRINTED
              </span>
              <span className="px-2 py-0.5 rounded bg-cyan-500/15 text-[#22D3EE] text-[10px] font-bold whitespace-nowrap">
                N = {totalMinted}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#CC5500]/15 border border-[#CC5500]/40 flex items-center justify-between gap-2">
              <span className="text-orange-200 font-bold">
                BLACK FRIDAY DEAL: $25.00 | FAKE MARKDOWN: $0.00 (0% BS)
              </span>
              <Flame className="w-4 h-4 text-[#CC5500] flex-shrink-0" />
            </div>
          </div>
        </header>

        {/* 2. Shirt Preview Card + 3. Interactive Dual-Track Checkout & #69 Auction Panel */}
        <section id="catalog" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-6">
            <ShirtPreviewCard
              totalMinted={totalMinted}
              topBidDollars={topBidDollars}
            />
          </div>

          <div className="lg:col-span-6">
            <DualTrackCheckoutPanel
              totalMinted={totalMinted}
              onIncrementMinted={() => setTotalMinted((n) => n + 1)}
              topBidDollars={topBidDollars}
              onUpdateTopBid={(bid) => setTopBidDollars(bid)}
            />
          </div>
        </section>

        {/* Rally Share Bar */}
        <DropShareBar
          brandName="Get Bent Clothing"
          brandHandle="get-bent"
          batchLabel="Batch 001"
          mintedCount={totalMinted}
          topBidDollars={topBidDollars}
          sharePath="/get-bent"
        />

        {/* Upcoming Scheduled Drops Teaser Rail */}
        <UpcomingDropsRail brandHandle="get-bent" />

        {/* 4. Maker Conversion Banner (Bottom of Page) */}
        <section className="bg-white/5 backdrop-blur-md border border-[#CC5500]/50 shadow-2xl rounded-xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 font-mono text-[10px] text-orange-300 uppercase tracking-widest">
              <ShieldCheck className="w-3.5 h-3.5 text-[#CC5500]" />
              <span>CREATOR-FIRST PHYGITAL INFRASTRUCTURE</span>
            </div>
            <p className="text-base sm:text-lg font-bold text-[#F9F9F9]">
              Artists &amp; Makers: Tired of competing with big-box Black Friday algorithms? Keep 98% of base sales + 80% of auction surplus on Makerverse →
            </p>
          </div>

          <Link
            href="/#apply"
            className="px-5 py-3 rounded-xl bg-[#CC5500] hover:bg-[#e0621a] text-[#F9F9F9] font-mono text-xs sm:text-sm font-bold uppercase tracking-wider shadow-[0_0_24px_rgba(204,85,0,0.4)] transition-all flex items-center gap-2 whitespace-nowrap"
          >
            <span>Claim Founding Shop</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </section>
      </div>
    </main>
  );
}
