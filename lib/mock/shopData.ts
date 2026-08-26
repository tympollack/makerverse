// lib/mock/shopData.ts
// Realistic mock data for the Makerverse public shop prototype

export type ChipTier =
  | "QR_REGISTRY"
  | "NTAG213_SERIALIZED"
  | "NTAG215_SERIALIZED"
  | "NTAG424_DNA";

export interface Product {
  id: string;
  sku: string;
  title: string;
  description: string;
  price: number;
  stock: number;
  maxStock: number;
  demandSignals: number; // "Signal Interest" count
  chipTier: ChipTier;
  imageUrl: string;
  tags: string[];
  isFollowed: boolean;
  royaltyBps: number; // basis points, e.g. 750 = 7.5%
}

export interface BrandPassport {
  id: string;
  handle: string;
  name: string;
  bio: string;
  avatarUrl: string;
  bannerUrl: string;
  isVerified: boolean;
  ledgerAddress: string;
  followerCount: number;
  productCount: number;
  totalRoyaltiesEarned: number; // USD cents
  memberSince: string;
  tags: string[];
}

export interface ShoppablePost {
  id: string;
  imageUrl: string;
  caption: string;
  location: string;
  timestamp: string;
  pins: Array<{
    id: string;
    productId: string;
    x: number; // percentage from left
    y: number; // percentage from top
  }>;
}

// ─── Brand ───────────────────────────────────────────────────────────────────

export const BRAND_PASSPORT: BrandPassport = {
  id: "brand_forge_collective_01",
  handle: "forge-collective",
  name: "The Forge Collective",
  bio: "Small-batch metalwork & leather goods forged in Portland, OR. Every piece carries a chip — every chip tells a story. NFC provenance on all heritage-tier items.",
  avatarUrl: "/mock/forge-avatar.jpg",
  bannerUrl: "/mock/forge-banner.jpg",
  isVerified: true,
  ledgerAddress: "0x4f3E...9aB2",
  followerCount: 1_847,
  productCount: 34,
  totalRoyaltiesEarned: 284_50, // $284.50
  memberSince: "2024-03",
  tags: ["metalwork", "leather", "NFC-provenance", "handcrafted"],
};

// ─── Products ─────────────────────────────────────────────────────────────────

export const PRODUCTS: Product[] = [
  {
    id: "prod_001",
    sku: "FC-BLT-K1-001",
    title: "Blackened Copper Keyring — Gen 1",
    description:
      "Hand-forged copper ring with darkened patina finish. NTAG424 DNA embedded in a recessed ferrite cavity.",
    price: 4800, // cents → $48.00
    stock: 7,
    maxStock: 24,
    demandSignals: 42,
    chipTier: "NTAG424_DNA",
    imageUrl: "/mock/keyring.jpg",
    tags: ["copper", "keyring", "EDC"],
    isFollowed: false,
    royaltyBps: 750,
  },
  {
    id: "prod_002",
    sku: "FC-LTH-WLT-003",
    title: "Bridle Leather Bifold — Horween #003",
    description:
      "Full-grain Horween Dublin leather. Hand-stitched with waxed linen thread. NTAG215 serialized with lot provenance.",
    price: 11500,
    stock: 3,
    maxStock: 12,
    demandSignals: 28,
    chipTier: "NTAG215_SERIALIZED",
    imageUrl: "/mock/wallet.jpg",
    tags: ["leather", "wallet", "horween"],
    isFollowed: true,
    royaltyBps: 1000,
  },
  {
    id: "prod_003",
    sku: "FC-MTL-PNT-007",
    title: 'Makers Pennant — 3" Steel Stamp',
    description:
      "Laser-cut 16-gauge steel stamp, mill-scale finish. QR code registry linking to maker certificate.",
    price: 2200,
    stock: 19,
    maxStock: 50,
    demandSignals: 11,
    chipTier: "QR_REGISTRY",
    imageUrl: "/mock/pennant.jpg",
    tags: ["steel", "stamp", "pennant", "home-goods"],
    isFollowed: false,
    royaltyBps: 500,
  },
  {
    id: "prod_004",
    sku: "FC-CPR-CFF-LNK-011",
    title: "Copper Coffee Link Bracelet",
    description:
      "Hand-riveted copper links. Naturally develops a unique patina over time. NTAG213 serialized batch.",
    price: 7800,
    stock: 0,
    maxStock: 18,
    demandSignals: 67,
    chipTier: "NTAG213_SERIALIZED",
    imageUrl: "/mock/bracelet.jpg",
    tags: ["copper", "bracelet", "jewelry"],
    isFollowed: false,
    royaltyBps: 750,
  },
  {
    id: "prod_005",
    sku: "FC-LTH-KEY-FOB-019",
    title: "Veg-Tan Key Fob — NTAG424",
    description:
      "Natural vegetable-tanned leather fob. NTAG424 DNA embedded — cryptographic CMAC on every scan.",
    price: 2800,
    stock: 11,
    maxStock: 30,
    demandSignals: 34,
    chipTier: "NTAG424_DNA",
    imageUrl: "/mock/keyfob.jpg",
    tags: ["leather", "key-fob", "EDC"],
    isFollowed: true,
    royaltyBps: 750,
  },
  {
    id: "prod_006",
    sku: "FC-MTL-BKL-RNCH-022",
    title: "Ranger Belt Buckle — Brass",
    description:
      "Solid brass ranger buckle, sand-cast and hand-filed. QR Registry with maker signature.",
    price: 9500,
    stock: 5,
    maxStock: 10,
    demandSignals: 19,
    chipTier: "QR_REGISTRY",
    imageUrl: "/mock/buckle.jpg",
    tags: ["brass", "buckle", "belt"],
    isFollowed: false,
    royaltyBps: 1000,
  },
];

// ─── Shoppable Spatial Posts ──────────────────────────────────────────────────

export const SHOPPABLE_POSTS: ShoppablePost[] = [
  {
    id: "post_001",
    imageUrl: "/mock/post-booth-1.jpg",
    caption: "Saturday market booth setup — Hawthorne District, PDX",
    location: "Portland Saturday Market · Booth 14",
    timestamp: "2026-08-17T10:30:00-07:00",
    pins: [
      { id: "pin_001a", productId: "prod_001", x: 38, y: 55 },
      { id: "pin_001b", productId: "prod_005", x: 62, y: 44 },
    ],
  },
  {
    id: "post_002",
    imageUrl: "/mock/post-workshop.jpg",
    caption: "Batch forge day — 24 copper keyrings in the queue",
    location: "The Forge — Studio, Portland OR",
    timestamp: "2026-08-14T14:15:00-07:00",
    pins: [{ id: "pin_002a", productId: "prod_001", x: 50, y: 60 }],
  },
  {
    id: "post_003",
    imageUrl: "/mock/post-booth-2.jpg",
    caption: "Horween wallet restocks are live — only 3 left after today",
    location: "Maker Faire PDX · Hall B",
    timestamp: "2026-08-10T11:00:00-07:00",
    pins: [
      { id: "pin_003a", productId: "prod_002", x: 45, y: 50 },
      { id: "pin_003b", productId: "prod_006", x: 70, y: 68 },
    ],
  },
];
