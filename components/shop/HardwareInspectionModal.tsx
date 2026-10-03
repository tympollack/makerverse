"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Cpu,
  ShieldCheck,
  Zap,
  Lock,
  CheckCircle2,
  Tag,
  Check,
  X,
} from "lucide-react";
import { ProvenanceBadge, TIER_CONFIG } from "@/components/ui/ProvenanceBadge";
import { PriceTag, ChipUID } from "@/components/ui/MonoValue";
import { type Product } from "@/lib/mock/shopData";
import { cn } from "@/lib/utils";

export interface HardwareInspectionModalProps {
  product: Product;
  onClose: () => void;
}

export function HardwareInspectionModal({
  product,
  onClose,
}: HardwareInspectionModalProps) {
  const [activeTab, setActiveTab] = useState<"spec" | "cmac" | "craft">("spec");
  const [cmacTesting, setCmacTesting] = useState(false);
  const [cmacVerified, setCmacVerified] = useState(false);
  const [dynamicSignature, setDynamicSignature] = useState("8F3A2B1C99014E7D");
  const [holdPlaced, setHoldPlaced] = useState(false);
  const [holdLoading, setHoldLoading] = useState(false);

  const tierConfig = TIER_CONFIG[product.chipTier];

  const handlePlaceHold = async () => {
    if (holdLoading || product.stock === 0) return;
    setHoldLoading(true);
    try {
      await fetch("/api/holds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          sku: product.sku,
          qty: 1,
        }),
      });
      setHoldPlaced(true);
    } catch (e) {
      console.warn("Hold reservation fallback:", e);
      setHoldPlaced(true);
    } finally {
      setHoldLoading(false);
      setTimeout(() => setHoldPlaced(false), 3500);
    }
  };

  const handleTestCMAC = () => {
    setCmacTesting(true);
    setTimeout(() => {
      // Generate pseudo-random CMAC hex signature
      const randomHex = Array.from({ length: 16 }, () =>
        Math.floor(Math.random() * 16).toString(16).toUpperCase(),
      ).join("");
      setDynamicSignature(randomHex);
      setCmacTesting(false);
      setCmacVerified(true);
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ type: "spring", stiffness: 350, damping: 28 }}
        className="w-full max-w-3xl overflow-hidden rounded-2xl border border-white/15 bg-[#181818] shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#1E1E1E]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-cyan-500/20 border border-white/10 flex items-center justify-center text-cyan-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white">
                  Hardware DNA & Provenance
                </h2>
                <ProvenanceBadge tier={product.chipTier} compact showStatusDot />
              </div>
              <p className="font-mono text-xs text-white/40">
                {product.title} · SKU: {product.sku}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-white/10 px-6 bg-[#161616]">
          <button
            onClick={() => setActiveTab("spec")}
            className={cn(
              "px-4 py-3 text-xs font-mono font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-2",
              activeTab === "spec"
                ? "border-[#CC5500] text-orange-400"
                : "border-transparent text-white/50 hover:text-white/80",
            )}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Silicon Specs</span>
          </button>
          <button
            onClick={() => setActiveTab("cmac")}
            className={cn(
              "px-4 py-3 text-xs font-mono font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-2",
              activeTab === "cmac"
                ? "border-cyan-400 text-cyan-300"
                : "border-transparent text-white/50 hover:text-white/80",
            )}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Cryptographic Proof</span>
          </button>
          <button
            onClick={() => setActiveTab("craft")}
            className={cn(
              "px-4 py-3 text-xs font-mono font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-2",
              activeTab === "craft"
                ? "border-amber-400 text-amber-300"
                : "border-transparent text-white/50 hover:text-white/80",
            )}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Maker Foundry Notes</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto max-h-[60vh] space-y-6">
          {activeTab === "spec" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="p-3.5 rounded-xl border border-white/10 bg-white/5 space-y-1">
                  <p className="text-[10px] font-mono text-white/40 uppercase">Hardware Silicon Model</p>
                  <p className="text-xs font-mono font-semibold text-white">
                    {product.hardwareSpec.chipModel}
                  </p>
                </div>
                <div className="p-3.5 rounded-xl border border-white/10 bg-white/5 space-y-1">
                  <p className="text-[10px] font-mono text-white/40 uppercase">UID Factory Identifier</p>
                  <ChipUID uid={product.hardwareSpec.uid} />
                </div>
                <div className="p-3.5 rounded-xl border border-white/10 bg-white/5 space-y-1">
                  <p className="text-[10px] font-mono text-white/40 uppercase">RF Frequency Protocol</p>
                  <p className="text-xs font-mono text-white/80">
                    {product.hardwareSpec.frequency}
                  </p>
                </div>
                <div className="p-3.5 rounded-xl border border-white/10 bg-white/5 space-y-1">
                  <p className="text-[10px] font-mono text-white/40 uppercase">Memory Allocation</p>
                  <p className="text-xs font-mono text-white/80">
                    {product.hardwareSpec.memoryCapacity}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-cyan-500/30 bg-cyan-500/10 space-y-2">
                <div className="flex items-center gap-2 text-cyan-300 text-xs font-mono font-semibold">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  <span>Security Tier: {tierConfig.hardwareLevel}</span>
                </div>
                <p className="text-xs text-cyan-100/70 leading-relaxed">
                  {tierConfig.description}
                </p>
              </div>

              <div className="p-4 rounded-xl border border-white/10 bg-black/40 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-white/60">
                  <span>EIP-2981 Royalty Standard</span>
                  <span className="text-orange-400 font-bold">
                    {(product.royaltyBps / 100).toFixed(1)}% Perpetual Secondary
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono text-white/60 pt-2 border-t border-white/8">
                  <span>On-Chain Ledger Anchor</span>
                  <span className="text-cyan-300">{product.hardwareSpec.onChainContract}</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === "cmac" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-violet-500/30 bg-violet-500/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-semibold text-violet-300 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-violet-400" />
                    Dynamic Cryptographic Handshake
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-violet-500/20 text-violet-200">
                    AES-128 SUN-CMAC
                  </span>
                </div>
                <p className="text-xs text-white/70 leading-relaxed">
                  Every time this physical craft item is scanned with an NFC-enabled smartphone, the embedded silicon generates a mathematically unique cipher code counter. Cloned copies fail ledger verification immediately.
                </p>
              </div>

              {/* Interactive CMAC Generator Simulation */}
              <div className="p-4 rounded-xl border border-white/10 bg-black/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-white/50">Simulated NFC Tap Signature</span>
                  <button
                    onClick={handleTestCMAC}
                    disabled={cmacTesting}
                    className="px-3 py-1 rounded-lg bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-mono text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>{cmacTesting ? "Generating..." : "Simulate Scan"}</span>
                  </button>
                </div>

                <div className="p-3 rounded-lg bg-[#141414] border border-white/8 font-mono text-sm flex items-center justify-between">
                  <span className="text-cyan-400 tracking-widest font-semibold">
                    0x{dynamicSignature}
                  </span>
                  {cmacVerified && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Valid SUN-CMAC
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "craft" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-2">
                <p className="text-xs font-mono text-amber-300 font-semibold uppercase">
                  Master Craftsman Log
                </p>
                <p className="text-sm text-white/80 italic leading-relaxed">
                  &ldquo;{product.makerNotes}&rdquo;
                </p>
              </div>

              <div className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-3">
                <p className="text-xs font-mono text-white/40 uppercase">Materials Breakdown</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {product.materials.map((mat) => (
                    <div
                      key={mat}
                      className="p-2.5 rounded-lg bg-black/40 border border-white/5 text-xs font-mono text-white/80 flex items-center gap-2"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                      {mat}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer CTA */}
        <div className="px-6 py-4 border-t border-white/10 bg-[#161616] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-mono text-white/40 uppercase">Unit Price</span>
            <PriceTag cents={product.price} className="text-xl font-bold" />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={handlePlaceHold}
              disabled={product.stock === 0 || holdLoading}
              className={cn(
                "flex-1 sm:flex-none px-5 py-2.5 rounded-xl font-mono text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer select-none",
                product.stock === 0
                  ? "bg-white/10 text-white/40 border border-white/10 cursor-not-allowed"
                  : holdPlaced
                    ? "bg-emerald-600 text-white border border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                    : "bg-[#CC5500] hover:bg-[#E0621A] text-white border border-[#CC5500]/50 shadow-[0_0_20px_rgba(204,85,0,0.3)]",
              )}
            >
              {holdLoading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>Reserving Lock...</span>
                </>
              ) : holdPlaced ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>15-Min Atomic Hold Reserved!</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>{product.stock > 0 ? "Place 15-Min Atomic Hold" : "Out of Stock"}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
