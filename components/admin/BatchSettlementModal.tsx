// components/admin/BatchSettlementModal.tsx
"use client";

import { useMemo } from "react";
import { Download, PackageCheck, DollarSign, Cpu } from "lucide-react";
import { ModalShell } from "@digitalcanopy/ui";
import type { InventoryItem, NfcChipEntry } from "@/lib/mock/adminData";
import {
  buildBatchManifestOrders,
  calculateBatchSettlement,
  generatePirateShipCsv,
  generateNfcTagManifestCsv,
  downloadCsvFile,
  type GarmentSize,
} from "@/lib/utils/exportBatchManifest";

interface BatchSettlementModalProps {
  item: InventoryItem | null;
  chips: NfcChipEntry[];
  onClose: () => void;
}

const SIZE_ORDER: GarmentSize[] = ["S", "M", "L", "XL", "XXL"];

export function BatchSettlementModal({
  item,
  chips,
  onClose,
}: BatchSettlementModalProps) {
  const orders = useMemo(
    () => (item ? buildBatchManifestOrders(item, chips) : []),
    [item, chips],
  );

  const summary = useMemo(
    () => (item ? calculateBatchSettlement(item, orders) : null),
    [item, orders],
  );

  if (!item || !summary) return null;

  const batchSlug = item.sku.toLowerCase().replace(/[^a-z0-9-]+/g, "-");

  const handleDownloadPirateShip = () => {
    const csv = generatePirateShipCsv(orders);
    downloadCsvFile(`pirateship-labels-${batchSlug}.csv`, csv);
  };

  const handleDownloadNfcManifest = () => {
    const csv = generateNfcTagManifestCsv(orders);
    downloadCsvFile(`nfc-tag-manifest-${batchSlug}.csv`, csv);
  };

  return (
    <ModalShell
      isOpen={Boolean(item)}
      onClose={onClose}
      title="Batch Lock Summary & Fulfillment Export"
      subtitle={`${item.sku} · ${item.title} · ${summary.unitsSold} Units Locked`}
      icon={<PackageCheck className="w-4 h-4 text-[#CC5500]" />}
      closeAriaLabel="Close settlement modal"
      className="w-full max-w-2xl rounded-2xl bg-[#151515] border border-white/10 shadow-2xl overflow-hidden text-[#F9F9F9] flex flex-col"
      headerClassName="px-5 py-4 border-b border-white/10 bg-[#121212]"
      bodyClassName="p-5 space-y-5 overflow-y-auto"
    >
      {/* 1. Screenprinter Size Breakdown Table */}
      <div className="space-y-2">
        <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-orange-300">
          01 // Print Shop Size Breakdown Table
        </h3>
        <div className="grid grid-cols-5 gap-2">
          {SIZE_ORDER.map((sz) => (
            <div
              key={sz}
              className="p-3 rounded-xl bg-black/50 border border-white/10 text-center"
            >
              <span className="block font-mono text-[10px] text-white/45">{sz}</span>
              <span className="block font-mono text-lg font-extrabold text-white mt-0.5">
                {summary.sizeBreakdown[sz]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Financial Settlement Card */}
      <div className="p-4 rounded-xl bg-white/4 border border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#22D3EE] flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5" />
            <span>02 // Financial Settlement Breakdown</span>
          </h3>
          <span className="font-mono text-[10px] text-white/45">
            2% ($0.05 min) + 80/20 Surplus
          </span>
        </div>

        <div className="space-y-2 font-mono text-xs">
          <div className="flex justify-between text-white/75">
            <span>
              Gross Base Sales ({summary.unitsSold} × ${summary.basePriceDollars.toFixed(2)})
            </span>
            <span className="text-white font-semibold">
              ${summary.grossBaseSales.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-white/60">
            <span>Base Platform Fee (2% / $0.05 min)</span>
            <span className="text-red-300">-${summary.basePlatformFee.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-white/75">
            <span>Auction / Vanity Surplus Delta</span>
            <span className="text-cyan-300">+${summary.surplusDelta.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-white/60">
            <span>Creator Surplus Share (80%) vs Platform Fee (20%)</span>
            <span>
              <strong className="text-emerald-300">
                +${summary.creatorSurplusShare.toFixed(2)}
              </strong>{" "}
              / ${summary.platformSurplusFee.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between pt-2 border-t border-white/10 text-sm font-bold">
            <span className="text-orange-200">Net Vendor Payout</span>
            <span className="text-emerald-400">${summary.netVendorPayout.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* 3. CSV Export Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <button
          type="button"
          onClick={handleDownloadPirateShip}
          disabled={orders.length === 0}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#CC5500] hover:bg-[#e0621a] disabled:opacity-40 font-mono text-xs font-bold text-white shadow-[0_0_20px_rgba(204,85,0,0.3)] cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Export Pirate Ship CSV</span>
        </button>

        <button
          type="button"
          onClick={handleDownloadNfcManifest}
          disabled={orders.length === 0}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 disabled:opacity-40 border border-cyan-500/40 font-mono text-xs font-bold text-cyan-200 cursor-pointer"
        >
          <Cpu className="w-4 h-4" />
          <span>Export NFC Tag Manifest CSV</span>
        </button>
      </div>
    </ModalShell>
  );
}
