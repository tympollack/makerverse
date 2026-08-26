// lib/mock/adminData.ts
// Realistic mock data for the Makerverse Vendor Admin modules

import { type ChipTier } from "./shopData";

// ─── Ecosystem Telemetry ──────────────────────────────────────────────────────

export const TELEMETRY = {
  activeFollowers: 1_847,
  secondaryRoyaltiesTotal: 284_50, // cents
  secondaryRoyaltiesThisMonth: 63_20,
  edgeNodeStatus: "CONNECTED" as "CONNECTED" | "DEGRADED" | "OFFLINE",
  edgeNodeLatencyMs: 42,
  pendingMints: 3,
  activeSessions: 11,
};

// ─── Inventory Items ──────────────────────────────────────────────────────────

export type StockStatus = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";

export interface InventoryItem {
  id: string;
  sku: string;
  title: string;
  stock: number;
  maxStock: number;
  royaltyBps: number;
  chipTier: ChipTier;
  coSignRequired: boolean;
  status: StockStatus;
  lastUpdated: string;
}

export const INVENTORY_ITEMS: InventoryItem[] = [
  {
    id: "inv_001",
    sku: "FC-BLT-K1-001",
    title: "Blackened Copper Keyring — Gen 1",
    stock: 7,
    maxStock: 24,
    royaltyBps: 750,
    chipTier: "NTAG424_DNA",
    coSignRequired: true,
    status: "IN_STOCK",
    lastUpdated: "2026-08-21T09:14:00-04:00",
  },
  {
    id: "inv_002",
    sku: "FC-LTH-WLT-003",
    title: "Bridle Leather Bifold — Horween #003",
    stock: 3,
    maxStock: 12,
    royaltyBps: 1000,
    chipTier: "NTAG215_SERIALIZED",
    coSignRequired: false,
    status: "LOW_STOCK",
    lastUpdated: "2026-08-21T11:42:00-04:00",
  },
  {
    id: "inv_003",
    sku: "FC-MTL-PNT-007",
    title: 'Makers Pennant — 3" Steel Stamp',
    stock: 19,
    maxStock: 50,
    royaltyBps: 500,
    chipTier: "QR_REGISTRY",
    coSignRequired: false,
    status: "IN_STOCK",
    lastUpdated: "2026-08-20T16:05:00-04:00",
  },
  {
    id: "inv_004",
    sku: "FC-CPR-CFF-LNK-011",
    title: "Copper Coffee Link Bracelet",
    stock: 0,
    maxStock: 18,
    royaltyBps: 750,
    chipTier: "NTAG213_SERIALIZED",
    coSignRequired: false,
    status: "OUT_OF_STOCK",
    lastUpdated: "2026-08-19T08:30:00-04:00",
  },
  {
    id: "inv_005",
    sku: "FC-LTH-KEY-FOB-019",
    title: "Veg-Tan Key Fob — NTAG424",
    stock: 11,
    maxStock: 30,
    royaltyBps: 750,
    chipTier: "NTAG424_DNA",
    coSignRequired: true,
    status: "IN_STOCK",
    lastUpdated: "2026-08-21T07:55:00-04:00",
  },
];

// ─── NFC Chip Batch Queue ─────────────────────────────────────────────────────

export type ChipLockState = "UNLOCKED" | "PASSWORD_PROTECTED" | "LOCK_BITS_SET";

export interface NfcChipEntry {
  uid: string;
  cmac: string;
  tier: ChipTier;
  assignedSku: string | null;
  lockState: ChipLockState;
  ferriteBacking: boolean;
  encodedAt: string | null;
}

export const NFC_BATCH_QUEUE: NfcChipEntry[] = [
  {
    uid: "04:A3:F2:11:8E:2C:80",
    cmac: "3A9F1C2E4B8D7F60",
    tier: "NTAG424_DNA",
    assignedSku: "FC-BLT-K1-001",
    lockState: "PASSWORD_PROTECTED",
    ferriteBacking: true,
    encodedAt: "2026-08-21T08:00:00-04:00",
  },
  {
    uid: "04:B7:E1:22:3D:4A:91",
    cmac: "C1A2B3D4E5F67890",
    tier: "NTAG424_DNA",
    assignedSku: "FC-LTH-KEY-FOB-019",
    lockState: "PASSWORD_PROTECTED",
    ferriteBacking: false,
    encodedAt: "2026-08-21T08:02:00-04:00",
  },
  {
    uid: "04:C9:D0:33:1F:5B:A2",
    cmac: "",
    tier: "NTAG215_SERIALIZED",
    assignedSku: "FC-LTH-WLT-003",
    lockState: "UNLOCKED",
    ferriteBacking: false,
    encodedAt: null,
  },
  {
    uid: "04:D2:88:44:6C:7E:B3",
    cmac: "",
    tier: "NTAG213_SERIALIZED",
    assignedSku: null,
    lockState: "UNLOCKED",
    ferriteBacking: false,
    encodedAt: null,
  },
  {
    uid: "04:E5:F3:55:2A:9D:C4",
    cmac: "FF00AA11CC22DD33",
    tier: "NTAG424_DNA",
    assignedSku: "FC-BLT-K1-001",
    lockState: "LOCK_BITS_SET",
    ferriteBacking: true,
    encodedAt: "2026-08-20T14:30:00-04:00",
  },
];

// ─── Active Hold Reservations ─────────────────────────────────────────────────

export type HoldState = "ACTIVE_HOLD" | "PAYMENT_RETRYING" | "EXPIRED_RELEASE";

export interface HoldEntry {
  holdId: string;
  redisKey: string;
  productId: string;
  productTitle: string;
  sku: string;
  buyerHandle: string;
  buyerAddress: string;
  createdAt: number; // unix timestamp (ms)
  expiresAt: number; // unix timestamp (ms)
  ttlSeconds: number; // initial TTL
  state: HoldState;
  retryCount?: number;
}

const NOW = Date.now();

export const ACTIVE_HOLDS: HoldEntry[] = [
  {
    holdId: "hold_7f3a1b2c-d4e5-4f6a-8b9c-0d1e2f3a4b5c",
    redisKey: "makerverse:hold:7f3a1b2c-d4e5-4f6a-8b9c-0d1e2f3a4b5c",
    productId: "prod_001",
    productTitle: "Blackened Copper Keyring — Gen 1",
    sku: "FC-BLT-K1-001",
    buyerHandle: "@ironwood_maren",
    buyerAddress: "0x8f2A...1cD9",
    createdAt: NOW - 120_000, // 2 min ago
    expiresAt: NOW + 480_000, // 8 min remaining
    ttlSeconds: 600,
    state: "ACTIVE_HOLD",
  },
  {
    holdId: "hold_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    redisKey: "makerverse:hold:a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    productId: "prod_002",
    productTitle: "Bridle Leather Bifold — Horween #003",
    sku: "FC-LTH-WLT-003",
    buyerHandle: "@threadline_co",
    buyerAddress: "0x3cB7...F440",
    createdAt: NOW - 480_000,
    expiresAt: NOW + 120_000, // 2 min remaining — almost expired
    ttlSeconds: 600,
    state: "PAYMENT_RETRYING",
    retryCount: 2,
  },
  {
    holdId: "hold_dead1234-cafe-babe-feed-000000000001",
    redisKey: "makerverse:hold:dead1234-cafe-babe-feed-000000000001",
    productId: "prod_005",
    productTitle: "Veg-Tan Key Fob — NTAG424",
    sku: "FC-LTH-KEY-FOB-019",
    buyerHandle: "@grove_supply",
    buyerAddress: "0x9Ea1...2cF3",
    createdAt: NOW - 620_000,
    expiresAt: NOW - 20_000, // expired 20s ago
    ttlSeconds: 600,
    state: "EXPIRED_RELEASE",
  },
  {
    holdId: "hold_ffff0000-aaaa-bbbb-cccc-ddddeeee1111",
    redisKey: "makerverse:hold:ffff0000-aaaa-bbbb-cccc-ddddeeee1111",
    productId: "prod_006",
    productTitle: "Ranger Belt Buckle — Brass",
    sku: "FC-MTL-BKL-RNCH-022",
    buyerHandle: "@solstice_made",
    buyerAddress: "0x1Ab9...88D2",
    createdAt: NOW - 30_000,
    expiresAt: NOW + 570_000, // 9.5 min remaining
    ttlSeconds: 600,
    state: "ACTIVE_HOLD",
  },
];

// ─── POS Transaction Log ──────────────────────────────────────────────────────

export type POSMode = "HIGH_TOUCH" | "LOW_TOUCH";
export type TxStatus =
  | "MINT_PENDING"
  | "MINT_COMPLETE"
  | "UNCLAIMED"
  | "BATCH_QUEUED";

export interface POSTransaction {
  txId: string;
  mode: POSMode;
  productTitle: string;
  sku: string;
  price: number;
  buyerHandle: string | null;
  chipUid: string;
  status: TxStatus;
  timestamp: string;
  nfcTapped: boolean;
  qrScanned: boolean;
}

export const POS_TRANSACTIONS: POSTransaction[] = [
  {
    txId: "pos_tx_001",
    mode: "HIGH_TOUCH",
    productTitle: "Blackened Copper Keyring — Gen 1",
    sku: "FC-BLT-K1-001",
    price: 4800,
    buyerHandle: "@dustpan_studios",
    chipUid: "04:A3:F2:11:8E:2C:80",
    status: "MINT_COMPLETE",
    timestamp: "2026-08-21T13:24:00-04:00",
    nfcTapped: true,
    qrScanned: true,
  },
  {
    txId: "pos_tx_002",
    mode: "LOW_TOUCH",
    productTitle: 'Makers Pennant — 3" Steel Stamp',
    sku: "FC-MTL-PNT-007",
    price: 2200,
    buyerHandle: null,
    chipUid: "04:C9:D0:33:1F:5B:A2",
    status: "UNCLAIMED",
    timestamp: "2026-08-21T13:51:00-04:00",
    nfcTapped: false,
    qrScanned: false,
  },
  {
    txId: "pos_tx_003",
    mode: "HIGH_TOUCH",
    productTitle: "Veg-Tan Key Fob — NTAG424",
    sku: "FC-LTH-KEY-FOB-019",
    price: 2800,
    buyerHandle: "@ironwood_maren",
    chipUid: "04:B7:E1:22:3D:4A:91",
    status: "MINT_PENDING",
    timestamp: "2026-08-21T14:02:00-04:00",
    nfcTapped: true,
    qrScanned: false,
  },
  {
    txId: "pos_tx_004",
    mode: "LOW_TOUCH",
    productTitle: 'Makers Pennant — 3" Steel Stamp',
    sku: "FC-MTL-PNT-007",
    price: 2200,
    buyerHandle: null,
    chipUid: "04:D2:88:44:6C:7E:B3",
    status: "BATCH_QUEUED",
    timestamp: "2026-08-21T14:08:00-04:00",
    nfcTapped: false,
    qrScanned: false,
  },
];
