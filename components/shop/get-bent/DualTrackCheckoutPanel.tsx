// components/shop/get-bent/DualTrackCheckoutPanel.tsx
"use client";

import { useState } from "react";
import {
  Flame,
  Clock,
  Sparkles,
  CheckCircle2,
  Hash,
  ShoppingBag,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type GarmentSize = "S" | "M" | "L" | "XL" | "XXL";

export interface SerialLedgerEntry {
  id: string;
  serialTag: string;
  modeTag: "LEADING BID" | "VANITY" | "HOPPER" | "FOUNDER";
  handle: string;
  size: GarmentSize;
  amountDollars: number;
  timestamp: string;
}

export interface VanityOption {
  serial: "#007" | "#013" | "#042" | "#420";
  number: number;
  available: boolean;
  claimedBy?: string;
}

const SIZES: GarmentSize[] = ["S", "M", "L", "XL", "XXL"];

const INITIAL_VANITY_OPTIONS: VanityOption[] = [
  { serial: "#007", number: 7, available: true },
  { serial: "#013", number: 13, available: true },
  { serial: "#042", number: 42, available: false, claimedBy: "@Vesper_PDX" },
  { serial: "#420", number: 420, available: true },
];

const INITIAL_LEDGER: SerialLedgerEntry[] = [
  {
    id: "led_69",
    serialTag: "#069/N [LEADING BID]",
    modeTag: "LEADING BID",
    handle: "@kilo_craft",
    size: "L",
    amountDollars: 69,
    timestamp: "2m ago",
  },
  {
    id: "led_114",
    serialTag: "#114/N [HOPPER]",
    modeTag: "HOPPER",
    handle: "@maren_v",
    size: "XL",
    amountDollars: 25,
    timestamp: "4m ago",
  },
  {
    id: "led_42",
    serialTag: "#042/N [VANITY]",
    modeTag: "VANITY",
    handle: "@Vesper_PDX",
    size: "M",
    amountDollars: 30,
    timestamp: "9m ago",
  },
  {
    id: "led_01",
    serialTag: "#001/N",
    modeTag: "FOUNDER",
    handle: "@get-bent",
    size: "L",
    amountDollars: 25,
    timestamp: "Batch Open",
  },
];

interface DualTrackCheckoutPanelProps {
  totalMinted: number;
  onIncrementMinted: () => void;
  topBidDollars: number;
  onUpdateTopBid: (newBid: number) => void;
}

export function DualTrackCheckoutPanel({
  totalMinted,
  onIncrementMinted,
  topBidDollars,
  onUpdateTopBid,
}: DualTrackCheckoutPanelProps) {
  const [selectedSize, setSelectedSize] = useState<GarmentSize>("L");
  const [proxyBidInput, setProxyBidInput] = useState<string>(
    String(topBidDollars + 5),
  );
  const [buyerHandle, setBuyerHandle] = useState<string>("@collector_anon");
  const [vanityOptions, setVanityOptions] = useState<VanityOption[]>(
    INITIAL_VANITY_OPTIONS,
  );
  const [selectedVanity, setSelectedVanity] = useState<
    VanityOption["serial"] | null
  >(null);
  const [ledger, setLedger] = useState<SerialLedgerEntry[]>(INITIAL_LEDGER);
  const [toastNotice, setToastNotice] = useState<string | null>(null);

  const parsedBid = Math.max(25, Number(proxyBidInput) || 25);
  const bidSurplus = Math.max(0, parsedBid - 25);
  const creatorSurplusShare = Number((bidSurplus * 0.8).toFixed(2));
  const creatorTotalFromAuction = Number((24.5 + creatorSurplusShare).toFixed(2));

  const handlePlaceBid = (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedBid <= topBidDollars) {
      setToastNotice(
        `Proxy bid must exceed current leading bid of $${topBidDollars.toFixed(2)} for #069 / N.`,
      );
      return;
    }

    const nextN = totalMinted + 1;
    onUpdateTopBid(parsedBid);
    onIncrementMinted();
    setProxyBidInput(String(parsedBid + 5));

    const newEntry: SerialLedgerEntry = {
      id: `led_${Date.now()}`,
      serialTag: "#069/N [LEADING BID]",
      modeTag: "LEADING BID",
      handle: buyerHandle.trim() || "@collector_anon",
      size: selectedSize,
      amountDollars: parsedBid,
      timestamp: "just now",
    };

    setLedger((prev) => [
      newEntry,
      ...prev.map((item) =>
        item.modeTag === "LEADING BID"
          ? {
              ...item,
              serialTag: `#${String(nextN).padStart(3, "0")}/N [HOPPER FALLBACK]`,
              modeTag: "HOPPER" as const,
              amountDollars: 25,
            }
          : item,
      ),
    ]);

    setToastNotice(
      `Leading proxy bid of $${parsedBid.toFixed(2)} locked for #069/${nextN} (Size ${selectedSize}). Previous leader auto-converted to sequential hopper at $25.00.`,
    );
  };

  const handleHopperOrVanityCheckout = () => {
    const nextN = totalMinted + 1;
    onIncrementMinted();

    if (selectedVanity) {
      setVanityOptions((prev) =>
        prev.map((v) =>
          v.serial === selectedVanity
            ? { ...v, available: false, claimedBy: buyerHandle || "@collector_anon" }
            : v,
        ),
      );

      const newEntry: SerialLedgerEntry = {
        id: `led_${Date.now()}`,
        serialTag: `${selectedVanity}/N [VANITY]`,
        modeTag: "VANITY",
        handle: buyerHandle.trim() || "@collector_anon",
        size: selectedSize,
        amountDollars: 30,
        timestamp: "just now",
      };

      setLedger((prev) => [newEntry, ...prev]);
      setToastNotice(
        `Claimed Vanity Serial ${selectedVanity}/${nextN} (Size ${selectedSize}) for $30.00 ($25.00 base + $5.00 vanity claim).`,
      );
      setSelectedVanity(null);
      return;
    }

    const sequentialSerial = `#${String(nextN).padStart(3, "0")}`;
    const newEntry: SerialLedgerEntry = {
      id: `led_${Date.now()}`,
      serialTag: `${sequentialSerial}/N`,
      modeTag: "HOPPER",
      handle: buyerHandle.trim() || "@collector_anon",
      size: selectedSize,
      amountDollars: 25,
      timestamp: "just now",
    };

    setLedger((prev) => [newEntry, ...prev]);
    setToastNotice(
      `Minted Sequential Hopper Edition ${sequentialSerial}/${nextN} (Size ${selectedSize}) at flat $25.00 base price.`,
    );
  };

  return (
    <div className="space-y-6">
      {/* Shared Size Selector & Collector Handle Bar */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 shadow-2xl rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="font-mono text-[10px] text-white/45 uppercase tracking-widest block">
              STEP 1 · GARMENT FIT & PASSPORT HANDLE
            </span>
            <h3 className="text-sm font-bold text-[#F9F9F9]">
              Select Heavyweight Size (S–XXL)
            </h3>
          </div>

          <div className="flex items-center gap-1.5" role="group" aria-label="Garment size selector">
            {SIZES.map((sz) => (
              <button
                key={sz}
                type="button"
                onClick={() => setSelectedSize(sz)}
                className={cn(
                  "w-10 h-10 rounded-lg font-mono text-xs font-bold border transition-all cursor-pointer",
                  selectedSize === sz
                    ? "bg-[#CC5500] border-[#CC5500] text-[#F9F9F9] shadow-[0_0_12px_rgba(204,85,0,0.45)]"
                    : "bg-black/40 border-white/15 text-white/60 hover:text-white hover:border-white/30",
                )}
              >
                {sz}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 pt-2 border-t border-white/10">
          <label
            htmlFor="get-bent-handle"
            className="font-mono text-xs text-white/55 whitespace-nowrap"
          >
            PASSPORT LEDGER HANDLE:
          </label>
          <input
            id="get-bent-handle"
            type="text"
            value={buyerHandle}
            onChange={(e) => setBuyerHandle(e.target.value)}
            placeholder="@your_handle"
            className="flex-1 rounded-lg bg-black/50 border border-white/15 px-3 py-1.5 font-mono text-xs text-[#22D3EE] focus:outline-none focus:border-[#CC5500]"
          />
        </div>
      </div>

      {/* TRACK A: Bid for #069 / N (Soft-Close Auction) */}
      <form
        onSubmit={handlePlaceBid}
        className="bg-white/5 backdrop-blur-md border border-[#CC5500]/45 shadow-2xl rounded-xl p-5 sm:p-6 space-y-4 relative overflow-hidden"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-[#CC5500] font-mono text-[10px] font-bold text-[#F9F9F9] uppercase">
              TRACK A
            </span>
            <h3 className="text-base sm:text-lg font-bold text-[#F9F9F9]">
              Bid for <span className="font-mono text-orange-400">#069 / N</span> (Soft-Close Auction)
            </h3>
          </div>

          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/15 border border-orange-500/35 font-mono text-[10px] font-semibold text-orange-300">
            <Clock className="w-3 h-3 text-[#CC5500]" />
            10-Minute Popcorn Anti-Snipe Rule Active
          </span>
        </div>

        {/* Top Bid & Proxy Input Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3.5 rounded-xl bg-black/55 border border-white/10">
            <span className="font-mono text-[10px] text-white/45 uppercase block">
              CURRENT TOP BID FOR #069 / {totalMinted}
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-mono text-2xl font-bold text-[#22D3EE]">
                ${topBidDollars.toFixed(2)}
              </span>
              <span className="font-mono text-[10px] text-white/50">
                ($25 base + ${(topBidDollars - 25).toFixed(2)} surplus)
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-black/55 border border-white/10">
            <label
              htmlFor="proxy-max-bid"
              className="font-mono text-[10px] text-white/45 uppercase block"
            >
              PROXY MAX BID ($25 BASE + SURPLUS CEILING)
            </label>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-mono text-base font-bold text-white/60">$</span>
              <input
                id="proxy-max-bid"
                type="number"
                min={topBidDollars + 1}
                step={1}
                value={proxyBidInput}
                onChange={(e) => setProxyBidInput(e.target.value)}
                className="w-full rounded-lg bg-white/5 border border-white/15 px-2.5 py-1 font-mono text-base font-bold text-[#F9F9F9] focus:outline-none focus:border-[#CC5500]"
              />
            </div>
          </div>
        </div>

        {/* Explicit Soft-Close & Hopper Fallback Rule Readout */}
        <div className="p-3.5 rounded-xl bg-black/45 border border-orange-500/25 space-y-2">
          <p className="text-xs text-white/85 leading-relaxed">
            &ldquo;Top bidder at midnight wins #069/N (or #001/N if under 69 total orders). Every runner-up automatically converts to a sequential hopper edition (#XX/N) at the flat $25 base price—zero wasted bids.&rdquo;
          </p>
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/10 font-mono text-[10px] text-white/55">
            <span>
              80/20 SURPLUS SPLIT: <strong className="text-orange-300">${creatorTotalFromAuction.toFixed(2)} to Get Bent</strong>
            </span>
            <span className="text-[#22D3EE]">
              Size {selectedSize} · Auto-Hopper Fallback Protected
            </span>
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-3 px-4 rounded-xl bg-[#CC5500] hover:bg-[#e0621a] text-[#F9F9F9] font-mono text-xs sm:text-sm font-bold uppercase tracking-wider shadow-[0_0_24px_rgba(204,85,0,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Flame className="w-4 h-4" />
          <span>
            Place Proxy Bid for #069 / N (${parsedBid.toFixed(2)} Ceiling · Size {selectedSize})
          </span>
        </button>
      </form>

      {/* TRACK B: Standard Hopper or $5 Vanity Serial */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 shadow-2xl rounded-xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-cyan-500/20 border border-cyan-500/40 font-mono text-[10px] font-bold text-[#22D3EE] uppercase">
              TRACK B
            </span>
            <h3 className="text-base sm:text-lg font-bold text-[#F9F9F9]">
              Standard $25 Hopper or +$5 Vanity Serial
            </h3>
          </div>
          <span className="font-mono text-xs font-bold text-[#F9F9F9]">
            {selectedVanity ? "$30.00 ($25 + $5 Vanity)" : "$25.00 Flat Base"}
          </span>
        </div>

        <p className="text-xs text-white/65 leading-relaxed">
          Enter the sequential hopper at <span className="font-mono text-white font-semibold">$25.00</span> for the next edition (<span className="font-mono text-[#22D3EE]">#{String(totalMinted + 1).padStart(3, "0")} / N</span>), or lock an available vanity serial below for <span className="font-mono text-orange-300 font-semibold">+$5.00</span> (80% of vanity surplus goes directly to Get Bent Clothing).
        </p>

        {/* Optional +$5 Vanity Number Picker (#007, #013, #042, #420) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between font-mono text-[11px]">
            <span className="text-white/55 uppercase">
              OPTIONAL +$5 VANITY NUMBER PICKER:
            </span>
            {selectedVanity && (
              <button
                type="button"
                onClick={() => setSelectedVanity(null)}
                className="text-orange-300 hover:underline cursor-pointer"
              >
                Use Sequential Hopper (#XX/N) Instead
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {vanityOptions.map((item) => {
              const isSelected = selectedVanity === item.serial;
              return (
                <button
                  key={item.serial}
                  type="button"
                  disabled={!item.available}
                  onClick={() =>
                    setSelectedVanity(isSelected ? null : item.serial)
                  }
                  className={cn(
                    "p-3 rounded-xl border font-mono text-left transition-all",
                    !item.available
                      ? "bg-black/30 border-white/5 text-white/25 cursor-not-allowed"
                      : isSelected
                        ? "bg-[#22D3EE]/15 border-[#22D3EE] text-[#F9F9F9] shadow-[0_0_16px_rgba(34,211,238,0.25)] cursor-pointer"
                        : "bg-black/45 border-white/10 text-white/80 hover:border-white/25 cursor-pointer",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold">{item.serial} / N</span>
                    <span className="text-[10px] text-[#22D3EE]">+$5</span>
                  </div>
                  <span
                    className={cn(
                      "text-[9px] uppercase block mt-1",
                      !item.available
                        ? "text-red-400/70"
                        : isSelected
                          ? "text-[#22D3EE] font-bold"
                          : "text-emerald-400",
                    )}
                  >
                    {item.available ? "AVAILABLE" : `CLAIMED (${item.claimedBy})`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={handleHopperOrVanityCheckout}
          className="w-full py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-[#F9F9F9] font-mono text-xs sm:text-sm font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <ShoppingBag className="w-4 h-4 text-[#22D3EE]" />
          <span>
            {selectedVanity
              ? `Claim Vanity Serial ${selectedVanity} / N — $30.00 (Size ${selectedSize})`
              : `Enter Sequential Hopper (#${String(totalMinted + 1).padStart(3, "0")} / N) — $25.00 (Size ${selectedSize})`}
          </span>
        </button>
      </div>

      {/* Confirmation Notice */}
      {toastNotice && (
        <div
          role="status"
          className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/35 font-mono text-xs text-emerald-300 flex items-start gap-2.5"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          <span>{toastNotice}</span>
        </div>
      )}

      {/* Live Serial Ledger Feed */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 shadow-2xl rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#22D3EE]" />
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#F9F9F9]">
              LIVE SERIAL LEDGER FEED (BATCH 001 · N = {totalMinted})
            </h3>
          </div>
          <span className="font-mono text-[10px] text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            REALTIME HOPPER
          </span>
        </div>

        <div className="divide-y divide-white/8 font-mono text-xs max-h-56 overflow-y-auto">
          {ledger.map((entry) => (
            <div
              key={entry.id}
              className="py-2.5 flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={cn(
                    "px-2 py-0.5 rounded font-bold text-[11px]",
                    entry.modeTag === "LEADING BID"
                      ? "bg-[#CC5500]/25 border border-[#CC5500]/50 text-orange-300"
                      : entry.modeTag === "VANITY"
                        ? "bg-cyan-500/15 border border-cyan-500/35 text-[#22D3EE]"
                        : "bg-white/5 border border-white/10 text-white/80",
                  )}
                >
                  {entry.serialTag}
                </span>
                <span className="text-white/75 truncate">{entry.handle}</span>
                <span className="text-[10px] text-white/40">[{entry.size}]</span>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="font-bold text-[#F9F9F9]">
                  ${entry.amountDollars.toFixed(2)}
                </span>
                <span className="text-[10px] text-white/35">{entry.timestamp}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
