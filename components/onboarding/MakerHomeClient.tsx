// components/onboarding/MakerHomeClient.tsx
"use client";

import Link from "next/link";
import { ShieldCheck, Sparkles, Flame, Store } from "lucide-react";
import { NfcPassportSimulator } from "@/components/onboarding/NfcPassportSimulator";
import { LiveDropsShowcase } from "@/components/onboarding/LiveDropsShowcase";
import {
  ArchitectureGridSection,
  CreatorEconomicsSection,
} from "@/components/onboarding/OnboardingSections";
import { FoundingApplicationForm } from "@/components/onboarding/FoundingApplicationForm";

export function MakerHomeClient() {
  return (
    <main className="min-h-screen bg-[#1A1A1A] text-[#F9F9F9] selection:bg-[#CC5500]/40 selection:text-white">
      {/* Top Navigation */}
      <nav className="sticky top-0 z-40 border-b border-white/10 bg-[#1A1A1A]/85 backdrop-blur-xl px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="font-mono text-sm sm:text-base font-bold tracking-widest text-[#F9F9F9] flex items-center gap-2"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-[#CC5500] shadow-[0_0_10px_#CC5500]" />
              <span>MAKERVERSE</span>
            </Link>

            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#CC5500]/15 border border-[#CC5500]/35 font-mono text-[10px] font-semibold text-orange-300">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22D3EE] animate-pulse" />
              FOUNDING COHORT · WAVE 1
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href="#drops"
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono text-white/70 hover:text-white hover:bg-white/5 transition-colors"
            >
              <Flame className="w-3.5 h-3.5 text-[#CC5500]" />
              <span>Live Drops</span>
            </a>

            <a
              href="#pricing"
              className="hidden md:inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-mono text-white/70 hover:text-white hover:bg-white/5 transition-colors"
            >
              Pricing
            </a>

            <Link
              href="/vendor"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 font-mono text-xs text-white/80 transition-colors"
            >
              <Store className="w-3.5 h-3.5 text-[#22D3EE]" />
              <span>Vendor Studio</span>
            </Link>

            <a
              href="#apply"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#CC5500] hover:bg-[#e0621a] font-mono text-xs font-bold text-white shadow-[0_0_16px_rgba(204,85,0,0.35)] transition-colors"
            >
              <span>Claim a Shop</span>
            </a>
          </div>
        </div>
      </nav>

      {/* Main Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-12 sm:py-16 space-y-20">
        {/* Hero + Plain-Language Passport Preview */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 font-mono text-xs text-[#22D3EE]">
              <Sparkles className="w-3.5 h-3.5 text-[#CC5500]" />
              <span>PHYSICAL ART &amp; MERCH · TAP-TO-VERIFY PASSPORTS</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-[#F9F9F9] leading-[1.12]">
              Your Art Doesn&apos;t End at the Booth. Give Every Piece a Living Passport.
            </h1>

            <p className="text-base sm:text-lg text-white/75 leading-relaxed max-w-2xl">
              Run timed 24-hour drops, sell in-person at your booth, and give every piece a tap-to-verify digital passport—without forcing buyers to set up a crypto wallet.
            </p>

            {/* Primary & Secondary CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-2">
              <a
                href="#apply"
                className="px-6 py-3.5 rounded-xl bg-[#CC5500] hover:bg-[#e0621a] text-[#F9F9F9] font-mono text-xs sm:text-sm font-bold uppercase tracking-wider shadow-[0_0_24px_rgba(204,85,0,0.4)] transition-all text-center"
              >
                Claim a Founding Maker Shop
              </a>

              <Link
                href="/get-bent"
                className="px-6 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/15 text-[#F9F9F9] font-mono text-xs sm:text-sm font-semibold transition-all text-center"
              >
                Explore Live Drop (/get-bent) →
              </Link>
            </div>

            {/* Plain-Language Pricing Summary */}
            <div className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl font-mono text-xs">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <span className="text-[#22D3EE] font-bold text-sm sm:text-base block">
                  2% Base Fee
                </span>
                <span className="text-white/50 text-[11px]">$0.05 min · $0/mo</span>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <span className="text-orange-300 font-bold text-sm sm:text-base block">
                  80 / 20 Split
                </span>
                <span className="text-white/50 text-[11px]">Auction &amp; Serial Bonus</span>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <span className="text-emerald-300 font-bold text-sm sm:text-base block">
                  5%–10% Resale
                </span>
                <span className="text-white/50 text-[11px]">Automatic Creator Royalty</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <NfcPassportSimulator />
          </div>
        </section>

        {/* Live & Upcoming Drops Showcase */}
        <LiveDropsShowcase />

        {/* 3-Card How It Works Grid */}
        <ArchitectureGridSection />

        {/* Creator-First Economics & Payout Calculator */}
        <CreatorEconomicsSection />

        {/* Founding Cohort Application Form */}
        <FoundingApplicationForm />

        {/* Footer */}
        <footer className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs text-white/45">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#CC5500]" />
            <span className="text-white/75 font-bold">MAKERVERSE</span>
            <span>·</span>
            <span>Creator-First Physical Proof &amp; Timed Drops</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/get-bent" className="hover:text-[#22D3EE] transition-colors">
              /get-bent Flagship Drop
            </Link>
            <Link href="/vendor" className="hover:text-orange-300 transition-colors">
              /vendor Studio Admin
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
