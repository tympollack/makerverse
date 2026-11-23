// components/onboarding/OnboardingSections.tsx
"use client";

import { useState } from "react";
import {
  Cpu,
  Flame,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Calculator,
  Sparkles,
  QrCode,
  Nfc,
  Lock,
} from "lucide-react";

export function ArchitectureGridSection() {
  return (
    <section className="space-y-8">
      <div className="max-w-3xl space-y-2">
        <span className="font-mono text-xs text-[#22D3EE] uppercase tracking-widest">
          PHYGITAL INFRASTRUCTURE · ZERO CRYPTO FRICTION
        </span>
        <h2 className="text-2xl sm:text-3xl font-bold text-[#F9F9F9] tracking-tight">
          Built for Real-World Booths, Drop Windows, and Collector Provenance
        </h2>
        <p className="text-sm text-white/65 leading-relaxed">
          Match the right physical authentication tier to every price point, monetize collector hype without scalpers, and turn physical pieces into living social channels.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Tiered Hardware Validation */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 shadow-2xl rounded-xl p-6 flex flex-col justify-between space-y-5 hover:border-[#22D3EE]/40 transition-colors">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center">
                <Cpu className="w-5 h-5 text-[#22D3EE]" />
              </div>
              <span className="font-mono text-[10px] px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-[#22D3EE]">
                ANTI-COUNTERFEIT HARDWARE
              </span>
            </div>

            <h3 className="text-lg font-bold text-[#F9F9F9]">
              Tiered Hardware Validation
            </h3>
            <p className="text-xs text-white/65 leading-relaxed">
              Scale authentication costs precisely to your medium—from $5 vinyl sticker packs to $2,500 gallery originals:
            </p>

            <div className="space-y-2.5 font-mono text-xs">
              <div className="p-2.5 rounded-lg bg-black/40 border border-white/8 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-white/90">Serialized QR</span>
                </div>
                <span className="text-emerald-300 font-bold">&lt;$0.01 · Stickers / Prints</span>
              </div>

              <div className="p-2.5 rounded-lg bg-black/40 border border-white/8 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Nfc className="w-3.5 h-3.5 text-[#22D3EE]" />
                  <span className="text-white/90">NTAG213</span>
                </div>
                <span className="text-[#22D3EE] font-bold">$0.13 · Apparel / Merch</span>
              </div>

              <div className="p-2.5 rounded-lg bg-black/40 border border-white/8 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-orange-400" />
                  <span className="text-white/90">NTAG424 DNA</span>
                </div>
                <span className="text-orange-300 font-bold">$0.80 · AES-128 CMAC Fine Art</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-white/10 font-mono text-[11px] text-white/45">
            Ferrite-shielded options ready for copper, steel, brass & heavy wood.
          </div>
        </div>

        {/* Card 2: Vanity Serials & Soft-Close Auctions */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 shadow-2xl rounded-xl p-6 flex flex-col justify-between space-y-5 hover:border-[#CC5500]/50 transition-colors">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-[#CC5500]/20 border border-[#CC5500]/40 flex items-center justify-center">
                <Flame className="w-5 h-5 text-[#CC5500]" />
              </div>
              <span className="font-mono text-[10px] px-2.5 py-0.5 rounded-full bg-[#CC5500]/15 border border-[#CC5500]/35 text-orange-300">
                SEQUENTIAL HOPPER ENGINE
              </span>
            </div>

            <h3 className="text-lg font-bold text-[#F9F9F9]">
              Vanity Serials & Soft-Close Auctions
            </h3>
            <p className="text-xs text-white/65 leading-relaxed">
              Let superfans pay a flat <strong className="text-white font-mono">$5</strong> to lock vanity serials (<span className="font-mono text-[#22D3EE]">#007</span>, <span className="font-mono text-[#22D3EE]">#042</span>) or compete in live popcorn-bidding auctions (<span className="font-mono text-orange-300">+2m</span> anti-snipe extensions) while everyone else flows into the automatic sequential hopper.
            </p>

            <div className="rounded-xl bg-black/50 border border-white/10 p-3.5 space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="text-white/50">SERIAL #007 / N</span>
                <span className="text-[#22D3EE]">+$5.00 VANITY CLAIM</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/50">SERIAL #042 / N</span>
                <span className="text-[#22D3EE]">+$5.00 VANITY CLAIM</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/50">SERIAL #069 / N</span>
                <span className="text-orange-400 font-bold">SOFT-CLOSE (+2m ANTI-SNIPE)</span>
              </div>
              <div className="flex items-center justify-between border-t border-white/10 pt-2">
                <span className="text-white/50">RUNNER-UP BIDS</span>
                <span className="text-emerald-400">AUTO-CONVERT TO BASE HOPPER</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-white/10 font-mono text-[11px] text-white/45">
            Zero lost orders: every outbid collector still gets a sequential edition at base price.
          </div>
        </div>

        {/* Card 3: Object-Centric Following & Cozy Pins */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 shadow-2xl rounded-xl p-6 flex flex-col justify-between space-y-5 hover:border-[#22D3EE]/40 transition-colors">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-emerald-400" />
              </div>
              <span className="font-mono text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300">
                SPATIAL COMMERCE
              </span>
            </div>

            <h3 className="text-lg font-bold text-[#F9F9F9]">
              Object-Centric Following & Cozy Pins
            </h3>
            <p className="text-xs text-white/65 leading-relaxed">
              Buyers follow specific art lines and brands directly—not noisy social feeds—and tag real-world pieces via shoppable pins from festival booths, living rooms, and gallery walls.
            </p>

            <div className="rounded-xl bg-black/50 border border-white/10 p-3.5 space-y-2.5 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="text-white/50">DIRECT LINE ALERTS</span>
                <span className="text-emerald-300">100% Reach · 0 Algorithm Tax</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/50">SPATIAL COZY PINS</span>
                <span className="text-[#22D3EE]">Interactive Booth & Room Tags</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/50">RESTOCK SIGNALS</span>
                <span className="text-orange-300">Verified Collector Demand Queue</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-white/10 font-mono text-[11px] text-white/45">
            Every physical tap connects collectors straight back to your next batch drop.
          </div>
        </div>
      </div>
    </section>
  );
}

export function CreatorEconomicsSection() {
  const [basePrice, setBasePrice] = useState<number>(25);
  const [surplusAmount, setSurplusAmount] = useState<number>(20);

  const basePlatformFee = Math.max(0.05, Number((basePrice * 0.02).toFixed(2)));
  const creatorBaseKeep = Number((basePrice - basePlatformFee).toFixed(2));
  const creatorSurplusKeep = Number((surplusAmount * 0.8).toFixed(2));
  const platformSurplusCut = Number((surplusAmount * 0.2).toFixed(2));
  const totalCreatorTakeHome = Number((creatorBaseKeep + creatorSurplusKeep).toFixed(2));
  const etsyEquivalentFee = Number(((basePrice + surplusAmount) * 0.065 + 0.2).toFixed(2));

  return (
    <section className="space-y-8">
      <div className="max-w-3xl space-y-2">
        <span className="font-mono text-xs text-orange-400 uppercase tracking-widest">
          LOCKED FEE ARCHITECTURE · CREATOR-FIRST ECONOMICS
        </span>
        <h2 className="text-2xl sm:text-3xl font-bold text-[#F9F9F9] tracking-tight">
          Keep 98% of Base Sales + 80% of Auction & Vanity Surplus
        </h2>
        <p className="text-sm text-white/65 leading-relaxed">
          We never tax your livelihood with monthly subscriptions or listing fees. Base retail prices stay protected at a 2% flat platform fee ($0.05 minimum), and we only win when our auction & vanity engine generates extra upside above your list price.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Locked Fee Comparison Card vs Etsy/Traditional Marketplaces */}
        <div className="lg:col-span-7 bg-white/5 backdrop-blur-md border border-white/10 shadow-2xl rounded-xl p-6 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-2 border-b border-white/10 pb-4">
            <div>
              <h3 className="text-base font-bold text-[#F9F9F9]">
                Makerverse vs. Etsy & Traditional Marketplaces
              </h3>
              <p className="font-mono text-xs text-white/45 mt-0.5">
                Transparent creator economics locked for Founding Cohort Wave 1
              </p>
            </div>
            <span className="font-mono text-xs font-bold px-3 py-1 rounded-full bg-[#CC5500]/20 border border-[#CC5500]/45 text-orange-300">
              3× LOWER BASE FEE
            </span>
          </div>

          <div className="space-y-4">
            {/* Economic Pillar 1 */}
            <div className="p-4 rounded-xl bg-black/45 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="font-mono text-sm font-bold text-[#F9F9F9]">
                    $0 / month Storefront & Drop Hosting
                  </span>
                </div>
                <p className="text-xs text-white/60 pl-6">
                  Zero listing fees, zero monthly SaaS subscription, unlimited phygital batch drops.
                </p>
              </div>
              <div className="font-mono text-xs text-right pl-6 sm:pl-0 flex-shrink-0">
                <span className="text-[#22D3EE] font-bold block">Makerverse: $0.00</span>
                <span className="text-white/35 line-through">Etsy/Shopify: $0.20/item – $39/mo</span>
              </div>
            </div>

            {/* Economic Pillar 2 */}
            <div className="p-4 rounded-xl bg-black/45 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#22D3EE] flex-shrink-0" />
                  <span className="font-mono text-sm font-bold text-[#F9F9F9]">
                    2% Base Platform Fee ($0.05 minimum)
                  </span>
                </div>
                <p className="text-xs text-white/60 pl-6">
                  On standard list-price sales—more than 3× lower than Etsy&apos;s 6.5% + $0.20 transaction take.
                </p>
              </div>
              <div className="font-mono text-xs text-right pl-6 sm:pl-0 flex-shrink-0">
                <span className="text-[#22D3EE] font-bold block">2.0% ($0.05 min)</span>
                <span className="text-red-400/70">Etsy: 6.5% + $0.20 + Offsite Ads</span>
              </div>
            </div>

            {/* Economic Pillar 3 */}
            <div className="p-4 rounded-xl bg-[#CC5500]/10 border border-[#CC5500]/35 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#CC5500] flex-shrink-0" />
                  <span className="font-mono text-sm font-bold text-[#F9F9F9]">
                    80 / 20 Auction & Vanity Surplus Split
                  </span>
                </div>
                <p className="text-xs text-white/70 pl-6">
                  Base retail price stays 100% protected; on any surplus above list price generated by vanity claims (+$5) or soft-close popcorn auctions, <strong className="text-white">80% goes directly to the creator</strong> and <strong className="text-orange-300">20% funds the platform</strong>.
                </p>
              </div>
              <div className="font-mono text-xs text-right pl-6 sm:pl-0 flex-shrink-0">
                <span className="text-orange-300 font-bold block">80% Creator / 20% Platform</span>
                <span className="text-white/45">On Surplus Above List Only</span>
              </div>
            </div>

            {/* Economic Pillar 4 */}
            <div className="p-4 rounded-xl bg-black/45 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="font-mono text-sm font-bold text-[#F9F9F9]">
                    5%–10% Automated Secondary Royalties
                  </span>
                </div>
                <p className="text-xs text-white/60 pl-6">
                  EIP-2981 provenance ledger routes creator royalties back to your studio wallet whenever collectors trade verified pieces later.
                </p>
              </div>
              <div className="font-mono text-xs text-right pl-6 sm:pl-0 flex-shrink-0">
                <span className="text-emerald-400 font-bold block">5%–10% Per Resale</span>
                <span className="text-white/35">Traditional Marketplaces: 0%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Interactive Monospaced Payout Calculator */}
        <div className="lg:col-span-5 bg-white/5 backdrop-blur-md border border-white/10 shadow-2xl rounded-xl p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-[#22D3EE]" />
                <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#F9F9F9]">
                  LIVE CREATOR PAYOUT SIMULATOR
                </h3>
              </div>
              <span className="font-mono text-[10px] text-[#22D3EE]">2% BASE · 80/20 SURPLUS</span>
            </div>

            {/* Sliders */}
            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-1.5">
                <div className="flex justify-between">
                  <label htmlFor="calc-base-price" className="text-white/60">
                    BASE LIST PRICE
                  </label>
                  <span className="text-[#F9F9F9] font-bold">${basePrice.toFixed(2)}</span>
                </div>
                <input
                  id="calc-base-price"
                  type="range"
                  min={5}
                  max={200}
                  step={5}
                  value={basePrice}
                  onChange={(e) => setBasePrice(Number(e.target.value))}
                  className="w-full accent-[#CC5500] cursor-pointer"
                />
              </div>

              <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-1.5">
                <div className="flex justify-between">
                  <label htmlFor="calc-surplus" className="text-white/60">
                    VANITY (+$5) OR AUCTION SURPLUS
                  </label>
                  <span className="text-[#22D3EE] font-bold">+${surplusAmount.toFixed(2)}</span>
                </div>
                <input
                  id="calc-surplus"
                  type="range"
                  min={0}
                  max={150}
                  step={5}
                  value={surplusAmount}
                  onChange={(e) => setSurplusAmount(Number(e.target.value))}
                  className="w-full accent-[#22D3EE] cursor-pointer"
                />
              </div>
            </div>

            {/* Telemetry Ledger Output */}
            <div className="rounded-xl bg-black/60 border border-white/10 p-4 space-y-2.5 font-mono text-xs">
              <div className="flex justify-between text-white/65">
                <span>Base Retail Protected (98%):</span>
                <span className="text-[#F9F9F9] font-semibold">${creatorBaseKeep.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-white/45">
                <span>Base 2% Platform Fee ($0.05 min):</span>
                <span>${basePlatformFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#22D3EE]">
                <span>Creator 80% Surplus Share:</span>
                <span className="font-bold">+${creatorSurplusKeep.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-white/45">
                <span>Platform 20% Surplus Share:</span>
                <span>${platformSurplusCut.toFixed(2)}</span>
              </div>
              <div className="pt-2.5 border-t border-white/15 flex items-center justify-between text-sm">
                <span className="font-bold text-orange-300">NET CREATOR PAYOUT:</span>
                <span className="font-bold text-lg text-[#F9F9F9]">
                  ${totalCreatorTakeHome.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 font-mono text-[11px] text-emerald-300 flex items-center justify-between">
            <span>On a ${basePrice.toFixed(2)} base item, Etsy charges ${etsyEquivalentFee.toFixed(2)}</span>
            <span className="font-bold">Protected Upside</span>
          </div>
        </div>
      </div>
    </section>
  );
}
