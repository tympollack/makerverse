// components/admin/ProductRegistrationDrawer.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Sparkles,
  Cpu,
  Save,
  QrCode,
  ShieldCheck,
  Zap,
  RefreshCw,
  Layers,
} from "lucide-react";
import { MonoValue } from "@/components/ui/MonoValue";
import type { InventoryItem } from "@/lib/mock/adminData";
import type { ChipTier } from "@/lib/mock/shopData";
import { cn } from "@/lib/utils";

interface ProductRegistrationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onRegisterProduct: (product: Omit<InventoryItem, "id" | "lastUpdated">) => void;
}

const HARDWARE_TIERS: {
  value: ChipTier;
  label: string;
  sublabel: string;
  icon: React.ElementType;
  cryptoProtocol: string;
  badgeColor: string;
}[] = [
  {
    value: "QR_REGISTRY",
    label: "QR Registry",
    sublabel: "Optical Laser-Etched Micro-QR",
    icon: QrCode,
    cryptoProtocol: "Makerverse Permanent SHA-256 Ledger Anchor",
    badgeColor: "border-white/20 text-white/70",
  },
  {
    value: "NTAG213_SERIALIZED",
    label: "NTAG213 · Serialized",
    sublabel: "144-byte Memory · Hardware Lock Bits",
    icon: Cpu,
    cryptoProtocol: "UID Mirror + Lock Bits Hardware Protocol",
    badgeColor: "border-sky-500/30 text-sky-300",
  },
  {
    value: "NTAG424_DNA",
    label: "NTAG424 · DNA Cryptographic",
    sublabel: "AES-128 SUN-CMAC Dynamic Authentication",
    icon: ShieldCheck,
    cryptoProtocol: "AES-128 SUN-CMAC Dynamic Verification (NXP AN12196)",
    badgeColor: "border-purple-500/40 text-purple-300",
  },
];

export function ProductRegistrationDrawer({
  isOpen,
  onClose,
  onRegisterProduct,
}: ProductRegistrationDrawerProps) {
  // Form State
  const [sku, setSku] = useState("FC-BLT-K2-009");
  const [title, setTitle] = useState("");
  const [stockQty, setStockQty] = useState(24);
  const [priceUsd, setPriceUsd] = useState(48.0);
  const [royaltyBps, setRoyaltyBps] = useState(750); // 7.5%
  const [chipTier, setChipTier] = useState<ChipTier>("NTAG424_DNA");
  const [coSignRequired, setCoSignRequired] = useState(true);

  // Simulation State
  const [simulatedResalePrice, setSimulatedResalePrice] = useState(100);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  // Generate randomized craftsman SKU
  const handleGenerateSku = () => {
    const prefixes = ["FC-BLT", "FC-LTH", "FC-MTL", "FC-CPR", "FC-BRS"];
    const tags = ["EDC", "WRT", "FLT", "PNT", "FOB", "SIG"];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const tag = tags[Math.floor(Math.random() * tags.length)];
    const randNum = Math.floor(100 + Math.random() * 900);
    setSku(`${prefix}-${tag}-${randNum}`);
  };

  // EIP-2981 Royalty Payout Calculation Breakdown
  const royaltyPercent = (royaltyBps / 100).toFixed(1);
  const creatorRoyaltyAmount = (simulatedResalePrice * royaltyBps) / 10000;
  const protocolCut = creatorRoyaltyAmount * 0.1; // 10% platform fee
  const makerNetPayout = creatorRoyaltyAmount - protocolCut;
  const resellerGrossPayout = simulatedResalePrice - creatorRoyaltyAmount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !sku.trim()) return;

    onRegisterProduct({
      sku: sku.trim().toUpperCase(),
      title: title.trim(),
      stock: Number(stockQty) || 0,
      maxStock: Number(stockQty) || 24,
      royaltyBps,
      chipTier,
      coSignRequired,
      status: Number(stockQty) > 0 ? "IN_STOCK" : "OUT_OF_STOCK",
    });

    // Reset & close
    setTitle("");
    handleGenerateSku();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm cursor-pointer"
          />

          {/* Slide-over Container */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="relative w-full max-w-xl bg-[#151515] border-l border-white/10 shadow-2xl flex flex-col h-full z-10 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-[#121212]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#CC5500] to-[#8C3A00] flex items-center justify-center shadow-[0_0_15px_rgba(204,85,0,0.35)]">
                  <Layers className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white tracking-wide">
                    Register Product & Mint SKU
                  </h2>
                  <p className="text-xs font-mono text-white/40">
                    Physical craft anchor · EIP-2981 contract specification
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Section 1: Core Product Details */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono font-semibold text-orange-400 uppercase tracking-wider">
                    01 // Product & Batch Metadata
                  </h3>
                  <span className="text-[10px] font-mono text-white/30">Craftsman Catalog</span>
                </div>

                {/* Title */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-white/70 flex items-center justify-between">
                    <span>Product Title</span>
                    <span className="text-[10px] text-white/30">Required</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Blackened Copper Keyring — Gen 2"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#CC5500] focus:ring-1 focus:ring-[#CC5500]/50 transition-all font-sans"
                  />
                </div>

                {/* SKU with Auto-Generator */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono text-white/70">
                      SKU Code Identifier
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateSku}
                      className="flex items-center gap-1 text-[10px] font-mono text-orange-400 hover:text-orange-300 transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Auto-Generate SKU
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={sku}
                      onChange={(e) => setSku(e.target.value.toUpperCase())}
                      placeholder="FC-BLT-K2-009"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3.5 py-2.5 font-mono text-sm text-cyan-300 tracking-wider placeholder:text-white/20 focus:outline-none focus:border-[#CC5500] focus:ring-1 focus:ring-[#CC5500]/50 transition-all"
                    />
                  </div>
                </div>

                {/* Stock Qty & Price */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Stock Qty */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-white/70">
                      Batch Size (Max Stock)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={500}
                      required
                      value={stockQty}
                      onChange={(e) => setStockQty(Number(e.target.value))}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3.5 py-2.5 font-mono text-sm text-white focus:outline-none focus:border-[#CC5500] focus:ring-1 focus:ring-[#CC5500]/50 transition-all"
                    />
                  </div>

                  {/* Price USD */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-white/70">
                      Retail Price (USD)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-white/35 text-sm">
                        $
                      </span>
                      <input
                        type="number"
                        step="0.5"
                        min={1}
                        required
                        value={priceUsd}
                        onChange={(e) => setPriceUsd(Number(e.target.value))}
                        className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3.5 py-2.5 font-mono text-sm text-white focus:outline-none focus:border-[#CC5500] focus:ring-1 focus:ring-[#CC5500]/50 transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="h-px bg-white/8" />

              {/* Section 2: Hardware Tier Selector */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono font-semibold text-orange-400 uppercase tracking-wider">
                    02 // Hardware Silicon Tier Selector
                  </h3>
                  <span className="text-[10px] font-mono text-cyan-400">Physical Authentication</span>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {HARDWARE_TIERS.map((tier) => {
                    const isSelected = chipTier === tier.value;
                    const Icon = tier.icon;
                    return (
                      <button
                        key={tier.value}
                        type="button"
                        onClick={() => setChipTier(tier.value)}
                        className={cn(
                          "w-full text-left p-3.5 rounded-xl border transition-all duration-150 relative cursor-pointer",
                          isSelected
                            ? "bg-[#CC5500]/10 border-[#CC5500]/50 shadow-[0_0_15px_rgba(204,85,0,0.15)]"
                            : "bg-white/4 border-white/8 hover:bg-white/7 hover:border-white/15",
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",
                              isSelected
                                ? "bg-[#CC5500]/20 text-orange-300"
                                : "bg-white/5 text-white/40",
                            )}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span
                                className={cn(
                                  "text-xs font-semibold tracking-wide",
                                  isSelected ? "text-orange-200" : "text-white/80",
                                )}
                              >
                                {tier.label}
                              </span>
                              {isSelected && (
                                <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-[#CC5500] text-white font-bold uppercase tracking-wider">
                                  Selected
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-white/50 mt-0.5">{tier.sublabel}</p>
                            <p className="text-[10px] font-mono text-cyan-300/70 mt-1 truncate">
                              Protocol: {tier.cryptoProtocol}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="h-px bg-white/8" />

              {/* Section 3: EIP-2981 Secondary Royalty Slider & Real-Time Payout Simulator */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-orange-400" />
                    <h3 className="text-xs font-mono font-semibold text-orange-400 uppercase tracking-wider">
                      03 // EIP-2981 Secondary Royalty
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-white/40">On-Chain Enforced</span>
                </div>

                {/* Slider Component */}
                <div className="p-4 rounded-xl bg-white/3 border border-white/8 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-white/70">
                      Secondary Resale Royalty
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-white/30">
                        {royaltyBps} bps
                      </span>
                      <MonoValue glow="orange" className="text-base font-bold">
                        {royaltyPercent}%
                      </MonoValue>
                    </div>
                  </div>

                  {/* Range Slider 5.0% - 10.0% */}
                  <div className="space-y-1.5">
                    <input
                      type="range"
                      min={500}
                      max={1000}
                      step={50}
                      value={royaltyBps}
                      onChange={(e) => setRoyaltyBps(Number(e.target.value))}
                      className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#CC5500]"
                    />
                    <div className="flex justify-between font-mono text-[9px] text-white/30">
                      <span>5.0% (Min threshold)</span>
                      <span>7.5% (Recommended)</span>
                      <span>10.0% (Cap)</span>
                    </div>
                  </div>

                  {/* Payout Simulation Box */}
                  <div className="pt-2 border-t border-white/6 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono text-cyan-300 flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-cyan-400" />
                        Real-Time Payout Simulation
                      </span>
                      {/* Preset simulation buttons */}
                      <div className="flex items-center gap-1">
                        {[50, 100, 250, 500].map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => setSimulatedResalePrice(amt)}
                            className={cn(
                              "px-2 py-0.5 rounded font-mono text-[9px] transition-colors cursor-pointer",
                              simulatedResalePrice === amt
                                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                                : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white",
                            )}
                          >
                            ${amt}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Proportional Split Bar */}
                    <div className="h-3 w-full bg-white/10 rounded-full overflow-hidden flex">
                      <div
                        className="bg-[#CC5500] h-full transition-all duration-200"
                        style={{ width: `${royaltyBps / 100}%` }}
                        title={`Maker Royalty: ${royaltyPercent}%`}
                      />
                      <div
                        className="bg-slate-700 h-full flex-1 transition-all duration-200"
                        title={`Reseller Share: ${(100 - royaltyBps / 100).toFixed(1)}%`}
                      />
                    </div>

                    {/* Split Details Breakdown Table */}
                    <div className="grid grid-cols-3 gap-2 text-center pt-1">
                      <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                        <p className="text-[9px] font-mono text-orange-300/80 uppercase">
                          Maker Net Payout
                        </p>
                        <MonoValue glow="orange" className="text-xs font-bold mt-0.5">
                          ${makerNetPayout.toFixed(2)}
                        </MonoValue>
                        <span className="text-[8px] font-mono text-white/30 block">
                          {(Number(royaltyPercent) * 0.9).toFixed(1)}% net
                        </span>
                      </div>

                      <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                        <p className="text-[9px] font-mono text-cyan-300/80 uppercase">
                          Protocol Fee
                        </p>
                        <MonoValue glow="cyan" className="text-xs font-bold mt-0.5">
                          ${protocolCut.toFixed(2)}
                        </MonoValue>
                        <span className="text-[8px] font-mono text-white/30 block">10% of cut</span>
                      </div>

                      <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                        <p className="text-[9px] font-mono text-white/40 uppercase">Reseller Net</p>
                        <MonoValue glow="white" className="text-xs font-bold mt-0.5">
                          ${resellerGrossPayout.toFixed(2)}
                        </MonoValue>
                        <span className="text-[8px] font-mono text-white/30 block">
                          {(100 - Number(royaltyPercent)).toFixed(1)}% share
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="h-px bg-white/8" />

              {/* Section 4: Modification Co-Signing Toggle Switch */}
              <div className="space-y-2">
                <h3 className="text-xs font-mono font-semibold text-orange-400 uppercase tracking-wider">
                  04 // Secondary Modification Governance
                </h3>

                <div className="flex items-center justify-between p-4 rounded-xl bg-white/3 border border-white/8">
                  <div className="space-y-0.5 pr-4">
                    <p className="text-xs font-semibold text-white/90">
                      Modification Co-Signing Required
                    </p>
                    <p className="text-[11px] text-white/40">
                      Require maker cryptographic signature to validate secondary customizations, repairs, or refurbishments on-chain.
                    </p>
                  </div>

                  {/* Switch toggle */}
                  <button
                    type="button"
                    onClick={() => setCoSignRequired(!coSignRequired)}
                    className={cn(
                      "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                      coSignRequired ? "bg-[#CC5500]" : "bg-white/15",
                    )}
                  >
                    <span
                      className={cn(
                        "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                        coSignRequired ? "translate-x-5" : "translate-x-0",
                      )}
                    />
                  </button>
                </div>
              </div>
            </form>

            {/* Footer / Actions */}
            <div className="px-6 py-4 border-t border-white/10 bg-[#121212] flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-lg border border-white/10 text-xs font-mono text-white/60 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                className="flex-1 btn-cta flex items-center justify-center gap-2 text-xs uppercase tracking-wider py-2.5 font-bold cursor-pointer"
              >
                <Save className="w-4 h-4" />
                Register Product & Generate SKU Matrix
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
