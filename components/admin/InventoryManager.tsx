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
  CheckCircle2,
  Copy,
  Check,
  Zap,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { FrostedCard } from "@/components/ui/FrostedCard";
import { ChipTierBadge } from "@/components/ui/StatusBadge";
import { ProductRegistrationDrawer } from "@/components/admin/ProductRegistrationDrawer";
import { SkuMatrixTable } from "@/components/admin/SkuMatrixTable";
import { BatchSettlementModal } from "@/components/admin/BatchSettlementModal";
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

// ─── Main Inventory & NFC Manager Component ──────────────────────────────────

export function InventoryManager({
  initialItems = INVENTORY_ITEMS,
  initialChips = NFC_BATCH_QUEUE,
}: {
  initialItems?: InventoryItem[];
  initialChips?: NfcChipEntry[];
} = {}) {
  const [inventory, setInventory] = useState<InventoryItem[]>(initialItems);
  const [chipQueue, setChipQueue] = useState<NfcChipEntry[]>(initialChips);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [draftKey, setDraftKey] = useState(0);
  const [draftTemplate, setDraftTemplate] = useState<Partial<InventoryItem> | null>(null);
  const [manifestItem, setManifestItem] = useState<InventoryItem | null>(null);
  const [isEncodingBatch, setIsEncodingBatch] = useState(false);
  const [encodeSuccessNotice, setEncodeSuccessNotice] = useState(false);

  const handleOpenFreshRegister = () => {
    setDraftTemplate(null);
    setDraftKey((k) => k + 1);
    setDrawerOpen(true);
  };

  const handleCloneItem = (item: InventoryItem) => {
    setDraftTemplate({
      title: `${item.title} (Copy)`,
      sku: `${item.sku}-CLN`,
      stock: item.maxStock,
      maxStock: item.maxStock,
      priceCents: item.priceCents ?? 2500,
      royaltyBps: item.royaltyBps,
      chipTier: item.chipTier,
      coSignRequired: item.coSignRequired,
      versionTag: item.versionTag ?? "v1.0",
      frontChestStamp: item.frontChestStamp,
      backStatement: item.backStatement,
    });
    setDraftKey((k) => k + 1);
    setDrawerOpen(true);
  };

  const handleGraduateItem = (item: InventoryItem) => {
    setDraftTemplate({
      title: `${item.title.replace(/\s*\(v2\.0\)$/i, "")} (v2.0)`,
      sku: `${item.sku}-V2`,
      stock: item.maxStock,
      maxStock: item.maxStock,
      priceCents: item.priceCents ?? 2500,
      royaltyBps: item.royaltyBps,
      chipTier: item.chipTier,
      coSignRequired: true,
      versionTag: "v2.0",
      artistAttribution: item.artistAttribution ?? "",
      parentSku: item.sku,
      frontChestStamp: item.frontChestStamp,
      backStatement: item.backStatement,
    });
    setDraftKey((k) => k + 1);
    setDrawerOpen(true);
  };

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
          onClick={handleOpenFreshRegister}
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
      <SkuMatrixTable
        items={inventory}
        onQueueChips={handleQueueChipsForSku}
        onOpenRegister={handleOpenFreshRegister}
        onCloneItem={handleCloneItem}
        onGraduateItem={handleGraduateItem}
        onOpenManifest={(item) => setManifestItem(item)}
      />

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
        {chipQueue.length === 0 ? (
          <FrostedCard className="p-8 text-center space-y-2">
            <Cpu className="w-8 h-8 text-cyan-400/40 mx-auto" />
            <p className="text-sm font-semibold text-white/80">
              No NFC chips queued for encoding
            </p>
            <p className="text-xs font-mono text-white/40 max-w-md mx-auto">
              Register your first physical piece or batch above to queue NTAG213 or NTAG424 DNA hardware tags.
            </p>
          </FrostedCard>
        ) : (
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
        )}
      </div>

      {/* Product Registration Slide-Over Drawer */}
      <ProductRegistrationDrawer
        key={draftKey}
        isOpen={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setDraftTemplate(null);
        }}
        onRegisterProduct={handleRegisterProduct}
        initialDraft={draftTemplate}
      />

      {/* Batch Settlement & Pirate Ship / NFC Manifest Export Modal */}
      <BatchSettlementModal
        item={manifestItem}
        chips={chipQueue}
        onClose={() => setManifestItem(null)}
      />
    </div>
  );
}
