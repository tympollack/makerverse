// lib/mock/shopData.ts
// Real dataset definitions for the Makerverse storefronts

export type ChipTier =
  | "QR_REGISTRY"
  | "NTAG213_SERIALIZED"
  | "NTAG215_SERIALIZED"
  | "NTAG424_DNA";

export interface HardwareSpec {
  chipModel: string;
  cryptoProtocol: string;
  uid: string;
  frequency: string;
  memoryCapacity: string;
  tamperDetection: boolean;
  onChainContract: string;
}

export interface Product {
  id: string;
  sku: string;
  brandId?: string;
  brandHandle?: string;
  title: string;
  description: string;
  price: number; // in cents
  stock: number;
  maxStock: number;
  demandSignals: number; // "Signal Interest" count
  chipTier: ChipTier;
  imageUrl: string;
  tags: string[];
  materials: string[];
  isFollowed: boolean;
  royaltyBps: number; // basis points, e.g. 750 = 7.5%
  hardwareSpec: HardwareSpec;
  makerNotes: string;
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
  studioLocation: string;
  tags: string[];
}

export interface ShoppablePin {
  id: string;
  productId: string;
  x: number; // percentage from left (0 - 100)
  y: number; // percentage from top (0 - 100)
  label?: string;
}

export interface ShoppablePost {
  id: string;
  brandId?: string;
  imageUrl: string;
  caption: string;
  location: string;
  timestamp: string;
  pins: ShoppablePin[];
}

// ─── Real Brand Passports ───────────────────────────────────────────────────

export const BRAND_PASSPORT: BrandPassport = {
  id: "b0000001-0000-0000-0000-000000000001",
  handle: "forge-collective",
  name: "The Forge Collective",
  bio: "Small-batch metalwork & leather goods forged in Portland, OR. Every piece carries an embedded NFC silicon chip — physical craft anchored to verified on-chain provenance. Secondary royalties enforced via EIP-2981.",
  avatarUrl: "/mock/forge-avatar.jpg",
  bannerUrl: "/mock/forge-banner.jpg",
  isVerified: true,
  ledgerAddress: "0x4f3E7a82B9611D9C942e067cFb68EbD7A849aB2",
  followerCount: 1_847,
  productCount: 6,
  totalRoyaltiesEarned: 284_50, // $284.50
  memberSince: "March 2024",
  studioLocation: "Portland, Oregon · USA",
  tags: ["metalwork", "leather", "NFC-provenance", "EIP-2981", "handcrafted"],
};

export const ALL_BRANDS: BrandPassport[] = [
  BRAND_PASSPORT,
  {
    id: "b0000002-0000-0000-0000-000000000002",
    handle: "timber-stone",
    name: "Timber & Stone Guild",
    bio: "Architectural woodwork, heirloom Japanese joinery & hand-chiseled slate. Embedded with serialized NTAG215 silicon chips.",
    avatarUrl: "/mock/timber-avatar.jpg",
    bannerUrl: "/mock/timber-banner.jpg",
    isVerified: true,
    ledgerAddress: "0x72A8B49c30F47Dea19b8813B4cEc5814e59D089c",
    followerCount: 942,
    productCount: 2,
    totalRoyaltiesEarned: 142_80, // $142.80
    memberSince: "May 2024",
    studioLocation: "Bend, Oregon · USA",
    tags: ["woodworking", "slate", "joinery", "NTAG215", "heirloom"],
  },
  {
    id: "b0000003-0000-0000-0000-000000000003",
    handle: "solstice-foundry",
    name: "Solstice Foundry",
    bio: "Sand-cast maritime brass, compass gauges, and everyday carry precision instruments. Verified with permanent optical QR ledger hashes.",
    avatarUrl: "/mock/solstice-avatar.jpg",
    bannerUrl: "/mock/solstice-banner.jpg",
    isVerified: true,
    ledgerAddress: "0x9C3d81b3D794F1e863Ac2C4B7E0e1f379FaC0a19",
    followerCount: 1_230,
    productCount: 1,
    totalRoyaltiesEarned: 98_20, // $98.20
    memberSince: "January 2024",
    studioLocation: "Seattle, Washington · USA",
    tags: ["brass", "casting", "instruments", "QR-registry", "maritime"],
  },
];

// ─── Real Products ───────────────────────────────────────────────────────────

export const PRODUCTS: Product[] = [
  {
    id: "prod_001",
    sku: "FC-BLT-K1-001",
    brandId: "b0000001-0000-0000-0000-000000000001",
    brandHandle: "forge-collective",
    title: "Blackened Copper Keyring — Gen 1",
    description:
      "Hand-forged pure copper ring with acid-darkened patina finish. NTAG424 DNA silicon embedded within a recessed ferrite-shielded cavity.",
    price: 4800, // $48.00
    stock: 7,
    maxStock: 24,
    demandSignals: 42,
    chipTier: "NTAG424_DNA",
    imageUrl: "/mock/keyring.jpg",
    tags: ["copper", "keyring", "EDC", "heritage"],
    materials: ["C110 Copper", "Ferrite Shielding", "Beeswax Seal"],
    isFollowed: false,
    royaltyBps: 750, // 7.5%
    hardwareSpec: {
      chipModel: "NXP NTAG424 DNA",
      cryptoProtocol: "AES-128 SUN-CMAC Dynamic Verification",
      uid: "04:5A:F2:8C:91:30:80",
      frequency: "13.56 MHz (ISO/IEC 14443-A)",
      memoryCapacity: "416 Bytes User Memory",
      tamperDetection: true,
      onChainContract: "0x4f3E...9aB2",
    },
    makerNotes: "Individually hammered on an 80lb Peter Wright anvil. Patina sealed with organic Oregon beeswax.",
  },
  {
    id: "prod_002",
    sku: "FC-LTH-WLT-003",
    brandId: "b0000001-0000-0000-0000-000000000001",
    brandHandle: "forge-collective",
    title: "Bridle Leather Bifold — Horween #003",
    description:
      "Full-grain Horween Dublin leather wallet. Hand-stitched with waxed linen thread. NTAG215 serialized with batch lot provenance.",
    price: 11500, // $115.00
    stock: 3,
    maxStock: 12,
    demandSignals: 28,
    chipTier: "NTAG215_SERIALIZED",
    imageUrl: "/mock/wallet.jpg",
    tags: ["leather", "wallet", "horween", "hand-stitched"],
    materials: ["Horween Dublin Leather", "Fil Au Chinois Thread", "NTAG215 Inlay"],
    isFollowed: true,
    royaltyBps: 1000, // 10.0%
    hardwareSpec: {
      chipModel: "NXP NTAG215 Serialized",
      cryptoProtocol: "Password Protected Dynamic NDEF",
      uid: "04:A1:33:9F:88:21:80",
      frequency: "13.56 MHz (ISO 14443)",
      memoryCapacity: "504 Bytes NDEF Memory",
      tamperDetection: false,
      onChainContract: "0x4f3E...9aB2",
    },
    makerNotes: "Hand-burnished edges using tokonole and natural deer antler. 6 card slots with hidden coin compartment.",
  },
  {
    id: "prod_003",
    sku: "FC-MTL-PNT-007",
    brandId: "b0000001-0000-0000-0000-000000000001",
    brandHandle: "forge-collective",
    title: 'Makers Pennant — 3" Steel Stamp',
    description:
      "Laser-cut 16-gauge cold-rolled steel pennant with mill-scale finish. Laser-etched optical QR code registry linking to the master certificate.",
    price: 2200, // $22.00
    stock: 19,
    maxStock: 50,
    demandSignals: 11,
    chipTier: "QR_REGISTRY",
    imageUrl: "/mock/pennant.jpg",
    tags: ["steel", "stamp", "pennant", "home-goods"],
    materials: ["16-Gauge Cold-Rolled Steel", "Mill-Scale Finish"],
    isFollowed: false,
    royaltyBps: 500, // 5.0%
    hardwareSpec: {
      chipModel: "Optical High-Density Micro-QR",
      cryptoProtocol: "Static Makerverse SHA-256 Ledger Anchor",
      uid: "QR-FC-2026-007-884",
      frequency: "Optical Sensor (0.5mm minimum resolvable module)",
      memoryCapacity: "Direct URL + EIP-191 Signature Hash",
      tamperDetection: false,
      onChainContract: "0x4f3E...9aB2",
    },
    makerNotes: "Deburred by hand with Japanese oilstones. Can be mounted on workshop walls or toolboxes.",
  },
  {
    id: "prod_004",
    sku: "FC-CPR-CFF-LNK-011",
    brandId: "b0000001-0000-0000-0000-000000000001",
    brandHandle: "forge-collective",
    title: "Copper Coffee Link Bracelet",
    description:
      "Hand-riveted solid copper links. Naturally patinas and morphs with body heat. Embedded with NTAG213 serialized hardware tag.",
    price: 7800, // $78.00
    stock: 0,
    maxStock: 18,
    demandSignals: 67,
    chipTier: "NTAG213_SERIALIZED",
    imageUrl: "/mock/bracelet.jpg",
    tags: ["copper", "bracelet", "jewelry", "patina"],
    materials: ["Solid Copper Wire", "Brass Rivets", "NTAG213 Chip"],
    isFollowed: false,
    royaltyBps: 750, // 7.5%
    hardwareSpec: {
      chipModel: "NXP NTAG213 Serialized",
      cryptoProtocol: "UID Mirror + Lock Bits Hardware Protocol",
      uid: "04:6B:8C:11:42:19:80",
      frequency: "13.56 MHz (ISO 14443-A)",
      memoryCapacity: "144 Bytes User Memory",
      tamperDetection: false,
      onChainContract: "0x4f3E...9aB2",
    },
    makerNotes: "Each link formed by hand on custom bending jigs. Sized for 7.25-8.0 inch wrists.",
  },
  {
    id: "prod_005",
    sku: "FC-LTH-KEY-FOB-019",
    brandId: "b0000001-0000-0000-0000-000000000001",
    brandHandle: "forge-collective",
    title: "Veg-Tan Key Fob — NTAG424 Cryptographic DNA",
    description:
      "Natural vegetable-tanned Italian leather fob. NTAG424 DNA embedded with dynamic AES-128 CMAC cryptographic handshake.",
    price: 2800, // $28.00
    stock: 11,
    maxStock: 30,
    demandSignals: 34,
    chipTier: "NTAG424_DNA",
    imageUrl: "/mock/keyfob.jpg",
    tags: ["leather", "key-fob", "EDC", "crypto-dna"],
    materials: ["Pueblo Veg-Tan Leather", "Solid Brass Hardware", "NTAG424 DNA Inlay"],
    isFollowed: true,
    royaltyBps: 750, // 7.5%
    hardwareSpec: {
      chipModel: "NXP NTAG424 DNA",
      cryptoProtocol: "AES-128 SUN-CMAC Dynamic Verification",
      uid: "04:9C:14:8B:77:50:80",
      frequency: "13.56 MHz (ISO/IEC 14443-A)",
      memoryCapacity: "416 Bytes User Memory",
      tamperDetection: true,
      onChainContract: "0x4f3E...9aB2",
    },
    makerNotes: "Italian Pueblo leather ages to a deep, glossy caramel shade within 90 days of daily pocket carry.",
  },
  {
    id: "prod_006",
    sku: "FC-MTL-BKL-RNCH-022",
    brandId: "b0000001-0000-0000-0000-000000000001",
    brandHandle: "forge-collective",
    title: "Ranger Belt Buckle — Solid Sand-Cast Brass",
    description:
      "Heavyweight solid brass ranger buckle, sand-cast and hand-filed. QR Registry with maker cryptographic signature stamp.",
    price: 9500, // $95.00
    stock: 5,
    maxStock: 10,
    demandSignals: 19,
    chipTier: "QR_REGISTRY",
    imageUrl: "/mock/buckle.jpg",
    tags: ["brass", "buckle", "belt", "casting"],
    materials: ["C360 Brass", "Cast Iron Mold Cast", "Hand File Finish"],
    isFollowed: false,
    royaltyBps: 1000, // 10.0%
    hardwareSpec: {
      chipModel: "Optical High-Density Micro-QR",
      cryptoProtocol: "Makerverse Permanent Foundry Certificate",
      uid: "QR-FC-2026-022-109",
      frequency: "Optical Scanner",
      memoryCapacity: "Immutable IPFS URI + Block Anchor",
      tamperDetection: false,
      onChainContract: "0x4f3E...9aB2",
    },
    makerNotes: "Poured in greensand molds at 1,950°F. Hand-ground and finished with red rouge compound.",
  },
  {
    id: "prod_007",
    sku: "TS-WNT-TRY-001",
    brandId: "b0000002-0000-0000-0000-000000000002",
    brandHandle: "timber-stone",
    title: "Oregon Walnut Catchall Valet Tray",
    description:
      "Milled from salvage Oregon black walnut with live edge contour and chamfered brass coin channel.",
    price: 6400, // $64.00
    stock: 8,
    maxStock: 20,
    demandSignals: 17,
    chipTier: "NTAG215_SERIALIZED",
    imageUrl: "/mock/tray.jpg",
    tags: ["wood", "walnut", "valet", "heirloom"],
    materials: ["Oregon Black Walnut", "Cold-Pressed Linseed Oil", "NTAG215 Silicon"],
    isFollowed: false,
    royaltyBps: 800,
    hardwareSpec: {
      chipModel: "NXP NTAG215 Serialized",
      cryptoProtocol: "Password Protected Dynamic NDEF",
      uid: "04:D8:1A:33:90:5E:80",
      frequency: "13.56 MHz",
      memoryCapacity: "504 Bytes",
      tamperDetection: false,
      onChainContract: "0x72A8...089c",
    },
    makerNotes: "Finished with five coats of hand-rubbed tung oil.",
  },
  {
    id: "prod_008",
    sku: "TS-OAK-CSL-004",
    brandId: "b0000002-0000-0000-0000-000000000002",
    brandHandle: "timber-stone",
    title: "Japanese White Oak Chisel Roll",
    description:
      "Heavy 18oz duck canvas tool roll with Japanese white oak handled dovetail chisels.",
    price: 13800, // $138.00
    stock: 4,
    maxStock: 12,
    demandSignals: 23,
    chipTier: "NTAG424_DNA",
    imageUrl: "/mock/chisel.jpg",
    tags: ["tools", "chisels", "oak", "japanese-steel"],
    materials: ["18oz Duck Canvas", "Japanese White Oak", "Hitachi White Paper Steel"],
    isFollowed: false,
    royaltyBps: 1000,
    hardwareSpec: {
      chipModel: "NXP NTAG424 DNA",
      cryptoProtocol: "AES-128 SUN-CMAC Dynamic Verification",
      uid: "04:EA:44:91:2C:19:80",
      frequency: "13.56 MHz",
      memoryCapacity: "416 Bytes",
      tamperDetection: true,
      onChainContract: "0x72A8...089c",
    },
    makerNotes: "Hand-forged blades laminated with soft iron backing.",
  },
  {
    id: "prod_009",
    sku: "SF-BRS-CMP-001",
    brandId: "b0000003-0000-0000-0000-000000000003",
    brandHandle: "solstice-foundry",
    title: "Mariners Pocket Sundial & Compass",
    description:
      "Solid marine brass pocket sundial with liquid-damped magnetic compass needle and laser ledger inscription.",
    price: 8900, // $89.00
    stock: 6,
    maxStock: 15,
    demandSignals: 29,
    chipTier: "QR_REGISTRY",
    imageUrl: "/mock/compass.jpg",
    tags: ["brass", "compass", "sundial", "maritime"],
    materials: ["Marine C360 Brass", "Sapphire Glass Bearing", "Damped Needle"],
    isFollowed: false,
    royaltyBps: 650,
    hardwareSpec: {
      chipModel: "Optical High-Density Micro-QR",
      cryptoProtocol: "Static Makerverse SHA-256 Ledger Anchor",
      uid: "QR-SF-2026-CMP-001",
      frequency: "Optical",
      memoryCapacity: "Direct URL + EIP-191 Signature Hash",
      tamperDetection: false,
      onChainContract: "0x9C3d...0a19",
    },
    makerNotes: "Calibrated for 45° North latitude navigation.",
  },
];

// ─── Real Shoppable Spatial Posts ───────────────────────────────────────────

export const SHOPPABLE_POSTS: ShoppablePost[] = [
  {
    id: "post_001",
    brandId: "b0000001-0000-0000-0000-000000000001",
    imageUrl: "/mock/post-booth-1.jpg",
    caption: "Saturday morning booth setup at Hawthorne District market. Natural morning light hitting the blackened copper and pueblo leather pieces.",
    location: "Portland Saturday Market · Booth 14",
    timestamp: "2026-08-22T10:30:00-07:00",
    pins: [
      { id: "pin_001a", productId: "prod_001", x: 38, y: 55, label: "Blackened Copper Keyring" },
      { id: "pin_001b", productId: "prod_005", x: 64, y: 44, label: "Veg-Tan Key Fob" },
    ],
  },
  {
    id: "post_002",
    brandId: "b0000001-0000-0000-0000-000000000001",
    imageUrl: "/mock/post-workshop.jpg",
    caption: "Anvil tuning day in the studio. 24 copper keyring batches cooling on the refractory brick after beeswax quenching.",
    location: "The Forge Studio · Central Eastside PDX",
    timestamp: "2026-08-19T14:15:00-07:00",
    pins: [
      { id: "pin_002a", productId: "prod_001", x: 52, y: 58, label: "Gen 1 Copper Ring" },
    ],
  },
  {
    id: "post_003",
    brandId: "b0000001-0000-0000-0000-000000000001",
    imageUrl: "/mock/post-booth-2.jpg",
    caption: "Horween Dublin wallet restocks are live for the Maker Faire showcase. Only 3 serialized units remaining in this lot.",
    location: "Maker Faire PDX · Exhibition Hall B",
    timestamp: "2026-08-15T11:00:00-07:00",
    pins: [
      { id: "pin_003a", productId: "prod_002", x: 44, y: 52, label: "Horween Dublin Bifold" },
      { id: "pin_003b", productId: "prod_006", x: 72, y: 66, label: "Ranger Belt Buckle" },
    ],
  },
];

// ─── Helper Functions ────────────────────────────────────────────────────────

export function getBrandByHandle(handle: string): BrandPassport | null {
  const normalized = handle.toLowerCase().replace(/^@/, "");
  return ALL_BRANDS.find((b) => b.handle.toLowerCase() === normalized) || null;
}

export function getProductsByBrandHandle(handle: string): Product[] {
  const brand = getBrandByHandle(handle);
  if (!brand) return [];
  return PRODUCTS.filter((p) => p.brandId === brand.id || p.brandHandle === brand.handle);
}

export function getPostsByBrandHandle(handle: string): ShoppablePost[] {
  const brand = getBrandByHandle(handle);
  if (!brand) return [];
  return SHOPPABLE_POSTS.filter((p) => p.brandId === brand.id);
}
