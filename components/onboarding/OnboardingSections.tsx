// components/onboarding/OnboardingSections.tsx
"use client";

import { useState } from "react";
import {
  Cpu,
  Flame,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  Calculator,
  Sparkles,
  QrCode,
  Nfc,
  Lock,
} from "lucide-react";

export function ArchitectureGridSection() {
  return (
    <section id="how-it-works" className="scroll-mt-24 space-y-8">
      <div className="max-w-3xl space-y-2">
        <span className="font-mono text-xs text-[#22D3EE] uppercase tracking-widest">
          HOW MAKERVERSE WORKS · ZERO WALLET FRICTION
        </span>
        <h2 className="text-2xl sm:text-3xl font-bold text-[#F9F9F9] tracking-tight">
          Built for Real Booths, Timed Drops, and Lasting Collector Proof
        </h2>
        <p className="text-sm text-white/65 leading-relaxed">
          Match an authentication tag to every price point, run fair timed drops without scalpers, and turn physical work into a direct channel back to your studio.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Tap-to-Verify Tags */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 shadow-2xl rounded-xl p-6 flex flex-col justify-between space-y-5 hover:border-[#22D3EE]/40 transition-colors">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center">
                <Cpu className="w-5 h-5 text-[#22D3EE]" />
              </div>
              <span className="font-mono text-[10px] px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-[#22D3EE]">
                AUTHENTICATION
              </span>
            </div>

            <h3 className="text-lg font-bold text-[#F9F9F9]">
              Tap-to-Verify Tags
            </h3>
            <p className="text-xs text-white/65 leading-relaxed">
              Match authentication cost to your piece—from $5 sticker packs up to $2,500 gallery originals:
            </p>

            <div className="space-y-2.5 font-mono text-xs">
              <div className="p-2.5 rounded-lg bg-black/40 border border-white/8 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-white/90">Serialized QR</span>
                </div>
                <span className="text-emerald-300 font-bold">&lt;$0.01 · Prints / Stickers</span>
              </div>

              <div className="p-2.5 rounded-lg bg-black/40 border border-white/8 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Nfc className="w-3.5 h-3.5 text-[#22D3EE]" />
                  <span className="text-white/90">Standard NFC</span>
                </div>
                <span className="text-[#22D3EE] font-bold">$0.13 · Apparel / Merch</span>
              </div>

              <div className="p-2.5 rounded-lg bg-black/40 border border-white/8 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-orange-400" />
                  <span className="text-white/90">Encrypted DNA</span>
                </div>
                <span className="text-orange-300 font-bold">$0.80 · Fine Art Originals</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-white/10 font-mono text-[11px] text-white/45">
            Shielded tags available for copper, steel, brass, and wood.
          </div>
        </div>

        {/* Card 2: Numbered Drops & Fair Serials */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 shadow-2xl rounded-xl p-6 flex flex-col justify-between space-y-5 hover:border-[#CC5500]/50 transition-colors">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-[#CC5500]/20 border border-[#CC5500]/40 flex items-center justify-center">
                <Flame className="w-5 h-5 text-[#CC5500]" />
              </div>
              <span className="font-mono text-[10px] px-2.5 py-0.5 rounded-full bg-[#CC5500]/15 border border-[#CC5500]/35 text-orange-300">
                TIMED DROPS
              </span>
            </div>

            <h3 className="text-lg font-bold text-[#F9F9F9]">
              Timed Drops &amp; Custom Serials
            </h3>
            <p className="text-xs text-white/65 leading-relaxed">
              Superfans can pay <strong className="text-white font-mono">+$5</strong> to claim favorite numbers (<span className="font-mono text-[#22D3EE]">#007</span>, <span className="font-mono text-[#22D3EE]">#042</span>) or bid on special editions, while standard buyers get the next sequential edition automatically.
            </p>

            <div className="rounded-xl bg-black/50 border border-white/10 p-3.5 space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="text-white/50">Serial #007</span>
                <span className="text-[#22D3EE]">+$5 Vanity Claim</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/50">Serial #042</span>
                <span className="text-[#22D3EE]">+$5 Vanity Claim</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/50">Edition #069</span>
                <span className="text-orange-400 font-bold">Anti-Snipe Auction (+2m)</span>
              </div>
              <div className="flex items-center justify-between border-t border-white/10 pt-2">
                <span className="text-white/50">Outbid Buyers</span>
                <span className="text-emerald-400">Auto-Convert to Next Serial</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-white/10 font-mono text-[11px] text-white/45">
            No lost orders: outbid collectors still receive a numbered edition at list price.
          </div>
        </div>

        {/* Card 3: Direct Collector Updates */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 shadow-2xl rounded-xl p-6 flex flex-col justify-between space-y-5 hover:border-[#22D3EE]/40 transition-colors">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-emerald-400" />
              </div>
              <span className="font-mono text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300">
                DIRECT REACH
              </span>
            </div>

            <h3 className="text-lg font-bold text-[#F9F9F9]">
              Direct Collector Updates &amp; Booth Pins
            </h3>
            <p className="text-xs text-white/65 leading-relaxed">
              Collectors follow your specific art lines directly—not algorithmic feeds—and scan tagged photos from booths or living rooms to shop.
            </p>

            <div className="rounded-xl bg-black/50 border border-white/10 p-3.5 space-y-2.5 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="text-white/50">Drop Alerts</span>
                <span className="text-emerald-300">100% Reach · No Algorithm</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/50">Shoppable Photos</span>
                <span className="text-[#22D3EE]">Booth &amp; Gallery Pins</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/50">Restock Demand</span>
                <span className="text-orange-300">Verified Collector Queue</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-white/10 font-mono text-[11px] text-white/45">
            Every physical scan connects buyers directly to your next drop.
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
    <section id="pricing" className="scroll-mt-24 space-y-8">
      <div className="max-w-3xl space-y-2">
        <span className="font-mono text-xs text-orange-400 uppercase tracking-widest">
          TRANSPARENT PRICING · CREATOR-FIRST ECONOMICS
        </span>
        <h2 className="text-2xl sm:text-3xl font-bold text-[#F9F9F9] tracking-tight">
          Keep 98% of Base Sales + 80% of Auction &amp; Serial Upside
        </h2>
        <p className="text-sm text-white/65 leading-relaxed">
          No monthly subscriptions or listing fees. Base list prices stay at a 2% flat fee ($0.05 minimum), and we only earn more when auctions or vanity serials bring in extra upside above your list price.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Fee Breakdown */}
        <div className="lg:col-span-7 bg-white/5 backdrop-blur-md border border-white/10 shadow-2xl rounded-xl p-6 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-2 border-b border-white/10 pb-4">
            <div>
              <h3 className="text-base font-bold text-[#F9F9F9]">
                Makerverse vs. Traditional Marketplaces
              </h3>
              <p className="font-mono text-xs text-white/45 mt-0.5">
                Locked creator rates for Founding Cohort Wave 1
              </p>
            </div>
            <span className="font-mono text-xs font-bold px-3 py-1 rounded-full bg-[#CC5500]/20 border border-[#CC5500]/45 text-orange-300">
              3× LOWER BASE FEE
            </span>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-black/45 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="font-mono text-sm font-bold text-[#F9F9F9]">
                    $0 / month Storefront &amp; Drop Hosting
                  </span>
                </div>
                <p className="text-xs text-white/60 pl-6">
                  Zero listing fees, zero monthly subscription, unlimited batch drops.
                </p>
              </div>
              <div className="font-mono text-xs text-right pl-6 sm:pl-0 flex-shrink-0">
                <span className="text-[#22D3EE] font-bold block">Makerverse: $0.00</span>
                <span className="text-white/35 line-through">Etsy/Shopify: $0.20/item – $39/mo</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-black/45 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#22D3EE] flex-shrink-0" />
                  <span className="font-mono text-sm font-bold text-[#F9F9F9]">
                    2% Base Platform Fee ($0.05 minimum)
                  </span>
                </div>
                <p className="text-xs text-white/60 pl-6">
                  On standard list-price sales—more than 3× lower than Etsy&apos;s 6.5% + $0.20 take.
                </p>
              </div>
              <div className="font-mono text-xs text-right pl-6 sm:pl-0 flex-shrink-0">
                <span className="text-[#22D3EE] font-bold block">2.0% ($0.05 min)</span>
                <span className="text-red-400/70">Etsy: 6.5% + $0.20 + Ads</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#CC5500]/10 border border-[#CC5500]/35 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#CC5500] flex-shrink-0" />
                  <span className="font-mono text-sm font-bold text-[#F9F9F9]">
                    80 / 20 Auction &amp; Vanity Surplus Split
                  </span>
                </div>
                <p className="text-xs text-white/70 pl-6">
                  On extra upside above list price from custom serials (+$5) or auctions, <strong className="text-white">80% goes to you</strong> and <strong className="text-orange-300">20% funds Makerverse</strong>.
                </p>
              </div>
              <div className="font-mono text-xs text-right pl-6 sm:pl-0 flex-shrink-0">
                <span className="text-orange-300 font-bold block">80% Creator / 20% Platform</span>
                <span className="text-white/45">On Surplus Above List Only</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-black/45 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="font-mono text-sm font-bold text-[#F9F9F9]">
                    5%–10% Automated Secondary Royalties
                  </span>
                </div>
                <p className="text-xs text-white/60 pl-6">
                  Automatic creator royalties whenever collectors resell verified pieces later.
                </p>
              </div>
              <div className="font-mono text-xs text-right pl-6 sm:pl-0 flex-shrink-0">
                <span className="text-emerald-400 font-bold block">5%–10% Per Resale</span>
                <span className="text-white/35">Traditional Marketplaces: 0%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Payout Simulator */}
        <div className="lg:col-span-5 bg-white/5 backdrop-blur-md border border-white/10 shadow-2xl rounded-xl p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-[#22D3EE]" />
                <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#F9F9F9]">
                  Creator Payout Calculator
                </h3>
              </div>
              <span className="font-mono text-[10px] text-[#22D3EE]">2% BASE · 80/20 SURPLUS</span>
            </div>

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
                    SERIAL (+$5) OR AUCTION BONUS
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

            <div className="rounded-xl bg-black/60 border border-white/10 p-4 space-y-2.5 font-mono text-xs">
              <div className="flex justify-between text-white/65">
                <span>Base Sale Kept (98%):</span>
                <span className="text-[#F9F9F9] font-semibold">${creatorBaseKeep.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-white/45">
                <span>Base 2% Platform Fee ($0.05 min):</span>
                <span>${basePlatformFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#22D3EE]">
                <span>Your 80% Bonus Share:</span>
                <span className="font-bold">+${creatorSurplusKeep.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-white/45">
                <span>Platform 20% Bonus Share:</span>
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
            <span>On a ${(basePrice + surplusAmount).toFixed(2)} order, Etsy charges ${etsyEquivalentFee.toFixed(2)}</span>
            <span className="font-bold">Protected Upside</span>
          </div>
        </div>
      </div>
    </section>
  );
}
