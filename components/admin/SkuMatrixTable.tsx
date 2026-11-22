// components/admin/SkuMatrixTable.tsx
"use client";

import { useState } from "react";
import {
  Layers,
  Search,
  Shield,
  CopyPlus,
  GitBranch,
  FileSpreadsheet,
  Plus,
} from "lucide-react";
import { FrostedCard } from "@/components/ui/FrostedCard";
import { MonoValue } from "@/components/ui/MonoValue";
import { StatusBadge, ChipTierBadge } from "@/components/ui/StatusBadge";
import type { InventoryItem } from "@/lib/mock/adminData";
import { cn } from "@/lib/utils";

interface SkuMatrixTableProps {
  items: InventoryItem[];
  onQueueChips: (item: InventoryItem) => void;
  onOpenRegister: () => void;
  onCloneItem: (item: InventoryItem) => void;
  onGraduateItem: (item: InventoryItem) => void;
  onOpenManifest: (item: InventoryItem) => void;
}

export function SkuMatrixTable({
  items,
  onQueueChips,
  onOpenRegister,
  onCloneItem,
  onGraduateItem,
  onOpenManifest,
}: SkuMatrixTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("ALL");

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTier = tierFilter === "ALL" || item.chipTier === tierFilter;
    return matchesSearch && matchesTier;
  });

  return (
    <FrostedCard noPadding className="overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-white/8 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              SKU Matrix &amp; Hardware Provenance
            </h2>
            <p className="text-[11px] font-mono text-white/35">
              Active Studio Drop Inventory ({items.length} Total)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-white/30 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search SKU or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg bg-white/5 border border-white/10 font-mono text-xs text-white placeholder:text-white/25 focus:outline-none focus:border-orange-500/50"
            />
          </div>

          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            aria-label="Filter by chip tier"
            className="px-2.5 py-1.5 rounded-lg bg-[#1C1C1C] border border-white/10 font-mono text-xs text-white/80 focus:outline-none focus:border-orange-500/50"
          >
            <option value="ALL">All Hardware Tiers</option>
            <option value="NTAG424_DNA">NTAG424 DNA</option>
            <option value="NTAG215_SERIALIZED">NTAG215 Serial</option>
            <option value="NTAG213_SERIALIZED">NTAG213 Serial</option>
            <option value="QR_REGISTRY">QR Registry</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/8 bg-white/[0.02] font-mono text-[10px] uppercase tracking-wider text-white/40">
              <th className="py-3 px-4">SKU / Drop Title</th>
              <th className="py-3 px-4">Stock / Batch</th>
              <th className="py-3 px-4">Royalty</th>
              <th className="py-3 px-4">Hardware Tier</th>
              <th className="py-3 px-4">Co-Sign</th>
              <th className="py-3 px-4 text-right">Actions &amp; Fulfillment</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-xs">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 px-6 text-center">
                  <div className="max-w-sm mx-auto space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
                      <Layers className="w-5 h-5 text-orange-400" />
                    </div>
                    <p className="text-sm font-semibold text-white">
                      Register your first physical piece or batch
                    </p>
                    <p className="text-xs font-mono text-white/40 leading-relaxed">
                      Bind serialized QR codes, NTAG213 apparel tags, or NTAG424 DNA silicon to your studio inventory.
                    </p>
                    <button
                      type="button"
                      onClick={onOpenRegister}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#CC5500] hover:bg-[#e0621a] font-mono text-xs font-bold text-white cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Register First Drop</span>
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => {
                const pct = item.maxStock > 0 ? (item.stock / item.maxStock) * 100 : 0;
                const isLow = pct < 25 && pct > 0;
                const isOut = item.stock === 0;

                return (
                  <tr key={item.id} className="hover:bg-white/3 transition-colors group">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <MonoValue className="text-xs font-semibold text-cyan-300">
                          {item.sku}
                        </MonoValue>
                        <StatusBadge variant={item.status} className="scale-90 origin-left" />
                        <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-[9px] text-white/70">
                          {item.versionTag || "v1.0"}
                        </span>
                      </div>
                      <p className="text-xs text-white/80 font-medium mt-0.5 truncate max-w-xs">
                        {item.title}
                      </p>
                      {item.artistAttribution && (
                        <p className="font-mono text-[10px] text-purple-300 mt-0.5">
                          {item.artistAttribution}
                        </p>
                      )}
                    </td>

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

                    <td className="py-3.5 px-4">
                      <ChipTierBadge tier={item.chipTier} />
                    </td>

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

                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onCloneItem(item)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-mono text-white/75 hover:text-white cursor-pointer"
                          title="Duplicate drop pricing, chip tier, and batch settings"
                        >
                          <CopyPlus className="w-3 h-3 text-cyan-300" />
                          <span>Clone</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onGraduateItem(item)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-[10px] font-mono text-purple-200 cursor-pointer"
                          title="Graduate v1.0 drop to v2.0 Artist Edition"
                        >
                          <GitBranch className="w-3 h-3" />
                          <span>Graduate to v2.0</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onOpenManifest(item)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#CC5500]/15 hover:bg-[#CC5500]/25 border border-[#CC5500]/35 text-[10px] font-mono text-orange-200 cursor-pointer"
                          title="Open batch lock summary and export Pirate Ship / NFC CSV"
                        >
                          <FileSpreadsheet className="w-3 h-3 text-[#CC5500]" />
                          <span>Print &amp; Ship Manifest</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onQueueChips(item)}
                          className="px-2 py-1 rounded-lg bg-white/5 hover:bg-orange-500/15 border border-white/10 hover:border-orange-500/30 text-[10px] font-mono text-white/60 hover:text-orange-300 transition-all cursor-pointer"
                          title="Queue additional NFC chips for encoding"
                        >
                          + Queue Chips
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </FrostedCard>
  );
}
