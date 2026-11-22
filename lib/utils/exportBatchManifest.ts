// lib/utils/exportBatchManifest.ts
import { IS_MOCK_ENABLED, type InventoryItem, type NfcChipEntry } from "@/lib/mock/adminData";

export type GarmentSize = "S" | "M" | "L" | "XL" | "XXL";

export interface BatchOrderRow {
  serialNumber: number;
  editionDenominator: number;
  size: GarmentSize;
  recipientName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  holderHandle: string;
  claimStatus: "MINTED_INITIAL" | "UNCLAIMED" | "LOCKED_BITS";
  paidDollars: number;
}

export interface BatchSettlementSummary {
  unitsSold: number;
  basePriceDollars: number;
  grossBaseSales: number;
  basePlatformFee: number;
  surplusDelta: number;
  creatorSurplusShare: number;
  platformSurplusFee: number;
  netVendorPayout: number;
  sizeBreakdown: Record<GarmentSize, number>;
}

const SIZES: GarmentSize[] = ["S", "M", "L", "XL", "XXL"];

function escapeCsvField(value: string | number): string {
  const str = String(value ?? "");
  const safe = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
  if (/[",\n\r]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

export function formatAssignedSerial(serialNumber: number, denominator: number): string {
  const padded = String(serialNumber).padStart(3, "0");
  return `#${padded}/${denominator}`;
}

/**
 * Returns finalized order rows when provided, or synthetic preview rows ONLY
 * when IS_MOCK_ENABLED is true in dev/test. Production never fabricates orders.
 */
export function buildBatchManifestOrders(
  item: InventoryItem,
  chips: NfcChipEntry[] = [],
  realOrders?: BatchOrderRow[],
): { orders: BatchOrderRow[]; isSimulatedPreview: boolean } {
  if (Array.isArray(realOrders)) {
    return { orders: realOrders, isSimulatedPreview: false };
  }

  if (!IS_MOCK_ENABLED) {
    return { orders: [], isSimulatedPreview: false };
  }

  const soldCount = Math.max(0, item.maxStock - item.stock);
  if (soldCount === 0) {
    return { orders: [], isSimulatedPreview: false };
  }

  const matchedChips = chips.filter((c) => c.assignedSku === item.sku);
  const basePriceDollars = (item.priceCents ?? 2500) / 100;
  const denominator = item.maxStock > 0 ? item.maxStock : soldCount;
  const sizeCycle: GarmentSize[] = ["L", "M", "XL", "S", "XXL"];

  const orders: BatchOrderRow[] = Array.from({ length: soldCount }, (_, idx) => {
    const serialNumber = idx + 1;
    const chip = matchedChips[idx];
    const isAuctionWinner = serialNumber === 69 || (idx === 0 && soldCount >= 3);
    const surplus = isAuctionWinner ? 44 : idx % 5 === 0 ? 5 : 0;

    return {
      serialNumber,
      editionDenominator: denominator,
      size: sizeCycle[idx % sizeCycle.length],
      recipientName: `Demo Collector #${String(serialNumber).padStart(3, "0")}`,
      address: `${100 + serialNumber} Craft Foundry Way`,
      city: "Portland",
      state: "OR",
      zip: "97209",
      holderHandle: `@collector_${String(serialNumber).padStart(3, "0")}`,
      claimStatus: chip?.encodedAt ? "MINTED_INITIAL" : "UNCLAIMED",
      paidDollars: basePriceDollars + surplus,
    };
  });

  return { orders, isSimulatedPreview: true };
}

export function calculateBatchSettlement(
  item: InventoryItem,
  orders: BatchOrderRow[],
): BatchSettlementSummary {
  const basePriceDollars = (item.priceCents ?? 2500) / 100;
  const unitsSold = orders.length;
  const grossBaseSales = Number((unitsSold * basePriceDollars).toFixed(2));
  const perUnitFee = Math.max(0.05, Number((basePriceDollars * 0.02).toFixed(4)));
  const basePlatformFee = Number((unitsSold * perUnitFee).toFixed(2));

  const totalCollected = orders.reduce((acc, o) => acc + o.paidDollars, 0);
  const surplusDelta = Number(Math.max(0, totalCollected - grossBaseSales).toFixed(2));
  const creatorSurplusShare = Number((surplusDelta * 0.8).toFixed(2));
  const platformSurplusFee = Number((surplusDelta * 0.2).toFixed(2));
  const netVendorPayout = Number(
    (grossBaseSales - basePlatformFee + creatorSurplusShare).toFixed(2),
  );

  const sizeBreakdown: Record<GarmentSize, number> = {
    S: 0,
    M: 0,
    L: 0,
    XL: 0,
    XXL: 0,
  };
  for (const order of orders) {
    if (SIZES.includes(order.size)) {
      sizeBreakdown[order.size] += 1;
    }
  }

  return {
    unitsSold,
    basePriceDollars,
    grossBaseSales,
    basePlatformFee,
    surplusDelta,
    creatorSurplusShare,
    platformSurplusFee,
    netVendorPayout,
    sizeBreakdown,
  };
}

export function generatePirateShipCsv(orders: BatchOrderRow[]): string {
  const header = "Recipient Name,Address,City,State,Zip,Size,Assigned Serial";
  const lines = orders.map((o) =>
    [
      o.recipientName,
      o.address,
      o.city,
      o.state,
      o.zip,
      o.size,
      formatAssignedSerial(o.serialNumber, o.editionDenominator),
    ]
      .map(escapeCsvField)
      .join(","),
  );
  return [header, ...lines].join("\n");
}

export function generateNfcTagManifestCsv(orders: BatchOrderRow[]): string {
  const header = "Serial Number,Edition Denominator,Holder Handle/Email,Claim Status";
  const lines = orders.map((o) =>
    [
      `#${String(o.serialNumber).padStart(3, "0")}`,
      o.editionDenominator,
      o.holderHandle,
      o.claimStatus,
    ]
      .map(escapeCsvField)
      .join(","),
  );
  return [header, ...lines].join("\n");
}

export function downloadCsvFile(filename: string, csvContent: string): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
