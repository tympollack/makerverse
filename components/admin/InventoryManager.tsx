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
  Search,
  CheckCircle2,
  Copy,
  Check,
  Zap,
  Layers,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { FrostedCard } from "@/components/ui/FrostedCard";
import { MonoValue } from "@/components/ui/MonoValue";
import { StatusBadge, ChipTierBadge } from "@/components/ui/StatusBadge";
import { ProductRegistrationDrawer } from "@/components/admin/ProductRegistrationDrawer";
import { VersionReleaseBadge } from "@/components/admin/VersionReleaseBadge";
import { INVENTORY_ITEMS, NFC_BATCH_QUEUE } from "@/lib/mock/adminData";
import type { InventoryItem, NfcChipEntry, ChipLockState } from "@/lib/mock/adminData";
import { cn } from "@/lib/utils";

// ─── Chip Encoder Row ─────────────────────────────────────────────────────────

const LOCK_STATE_CYCLE: ChipLockState[] = ["UNLOCKED", "PASSWORD_PROTECTED", "LOCKED_BITS"];

const LOCK_CONFIG: Record<
  ChipLockState,
  { label: string; icon: React.ElementType; color: string; bg: string }
> = {
  UNLOCKED: {
    label: "UNLOCKED",
    icon: Unlock,
    color: "text-white/50 border-white/10",
    bg: "bg-white/5 hover:bg-white/10",
  },
  PASSWORD_PROTECTED: {
    label: "PASSWORD_PROTECTED",
    icon: Lock,
    color: "text-orange-400 border-orange-500/30",
    bg: "bg-orange-500/10 hover:bg-orange-500/20",
  },
  LOCKED_BITS: {
    label: "LOCKED_BITS",
    icon: Shield,
    color: "text-purple-400 border-purple-500/30",
    bg: "bg-purple-500/10 hover:bg-purple-500/20",
  },
  LOCK_BITS_SET: {
    label: "LOCKED_BITS",
    icon: Shield,
    color: "text-purple-400 border-purple-500/30",
    bg: "bg-purple-500/10 hover:bg-purple-500/20",
  },
};

function ChipEncoderCard({
  chip,
  index,
  onCycleLock,
  onToggleFerrite,
  onGenerateCmac,
}: {
  chip: NfcChipEntry;
  index: number;
  onCycleLock: (uid: string) => void;
  onToggleFerrite: (uid: string) => void;
  onGenerateCmac: (uid: string) => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const lockConfig = LOCK_CONFIG[chip.lockState] || LOCK_CONFIG.UNLOCKED;
  const LockIcon = lockConfig.icon;

  const isMetallicSubstrate =
    chip.assignedSku?.includes("CPR") ||
    chip.assignedSku?.includes("MTL") ||
    chip.assignedSku?.includes("BLT");

  const hasSubstrateWarning = isMetallicSubstrate && !chip.ferriteBacking;

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="p-4 rounded-xl bg-[#171717] border border-white/8 hover:border-white/15 transition-all duration-200 space-y-3">
      {/* Top Header: Index, UID & Lock Cycle Button */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-[10px] text-white/30 px-1.5 py-0.5 rounded bg-white/5 border border-white/8">
            #{String(index + 1).padStart(2, "0")}
          </span>
          {/* Dynamic UID formatted in JetBrains Mono */}
          <button
            onClick={() => copyToClipboard(chip.uid, "uid")}
            className="flex items-center gap-1.5 font-mono text-xs text-cyan-300 font-semibold tracking-wider hover:text-cyan-200 transition-colors group cursor-pointer"
            title="Click to copy UID"
          >
            <span>{chip.uid}</span>
            {copied === "uid" ? (
              <Check className="w-3 h-3 text-emerald-400" />
            ) : (
              <Copy className="w-3 h-3 text-white/20 group-hover:text-white/60 transition-colors" />
            )}
          </button>
        </div>

        {/* Soft-Lock Cycle Button */}
        <button
          onClick={() => onCycleLock(chip.uid)}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-mono font-semibold transition-all cursor-pointer",
            lockConfig.color,
            lockConfig.bg,
          )}
          title="Click to cycle: UNLOCKED -> PASSWORD_PROTECTED -> LOCKED_BITS"
        >
          <LockIcon className="w-3 h-3" />
          <span>{lockConfig.label}</span>
        </button>
      </div>

      {/* Substrate Warning Callout for Metallic Products */}
      {hasSubstrateWarning && (
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300">
          <div className="flex items-center gap-2 text-[10px] font-mono">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <span>Substrate Warning: Ferrite shielding layer required for metal surfaces.</span>
          </div>
          <button
            onClick={() => onToggleFerrite(chip.uid)}
            className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-[9px] font-mono font-bold text-amber-200 border border-amber-500/40 transition-colors cursor-pointer"
          >
            Apply Ferrite
          </button>
        </div>
      )}

      {/* Middle: Assigned SKU, Tier Badge & Ferrite Status */}
      <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
        <div className="flex items-center gap-2">
          {chip.assignedSku ? (
            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-orange-300">
              SKU: {chip.assignedSku}
            </span>
          ) : (
            <span className="font-mono text-[10px] text-white/30 italic">Unassigned Pool</span>
          )}
          <ChipTierBadge tier={chip.tier} />
        </div>

        <button
          onClick={() => onToggleFerrite(chip.uid)}
          className={cn(
            "font-mono text-[10px] px-2 py-0.5 rounded border transition-colors cursor-pointer",
            chip.ferriteBacking
              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
              : "bg-white/5 border-white/10 text-white/40 hover:text-white/70",
          )}
          title="Toggle ferrite backing"
        >
          {chip.ferriteBacking ? "✓ Ferrite Shield Active" : "No Ferrite Shield"}
        </button>
      </div>

      {/* Bottom: Dynamic CMAC Signature in JetBrains Mono */}
      <div className="p-2.5 rounded-lg bg-black/40 border border-white/6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-mono text-white/35 uppercase tracking-wider flex-shrink-0">
            CMAC:
          </span>
          {chip.cmac ? (
            <span className="font-mono text-xs text-cyan-300 font-semibold tracking-wider truncate">
              {chip.cmac}
            </span>
          ) : (
            <span className="font-mono text-[10px] text-white/25 italic">
              [Not Encoded — Key Derivation Pending]
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {chip.cmac ? (
            <button
              onClick={() => copyToClipboard(chip.cmac, "cmac")}
              className="p-1 rounded hover:bg-white/10 text-white/30 hover:text-cyan-300 transition-colors cursor-pointer"
              title="Copy CMAC signature"
            >
              {copied === "cmac" ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          ) : (
            <button
              onClick={() => onGenerateCmac(chip.uid)}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-[9px] font-mono text-cyan-300 font-bold transition-colors cursor-pointer"
            >
              <Zap className="w-3 h-3 text-cyan-400" />
              Encode CMAC
            </button>
          )}

          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 rounded hover:bg-white/10 text-white/30 hover:text-white transition-colors cursor-pointer"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Collapsible Details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden pt-2 border-t border-white/6"
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-[10px]">
              <div>
                <span className="text-white/30 block">ENCODED AT:</span>
                <span className="text-white/70">
                  {chip.encodedAt ? new Date(chip.encodedAt).toLocaleTimeString() : "Pending"}
                </span>
              </div>
              <div>
                <span className="text-white/30 block">CRYPTO PROTOCOL:</span>
                <span className="text-cyan-300 truncate block">AES-128 SUN-CMAC</span>
              </div>
              <div>
                <span className="text-white/30 block">LOCK STATE:</span>
                <span className="text-purple-300">{lockConfig.label}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── SKU Matrix Table ──────────────────────────────────────────────────────────

function SKUMatrixTable({
  items,
  onQueueChips,
}: {
  items: InventoryItem[];
  onQueueChips: (item: InventoryItem) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("ALL");

  const filteredItems = items.filter((item) => {
    const matchesQuery =
      item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTier = tierFilter === "ALL" || item.chipTier === tierFilter;
    return matchesQuery && matchesTier;
  });

  return (
    <FrostedCard noPadding className="overflow-hidden">
      {/* Table Header Controls */}
      <div className="p-4 border-b border-white/8 bg-[#121212] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-orange-400" />
          <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
            SKU Matrix & Stock Allocations
          </h3>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/8 text-white/50">
            {filteredItems.length} SKUs Listed
          </span>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Search bar */}
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter SKU or title..."
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 font-mono text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-[#CC5500] transition-colors"
            />
          </div>

          {/* Tier Selector Filter */}
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 font-mono text-xs text-white/70 focus:outline-none focus:border-[#CC5500] cursor-pointer"
          >
            <option value="ALL" className="bg-[#181818]">All Tiers</option>
            <option value="QR_REGISTRY" className="bg-[#181818]">QR Registry</option>
            <option value="NTAG213_SERIALIZED" className="bg-[#181818]">NTAG213</option>
            <option value="NTAG215_SERIALIZED" className="bg-[#181818]">NTAG215</option>
            <option value="NTAG424_DNA" className="bg-[#181818]">NTAG424 DNA</option>
          </select>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/8 bg-white/2 font-mono text-[10px] text-white/40 uppercase tracking-wider">
              <th className="py-3 px-4 font-medium">SKU & Product Title</th>
              <th className="py-3 px-4 font-medium">Stock Capacity</th>
              <th className="py-3 px-4 font-medium">EIP-2981 Royalty</th>
              <th className="py-3 px-4 font-medium">Hardware Tier</th>
              <th className="py-3 px-4 font-medium">Co-Sign</th>
              <th className="py-3 px-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-xs">
            {filteredItems.map((item) => {
              const pct = item.maxStock > 0 ? (item.stock / item.maxStock) * 100 : 0;
              const isLow = pct < 25 && pct > 0;
              const isOut = item.stock === 0;

              return (
                <tr
                  key={item.id}
                  className="hover:bg-white/3 transition-colors group"
                >
                  {/* SKU & Title */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <MonoValue className="text-xs font-semibold text-cyan-300">
                        {item.sku}
                      </MonoValue>
                      <StatusBadge variant={item.status} className="scale-90 origin-left" />
                    </div>
                    <p className="text-xs text-white/80 font-medium mt-0.5 truncate max-w-xs">
                      {item.title}
                    </p>
                  </td>

                  {/* Stock Level Progress Bar */}
                  <td className="py-3.5 px-4 min-w-[140px]">
                    <div className="flex items-center justify-between font-mono text-[10px] text-white/50 mb-1">
                      <span>
                        <strong className="text-white">{item.stock}</strong> / {item.maxStock}
                      </span>
                      <span>{pct.toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-300",
                          isOut ? "bg-red-500" : isLow ? "bg-amber-500" : "bg-emerald-500",
                        )}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </td>

                  {/* Royalty Percentage */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5">
                      <MonoValue glow="orange" className="text-xs font-bold">
                        {(item.royaltyBps / 100).toFixed(1)}%
                      </MonoValue>
                      <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-orange-500/10 text-orange-300 border border-orange-500/20">
                        EIP-2981
                      </span>
                    </div>
                  </td>

                  {/* Hardware Tier */}
                  <td className="py-3.5 px-4">
                    <ChipTierBadge tier={item.chipTier} />
                  </td>

                  {/* Co-Sign Pill */}
                  <td className="py-3.5 px-4">
                    {item.coSignRequired ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 font-mono text-[9px] font-semibold">
                        <Shield className="w-2.5 h-2.5" />
                        Co-Sign Required
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-white/25">—</span>
                    )}
                  </td>

                  {/* Quick Action */}
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => onQueueChips(item)}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-orange-500/15 border border-white/10 hover:border-orange-500/30 text-[10px] font-mono text-white/60 hover:text-orange-300 transition-all cursor-pointer"
                      title="Queue additional NFC chips for encoding"
                    >
                      + Queue Chips
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </FrostedCard>
  );
}

// ─── Main Inventory & NFC Manager Component ──────────────────────────────────

export function InventoryManager() {
  const [inventory, setInventory] = useState<InventoryItem[]>(INVENTORY_ITEMS);
  const [chipQueue, setChipQueue] = useState<NfcChipEntry[]>(NFC_BATCH_QUEUE);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isEncodingBatch, setIsEncodingBatch] = useState(false);
  const [encodeSuccessNotice, setEncodeSuccessNotice] = useState(false);

  // Soft-Lock Cycle Handler: UNLOCKED -> PASSWORD_PROTECTED -> LOCKED_BITS
  const handleCycleLock = (uid: string) => {
    setChipQueue((prev) =>
      prev.map((chip) => {
        if (chip.uid !== uid) return chip;
        const currentNormalized: ChipLockState =
          chip.lockState === "LOCK_BITS_SET" ? "LOCKED_BITS" : chip.lockState;
        const currentIndex = LOCK_STATE_CYCLE.indexOf(currentNormalized);
        const nextState = LOCK_STATE_CYCLE[(currentIndex + 1) % LOCK_STATE_CYCLE.length];
        return { ...chip, lockState: nextState };
      }),
    );
  };

  // Ferrite Backing Toggle Handler
  const handleToggleFerrite = (uid: string) => {
    setChipQueue((prev) =>
      prev.map((chip) =>
        chip.uid === uid ? { ...chip, ferriteBacking: !chip.ferriteBacking } : chip,
      ),
    );
  };

  // Generate dynamic cryptographic CMAC for single chip
  const handleGenerateSingleCmac = (uid: string) => {
    const chars = "0123456789ABCDEF";
    let generatedCmac = "";
    for (let i = 0; i < 16; i++) {
      generatedCmac += chars[Math.floor(Math.random() * chars.length)];
    }

    setChipQueue((prev) =>
      prev.map((chip) =>
        chip.uid === uid
          ? {
              ...chip,
              cmac: generatedCmac,
              encodedAt: new Date().toISOString(),
              lockState: "PASSWORD_PROTECTED",
            }
          : chip,
      ),
    );
  };

  // Batch encode all pending chips
  const handleEncodeAllChips = () => {
    setIsEncodingBatch(true);
    setTimeout(() => {
      setChipQueue((prev) =>
        prev.map((chip) => {
          if (chip.cmac) return chip;
          const chars = "0123456789ABCDEF";
          let generatedCmac = "";
          for (let i = 0; i < 16; i++) {
            generatedCmac += chars[Math.floor(Math.random() * chars.length)];
          }
          return {
            ...chip,
            cmac: generatedCmac,
            encodedAt: new Date().toISOString(),
            lockState: "PASSWORD_PROTECTED",
          };
        }),
      );
      setIsEncodingBatch(false);
      setEncodeSuccessNotice(true);
      setTimeout(() => setEncodeSuccessNotice(false), 3000);
    }, 900);
  };

  // Add new registered product & auto-generate batch NFC chip entries
  const handleRegisterProduct = (newProduct: Omit<InventoryItem, "id" | "lastUpdated">) => {
    const newItem: InventoryItem = {
      ...newProduct,
      id: `inv_${Date.now()}`,
      lastUpdated: new Date().toISOString(),
    };

    setInventory((prev) => [newItem, ...prev]);

    // Auto-create initial chip batch entries for the new SKU
    const countToGenerate = Math.min(3, newProduct.stock || 2);
    const newChips: NfcChipEntry[] = [];
    const hex = "0123456789ABCDEF";

    for (let i = 0; i < countToGenerate; i++) {
      // Generate standard 7-byte UID starting with NXP 04:
      const uidParts = ["04"];
      for (let j = 0; j < 6; j++) {
        uidParts.push(hex[Math.floor(Math.random() * 16)] + hex[Math.floor(Math.random() * 16)]);
      }

      let generatedCmac = "";
      for (let k = 0; k < 16; k++) {
        generatedCmac += hex[Math.floor(Math.random() * 16)];
      }

      const isMetallic =
        newItem.sku.includes("CPR") || newItem.sku.includes("MTL") || newItem.sku.includes("BLT");

      newChips.push({
        uid: uidParts.join(":"),
        cmac: generatedCmac,
        tier: newItem.chipTier,
        assignedSku: newItem.sku,
        lockState: "PASSWORD_PROTECTED",
        ferriteBacking: isMetallic,
        encodedAt: new Date().toISOString(),
      });
    }

    setChipQueue((prev) => [...newChips, ...prev]);
  };

  // Queue additional chips for a given SKU
  const handleQueueChipsForSku = (item: InventoryItem) => {
    const hex = "0123456789ABCDEF";
    const uidParts = ["04"];
    for (let j = 0; j < 6; j++) {
      uidParts.push(hex[Math.floor(Math.random() * 16)] + hex[Math.floor(Math.random() * 16)]);
    }

    const isMetallic =
      item.sku.includes("CPR") || item.sku.includes("MTL") || item.sku.includes("BLT");

    const newChip: NfcChipEntry = {
      uid: uidParts.join(":"),
      cmac: "",
      tier: item.chipTier,
      assignedSku: item.sku,
      lockState: "UNLOCKED",
      ferriteBacking: isMetallic,
      encodedAt: null,
    };

    setChipQueue((prev) => [newChip, ...prev]);
  };

  // Check if any metallic product in batch queue lacks ferrite backing
  const unshieldedMetallicCount = chipQueue.filter((chip) => {
    const isMetallic =
      chip.assignedSku?.includes("CPR") ||
      chip.assignedSku?.includes("MTL") ||
      chip.assignedSku?.includes("BLT");
    return isMetallic && !chip.ferriteBacking;
  }).length;

  return (
    <div className="space-y-8 max-w-6xl pb-12">
      {/* Header & Registration CTA */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-wide">
              Inventory & NFC Management
            </h1>
            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-[#CC5500]/15 text-orange-300 border border-[#CC5500]/30 font-semibold uppercase tracking-wider">
              Studio Admin
            </span>
            <VersionReleaseBadge variant="pill" />
          </div>
          <p className="text-xs font-mono text-white/40 mt-1">
            Physical-to-digital inventory lifecycle · Dynamic SUN-CMAC encoding · EIP-2981 secondary royalty governance
          </p>
        </div>

        <button
          onClick={() => setDrawerOpen(true)}
          className="btn-cta flex items-center gap-2 text-xs uppercase tracking-wider font-bold shadow-[0_0_20px_rgba(204,85,0,0.35)] cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Register Product
        </button>
      </div>

      {/* Global Metallic Substrate Warning Banner */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-amber-300 font-mono uppercase tracking-wider">
              Substrate Warning: Ferrite shielding layer required for metal surfaces.
            </h4>
            <p className="text-xs text-amber-200/80 mt-0.5">
              NFC antennas detune when placed directly on conductive metals (Copper, Cold-Rolled Steel, Brass).
              Ensure a ferrite barrier is applied before cryptographic lock-bit flashing.
            </p>
          </div>
        </div>

        {unshieldedMetallicCount > 0 && (
          <span className="hidden sm:inline-flex px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold border border-amber-500/40">
            {unshieldedMetallicCount} Flawed Items
          </span>
        )}
      </div>

      {/* Section 1: SKU Matrix Table */}
      <SKUMatrixTable items={inventory} onQueueChips={handleQueueChipsForSku} />

      {/* Section 2: Batch NFC Chip Encoder Panel */}
      <div className="space-y-4">
        {/* Encoder Panel Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Batch NFC Chip Encoder Panel
              </h2>
              <p className="text-[11px] font-mono text-white/35">
                Dynamic AES-128 CMAC synthesis & soft-lock state cycling
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {encodeSuccessNotice && (
              <span className="flex items-center gap-1 font-mono text-xs text-emerald-400 animate-fade-in">
                <CheckCircle2 className="w-3.5 h-3.5" /> Batch Encoded Successfully
              </span>
            )}

            <button
              onClick={handleEncodeAllChips}
              disabled={isEncodingBatch}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-xs font-mono text-cyan-300 font-semibold transition-all cursor-pointer disabled:opacity-50"
            >
              <Zap className={cn("w-3.5 h-3.5 text-cyan-400", isEncodingBatch && "animate-spin")} />
              <span>{isEncodingBatch ? "Deriving CMACs..." : "Batch Encode All"}</span>
            </button>
          </div>
        </div>

        {/* Visual Matrix Grid of Batch Chips */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {chipQueue.map((chip, i) => (
            <ChipEncoderCard
              key={chip.uid}
              chip={chip}
              index={i}
              onCycleLock={handleCycleLock}
              onToggleFerrite={handleToggleFerrite}
              onGenerateCmac={handleGenerateSingleCmac}
            />
          ))}
        </div>
      </div>

      {/* Product Registration Slide-Over Drawer */}
      <ProductRegistrationDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onRegisterProduct={handleRegisterProduct}
      />
    </div>
  );
}
