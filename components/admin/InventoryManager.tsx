// components/admin/InventoryManager.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  AlertTriangle,
  Lock,
  Unlock,
  Shield,
  Cpu,
  ChevronDown,
  ChevronUp,
  ToggleLeft,
  ToggleRight,
  Save,
} from "lucide-react";
import { FrostedCard } from "@/components/ui/FrostedCard";
import { MonoValue, ChipUID } from "@/components/ui/MonoValue";
import { StatusBadge, ChipTierBadge } from "@/components/ui/StatusBadge";
import { ProvenanceBadge } from "@/components/ui/ProvenanceBadge";
import { INVENTORY_ITEMS, NFC_BATCH_QUEUE } from "@/lib/mock/adminData";
import type { NfcChipEntry, ChipLockState } from "@/lib/mock/adminData";
import type { ChipTier } from "@/lib/mock/shopData";
import { cn } from "@/lib/utils";

// ─── Product Creator Form ─────────────────────────────────────────────────────

function ProductCreatorForm({ onClose }: { onClose: () => void }) {
  const [royalty, setRoyalty] = useState(750); // basis points
  const [chipTier, setChipTier] = useState<ChipTier>("NTAG424_DNA");
  const [coSign, setCoSign] = useState(false);

  const CHIP_OPTIONS: { value: ChipTier; label: string }[] = [
    { value: "QR_REGISTRY", label: "QR Registry" },
    { value: "NTAG213_SERIALIZED", label: "NTAG213 · Serialized" },
    { value: "NTAG215_SERIALIZED", label: "NTAG215 · Serialized" },
    { value: "NTAG424_DNA", label: "NTAG424 · DNA" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
    >
      <FrostedCard className="border-orange-500/25 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white/90">Register New Product</h3>
          <button
            onClick={onClose}
            className="text-xs font-mono text-white/30 hover:text-white/60 transition-colors"
          >
            Cancel
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Title */}
          <div className="sm:col-span-2 space-y-1.5">
            <label className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
              Product Title
            </label>
            <input
              type="text"
              placeholder="e.g. Blackened Copper Keyring — Gen 2"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-orange-500/50 transition-colors"
            />
          </div>

          {/* SKU */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
              SKU
            </label>
            <input
              type="text"
              placeholder="FC-XXX-YYY-NNN"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 font-mono text-sm text-cyan-300 placeholder:text-white/15 focus:outline-none focus:border-orange-500/50 transition-colors"
            />
          </div>

          {/* Price */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
              Price (USD)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-white/30 text-sm">
                $
              </span>
              <input
                type="number"
                placeholder="0.00"
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-7 pr-3 py-2 font-mono text-sm text-white placeholder:text-white/15 focus:outline-none focus:border-orange-500/50 transition-colors"
              />
            </div>
          </div>

          {/* Max stock */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
              Batch Size (Max Stock)
            </label>
            <input
              type="number"
              placeholder="24"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 font-mono text-sm text-white placeholder:text-white/15 focus:outline-none focus:border-orange-500/50 transition-colors"
            />
          </div>

          {/* Chip tier */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
              Chip Tier
            </label>
            <select
              value={chipTier}
              onChange={(e) => setChipTier(e.target.value as ChipTier)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 font-mono text-sm text-white focus:outline-none focus:border-orange-500/50 transition-colors appearance-none cursor-pointer"
            >
              {CHIP_OPTIONS.map((o) => (
                <option key={o.value} value={o.value} className="bg-[#1A1A1A]">
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* Royalty slider — EIP-2981 */}
          <div className="sm:col-span-2 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
                Secondary Royalty (EIP-2981)
              </label>
              <MonoValue glow="orange" className="text-sm font-semibold">
                {(royalty / 100).toFixed(1)}%
              </MonoValue>
            </div>
            <input
              type="range"
              min={500}
              max={1000}
              step={50}
              value={royalty}
              onChange={(e) => setRoyalty(Number(e.target.value))}
              className="w-full accent-orange-500 cursor-pointer"
            />
            <div className="flex justify-between font-mono text-[9px] text-white/20">
              <span>5.0% min</span>
              <span>10.0% max</span>
            </div>
          </div>

          {/* Co-sign toggle */}
          <div className="sm:col-span-2 flex items-center justify-between p-3 rounded-lg bg-white/3 border border-white/8">
            <div>
              <p className="text-xs font-medium text-white/80">
                Modification Co-Signing Required
              </p>
              <p className="text-[10px] font-mono text-white/35 mt-0.5">
                Require maker signature for resale modification records
              </p>
            </div>
            <button onClick={() => setCoSign((c) => !c)} className="ml-4 flex-shrink-0">
              {coSign ? (
                <ToggleRight className="w-7 h-7 text-orange-400" />
              ) : (
                <ToggleLeft className="w-7 h-7 text-white/30" />
              )}
            </button>
          </div>
        </div>

        {/* Current chip tier preview */}
        <div className="pt-1">
          <p className="text-[10px] font-mono text-white/25 mb-2">Selected Tier Preview</p>
          <ProvenanceBadge tier={chipTier} />
        </div>

        <button className="btn-cta w-full flex items-center justify-center gap-2 text-sm">
          <Save className="w-4 h-4" />
          Register Product & Generate SKU Matrix
        </button>
      </FrostedCard>
    </motion.div>
  );
}

// ─── Chip Encoder Row ─────────────────────────────────────────────────────────

const LOCK_ICON: Record<ChipLockState, React.ElementType> = {
  UNLOCKED: Unlock,
  PASSWORD_PROTECTED: Lock,
  LOCK_BITS_SET: Shield,
};

function ChipEncoderRow({
  chip,
  index,
}: {
  chip: NfcChipEntry;
  index: number;
}) {
  const [lockState, setLockState] = useState<ChipLockState>(chip.lockState);
  const [expanded, setExpanded] = useState(false);

  const LockIcon = LOCK_ICON[lockState];
  const cycleLock = () => {
    const cycle: ChipLockState[] = ["UNLOCKED", "PASSWORD_PROTECTED", "LOCK_BITS_SET"];
    const next = cycle[(cycle.indexOf(lockState) + 1) % cycle.length];
    setLockState(next);
  };

  const needsFerrite =
    chip.tier === "NTAG424_DNA" || chip.tier === "NTAG215_SERIALIZED";
  const showFerriteWarning = needsFerrite && !chip.ferriteBacking;

  return (
    <div className="border-b border-white/5 last:border-0">
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Index */}
        <span className="font-mono text-[10px] text-white/20 w-5 text-center">
          {String(index + 1).padStart(2, "0")}
        </span>

        {/* UID */}
        <div className="flex-1 min-w-0">
          <ChipUID uid={chip.uid} />
          {chip.assignedSku && (
            <MonoValue className="text-[9px] text-white/25 mt-0.5">
              → {chip.assignedSku}
            </MonoValue>
          )}
        </div>

        {/* Tier badge */}
        <ChipTierBadge tier={chip.tier} />

        {/* Lock state */}
        <button
          onClick={cycleLock}
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-all"
          title="Cycle lock state"
        >
          <LockIcon className="w-3 h-3 text-white/40" />
          <StatusBadge variant={lockState} />
        </button>

        {/* CMAC */}
        {chip.cmac ? (
          <MonoValue glow="cyan" className="text-[9px] hidden sm:block">
            CMAC: {chip.cmac}
          </MonoValue>
        ) : (
          <span className="text-[9px] font-mono text-white/20 hidden sm:block">
            — not encoded
          </span>
        )}

        {/* Expand */}
        <button
          onClick={() => setExpanded((e) => !e)}
          className="p-1 rounded hover:bg-white/5 transition-colors"
        >
          {expanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-white/30" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-white/30" />
          )}
        </button>
      </div>

      {/* Ferrite warning banner */}
      {showFerriteWarning && (
        <div className="mx-4 mb-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
          <span className="text-[10px] font-mono text-amber-300">
            Ferrite backing required — metallic substrate detected for {chip.tier}
          </span>
        </div>
      )}

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <p className="text-[9px] font-mono text-white/25 uppercase">Tier</p>
                <ProvenanceBadge tier={chip.tier} compact className="mt-1" />
              </div>
              <div>
                <p className="text-[9px] font-mono text-white/25 uppercase">Encoded At</p>
                <MonoValue className="text-[10px] mt-1">
                  {chip.encodedAt
                    ? new Date(chip.encodedAt).toLocaleTimeString()
                    : "—"}
                </MonoValue>
              </div>
              <div>
                <p className="text-[9px] font-mono text-white/25 uppercase">Ferrite Backing</p>
                <span
                  className={cn(
                    "font-mono text-[10px] mt-1 block",
                    chip.ferriteBacking ? "text-emerald-400" : "text-red-400",
                  )}
                >
                  {chip.ferriteBacking ? "YES" : "NO"}
                </span>
              </div>
              <div>
                <p className="text-[9px] font-mono text-white/25 uppercase">CMAC Signature</p>
                <MonoValue glow={chip.cmac ? "cyan" : "none"} className="text-[9px] mt-1 break-all">
                  {chip.cmac || "—"}
                </MonoValue>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── SKU Matrix Table ──────────────────────────────────────────────────────────

function SKUMatrix() {
  return (
    <FrostedCard noPadding>
      <div className="px-4 py-3 border-b border-white/8">
        <h3 className="text-xs font-semibold text-white/70 uppercase tracking-widest">
          SKU Matrix
        </h3>
      </div>
      <div className="divide-y divide-white/5">
        {INVENTORY_ITEMS.map((item) => {
          const pct = item.maxStock > 0 ? (item.stock / item.maxStock) * 100 : 0;
          return (
            <div key={item.id} className="px-4 py-3 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <MonoValue className="text-[10px] text-white/50">{item.sku}</MonoValue>
                  <ChipTierBadge tier={item.chipTier} />
                  {item.coSignRequired && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-violet-500/30 text-violet-400 bg-violet-500/10">
                      Co-Sign
                    </span>
                  )}
                </div>
                <p className="text-xs text-white/70 mt-0.5 truncate">{item.title}</p>
                <div className="h-1 w-32 bg-white/10 rounded-full mt-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      pct > 50 ? "bg-emerald-500" : pct > 20 ? "bg-amber-500" : "bg-red-500"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="text-right">
                  <MonoValue className="text-xs">
                    {item.stock}/{item.maxStock}
                  </MonoValue>
                  <p className="text-[9px] font-mono text-white/25">
                    {(item.royaltyBps / 100).toFixed(1)}% royalty
                  </p>
                </div>
                <StatusBadge variant={item.status} />
              </div>
            </div>
          );
        })}
      </div>
    </FrostedCard>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function InventoryManager() {
  const [showCreator, setShowCreator] = useState(false);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white">Inventory & NFC Batching</h1>
          <p className="text-xs font-mono text-white/35 mt-0.5">
            Product registration · Chip encoding · Soft-lock management
          </p>
        </div>
        <button
          onClick={() => setShowCreator((s) => !s)}
          className="btn-cta flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          Register Product
        </button>
      </div>

      {/* Creator form */}
      <AnimatePresence>
        {showCreator && <ProductCreatorForm onClose={() => setShowCreator(false)} />}
      </AnimatePresence>

      {/* SKU Matrix */}
      <SKUMatrix />

      {/* NFC Batch Encoder Panel */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-sky-400" />
          <h2 className="text-xs font-semibold text-white/70 uppercase tracking-widest">
            Batch NFC Chip Encoder
          </h2>
          <span className="font-mono text-[10px] text-white/25">
            {NFC_BATCH_QUEUE.length} chips queued
          </span>
        </div>

        {/* Global ferrite warning */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/8 border border-amber-500/20">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
          <span className="text-[10px] font-mono text-amber-300/80">
            Substrate Advisory: Ferrite backing required for all NTAG424 DNA chips embedded in metallic items. Review flagged chips below.
          </span>
        </div>

        <FrostedCard noPadding>
          <div className="divide-y divide-white/5">
            {NFC_BATCH_QUEUE.map((chip, i) => (
              <ChipEncoderRow key={chip.uid} chip={chip} index={i} />
            ))}
          </div>
        </FrostedCard>
      </div>
    </div>
  );
}
