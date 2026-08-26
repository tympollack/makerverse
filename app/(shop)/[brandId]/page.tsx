// app/(shop)/[brandId]/page.tsx
"use client";

import React, { useState, useMemo, useEffect, use } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  BadgeCheck,
  ExternalLink,
  ShoppingBag,
  MapPin,
  Clock,
  ChevronRight,
  X,
  Layers,
  Sparkles,
  Search,
  SlidersHorizontal,
  Copy,
  Check,
  Cpu,
  ShieldCheck,
  QrCode,
  Radio,
  Lock,
  Zap,
  ArrowRight,
  Share2,
  Info,
  CheckCircle2,
  Maximize2,
  CornerDownRight,
  Tag,
  Key,
} from "lucide-react";
import { FrostedCard } from "@/components/ui/FrostedCard";
import { ProvenanceBadge, TIER_CONFIG } from "@/components/ui/ProvenanceBadge";
import { FollowToggle } from "@/components/ui/FollowToggle";
import { DemandSignalButton } from "@/components/ui/DemandSignalButton";
import { MonoValue, PriceTag, ChipUID } from "@/components/ui/MonoValue";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  BRAND_PASSPORT,
  ALL_BRANDS,
  PRODUCTS,
  SHOPPABLE_POSTS,
  getBrandByHandle,
  getProductsByBrandHandle,
  getPostsByBrandHandle,
  type Product,
  type ShoppablePost,
  type ShoppablePin,
  type ChipTier,
} from "@/lib/mock/shopData";
import { cn, formatCents, relativeTime } from "@/lib/utils";

// ─── Visual Craftsman Product Preview Illustrations ──────────────────────────

function ProductVisual({ product }: { product: Product }) {
  const isOutOfStock = product.stock === 0;

  // Custom tailored craftsman SVG representations for high visual fidelity
  const renderVisual = () => {
    switch (product.id) {
      case "prod_001": // Keyring
        return (
          <svg className="w-24 h-24 text-orange-500/80" viewBox="0 0 100 100" fill="none" stroke="currentColor">
            <circle cx="50" cy="45" r="28" strokeWidth="6" className="text-orange-600/60" />
            <circle cx="50" cy="45" r="22" strokeWidth="2" strokeDasharray="3 3" className="text-amber-400/50" />
            <rect x="42" y="66" width="16" height="24" rx="4" fill="currentColor" fillOpacity="0.2" strokeWidth="3" className="text-stone-400" />
            <circle cx="50" cy="78" r="3" fill="#22D3EE" className="animate-pulse" />
          </svg>
        );
      case "prod_002": // Wallet
        return (
          <svg className="w-24 h-24 text-amber-700/80" viewBox="0 0 100 100" fill="none" stroke="currentColor">
            <rect x="22" y="28" width="56" height="44" rx="6" strokeWidth="4" className="text-amber-800/80" fill="#78350F" fillOpacity="0.2" />
            <line x1="22" y1="50" x2="78" y2="50" strokeWidth="2" strokeDasharray="4 2" className="text-amber-300/40" />
            <path d="M50 28 V 72" strokeWidth="2" strokeDasharray="2 2" className="text-amber-400/30" />
            <circle cx="68" cy="60" r="4" fill="#22D3EE" fillOpacity="0.8" className="animate-pulse" />
          </svg>
        );
      case "prod_003": // Pennant
        return (
          <svg className="w-24 h-24 text-stone-400" viewBox="0 0 100 100" fill="none" stroke="currentColor">
            <polygon points="25,25 78,48 25,72" strokeWidth="4" className="text-stone-400/80" fill="#44403C" fillOpacity="0.3" />
            <circle cx="40" cy="48" r="6" strokeWidth="2" className="text-orange-400" />
            <rect x="22" y="20" width="6" height="60" rx="2" fill="currentColor" className="text-stone-500" />
          </svg>
        );
      case "prod_004": // Bracelet
        return (
          <svg className="w-24 h-24 text-orange-400" viewBox="0 0 100 100" fill="none" stroke="currentColor">
            <ellipse cx="50" cy="50" rx="32" ry="20" strokeWidth="5" className="text-orange-600/70" />
            <ellipse cx="50" cy="50" rx="32" ry="20" strokeWidth="2" strokeDasharray="6 6" className="text-amber-300/60" />
            <circle cx="50" cy="30" r="4" fill="#CC5500" />
            <circle cx="50" cy="70" r="4" fill="#CC5500" />
          </svg>
        );
      case "prod_005": // Key Fob
        return (
          <svg className="w-24 h-24 text-amber-600/80" viewBox="0 0 100 100" fill="none" stroke="currentColor">
            <path d="M40 20 H60 L68 70 A18 18 0 0 1 32 70 Z" strokeWidth="4" className="text-amber-700/80" fill="#92400E" fillOpacity="0.2" />
            <circle cx="50" cy="32" r="5" strokeWidth="3" className="text-amber-300" />
            <circle cx="50" cy="65" r="4" fill="#8B5CF6" className="animate-pulse" />
          </svg>
        );
      case "prod_006": // Buckle
        return (
          <svg className="w-24 h-24 text-yellow-500/80" viewBox="0 0 100 100" fill="none" stroke="currentColor">
            <rect x="22" y="30" width="56" height="40" rx="8" strokeWidth="5" className="text-yellow-600/80" fill="#CA8A04" fillOpacity="0.15" />
            <line x1="50" y1="30" x2="50" y2="70" strokeWidth="4" className="text-yellow-400" />
            <circle cx="50" cy="50" r="4" fill="#CC5500" />
          </svg>
        );
      default:
        return <ShoppingBag className="w-16 h-16 text-white/15" />;
    }
  };

  return (
    <div
      className={cn(
        "h-48 rounded-xl bg-gradient-to-b from-stone-800/80 via-stone-900/90 to-[#141414] relative overflow-hidden flex items-center justify-center border border-white/5",
        isOutOfStock && "grayscale opacity-60",
      )}
    >
      {/* Background craft grid and radial ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(204,85,0,0.12),_transparent_70%)]" />
      <div
        className="absolute inset-0 opacity-15"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.2) 1px, transparent 1px)",
          backgroundSize: "18px 18px",
        }}
      />

      {/* Visual illustration */}
      <div className="relative z-10 drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] transition-transform duration-300 group-hover:scale-105">
        {renderVisual()}
      </div>

      {/* Out of stock banner */}
      {isOutOfStock && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/65 backdrop-blur-[2px]">
          <div className="px-3.5 py-1.5 rounded-lg border border-red-500/40 bg-red-500/10 text-red-300 font-mono text-xs font-semibold tracking-wider uppercase shadow-lg">
            Sold Out · Restock Queued
          </div>
        </div>
      )}

      {/* Chip DNA Tier Micro-badge */}
      <div className="absolute top-2.5 right-2.5 z-10">
        <ProvenanceBadge tier={product.chipTier} compact interactive />
      </div>

      {/* Materials count micro-pill */}
      <div className="absolute bottom-2.5 left-2.5 z-10">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/50 border border-white/10 text-[10px] font-mono text-white/50">
          <Tag className="w-2.5 h-2.5 text-orange-400" />
          {product.materials[0]}
        </span>
      </div>
    </div>
  );
}

// ─── Brand Hero Header ────────────────────────────────────────────────────────

function BrandHero({
  brand,
  followerCount,
  isFollowing,
  onFollowToggle,
  onOpenLedgerModal,
}: {
  brand: typeof BRAND_PASSPORT;
  followerCount: number;
  isFollowing: boolean;
  onFollowToggle: () => void;
  onOpenLedgerModal: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(brand.ledgerAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#161616] shadow-2xl">
      {/* Banner backdrop with forge aesthetic & radial lighting */}
      <div className="h-48 sm:h-56 bg-gradient-to-r from-orange-950/70 via-stone-900 to-[#121212] relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(204,85,0,0.30),_transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(34,211,238,0.15),_transparent_55%)]" />
        {/* Geometric craft grid */}
        <div
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        {/* Ambient telemetry indicators */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-[11px] font-mono text-cyan-300 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>Makerverse Ledger v2.4</span>
          </div>
        </div>
      </div>

      {/* Main Hero Bar */}
      <div className="bg-[#1A1A1A]/95 backdrop-blur-xl border-t border-white/10 px-6 py-6 flex flex-col lg:flex-row items-start lg:items-center gap-6">
        {/* Avatar / Monogram with Verified Seal */}
        <div className="-mt-20 lg:-mt-24 relative flex-shrink-0">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-br from-[#CC5500] via-stone-800 to-[#1A1A1A] border-2 border-white/20 shadow-2xl flex items-center justify-center text-3xl sm:text-4xl font-bold text-orange-100 font-mono select-none ring-4 ring-black/40">
            FC
          </div>
          {brand.isVerified && (
            <div
              title="Verified Makerverse Ledger Anchor"
              className="absolute -bottom-1.5 -right-1.5 w-8 h-8 rounded-full bg-[#CC5500] border-2 border-[#1A1A1A] flex items-center justify-center shadow-lg shadow-orange-500/40 cursor-pointer hover:scale-110 transition-transform"
              onClick={onOpenLedgerModal}
            >
              <BadgeCheck className="w-5 h-5 text-white" />
            </div>
          )}
        </div>

        {/* Brand Information & Bio */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {brand.name}
            </h1>
            {brand.isVerified && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-orange-500/40 bg-orange-500/10 text-orange-300 text-[11px] font-mono font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-orange-400" />
                Verified Ledger
              </span>
            )}
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-white/10 bg-white/5 text-white/50 text-[11px] font-mono">
              <MapPin className="w-3 h-3 text-orange-400" />
              {brand.studioLocation}
            </span>
          </div>

          {/* Ledger Address Bar */}
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border border-white/10 bg-black/30 hover:border-white/20 transition-colors group cursor-pointer"
              title="Click to copy ledger address"
            >
              <span className="text-[11px] font-mono text-cyan-300/80 group-hover:text-cyan-200">
                {brand.ledgerAddress}
              </span>
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-white/40 group-hover:text-white/70" />
              )}
            </button>
            <button
              onClick={onOpenLedgerModal}
              className="text-[11px] font-mono text-white/40 hover:text-white/80 underline decoration-dotted underline-offset-4 cursor-pointer"
            >
              Audit Contract
            </button>
          </div>

          {/* Bio */}
          <p className="text-sm text-white/70 mt-3 max-w-2xl leading-relaxed">
            {brand.bio}
          </p>

          {/* Craft Specialty Tags */}
          <div className="flex items-center gap-1.5 flex-wrap mt-3.5">
            {brand.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-md bg-white/5 border border-white/8 text-[11px] font-mono text-white/50"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>

        {/* Action Panel & Realtime Counters */}
        <div className="w-full lg:w-auto flex flex-row lg:flex-col items-center lg:items-end justify-between gap-4 pt-4 lg:pt-0 border-t lg:border-t-0 border-white/8">
          {/* Main "Follow Brand Line" button */}
          <div className="flex items-center gap-2">
            <FollowToggle
              target="brand"
              size="lg"
              initialFollowed={isFollowing}
              label="Follow Brand Line"
              followingLabel="Following Brand Line"
              onToggle={onFollowToggle}
            />
          </div>

          {/* Telemetry Stats Grid */}
          <div className="flex items-center gap-5 sm:gap-6 text-right">
            <div>
              <p className="text-[11px] text-white/40 font-mono uppercase tracking-wider">
                Followers
              </p>
              <motion.div
                key={followerCount}
                initial={{ scale: 1.15, color: "#22D3EE" }}
                animate={{ scale: 1, color: "#F9F9F9" }}
                transition={{ duration: 0.3 }}
                className="font-mono text-lg font-bold tabular leading-tight text-[#F9F9F9]"
              >
                {followerCount.toLocaleString()}
              </motion.div>
            </div>

            <div className="h-8 w-px bg-white/10" />

            <div>
              <p className="text-[11px] text-white/40 font-mono uppercase tracking-wider">
                Products
              </p>
              <p className="font-mono text-lg font-bold tabular leading-tight text-[#F9F9F9]">
                {brand.productCount}
              </p>
            </div>

            <div className="h-8 w-px bg-white/10" />

            <div>
              <div className="flex items-center justify-end gap-1">
                <p className="text-[11px] text-white/40 font-mono uppercase tracking-wider">
                  Royalties
                </p>
                <span title="Secondary market royalties generated for maker via EIP-2981">
                  <Info className="w-3 h-3 text-orange-400/70" />
                </span>
              </div>
              <p className="font-mono text-lg font-bold text-orange-400 [text-shadow:0_0_12px_rgba(204,85,0,0.4)] leading-tight">
                {formatCents(brand.totalRoyaltiesEarned)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Product Card ─────────────────────────────────────────────────────────────

function ProductCard({
  product,
  onInspect,
  onDemandSignal,
}: {
  product: Product;
  onInspect: (product: Product) => void;
  onDemandSignal?: (productId: string, newCount: number) => void;
}) {
  const stockPct = (product.stock / product.maxStock) * 100;
  const isOutOfStock = product.stock === 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25 }}
      className="h-full"
    >
      <FrostedCard
        glowOnHover
        className="group flex flex-col h-full gap-4 transition-all duration-300 hover:translate-y-[-2px]"
      >
        {/* Visual Preview */}
        <div
          className="cursor-pointer"
          onClick={() => onInspect(product)}
        >
          <ProductVisual product={product} />
        </div>

        {/* Stock Progress Status Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-white/40">Inventory State</span>
            <span
              className={cn(
                "font-medium",
                isOutOfStock
                  ? "text-red-400"
                  : stockPct > 50
                    ? "text-emerald-400"
                    : "text-amber-400",
              )}
            >
              {isOutOfStock
                ? "0 Available (Backorder)"
                : `${product.stock} of ${product.maxStock} in batch`}
            </span>
          </div>
          <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(4, stockPct)}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={cn(
                "h-full rounded-full transition-colors",
                isOutOfStock
                  ? "bg-red-500/40"
                  : stockPct > 50
                    ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                    : stockPct > 20
                      ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                      : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]",
              )}
            />
          </div>
        </div>

        {/* Title, SKU & Details */}
        <div className="flex flex-col gap-2 flex-1">
          <div>
            <h3
              onClick={() => onInspect(product)}
              className="font-semibold text-white/95 text-base leading-snug group-hover:text-orange-300 transition-colors cursor-pointer"
            >
              {product.title}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-mono text-[11px] text-cyan-400/80 bg-cyan-950/30 px-2 py-0.5 rounded border border-cyan-500/20">
                SKU: {product.sku}
              </span>
              <span className="font-mono text-[11px] text-white/30">
                {(product.royaltyBps / 100).toFixed(1)}% EIP-2981
              </span>
            </div>
          </div>

          <p className="text-xs text-white/60 leading-relaxed line-clamp-2 mt-1">
            {product.description}
          </p>

          {/* Materials Tag List */}
          <div className="flex flex-wrap gap-1 mt-auto pt-2">
            {product.materials.map((mat) => (
              <span
                key={mat}
                className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-white/50 border border-white/5"
              >
                {mat}
              </span>
            ))}
          </div>

          {/* Price & Hardware Tier footer */}
          <div className="flex items-center justify-between pt-3 border-t border-white/8 mt-2">
            <div>
              <p className="text-[10px] font-mono text-white/40 uppercase">Price</p>
              <PriceTag cents={product.price} className="text-lg font-bold" />
            </div>

            <button
              onClick={() => onInspect(product)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-white/80 transition-all hover:text-white cursor-pointer"
            >
              <Key className="w-3.5 h-3.5 text-cyan-400" />
              <span>Inspect DNA</span>
            </button>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/8">
          <DemandSignalButton
            initialCount={product.demandSignals}
            productId={product.id}
            onSignalChange={(count) => onDemandSignal?.(product.id, count)}
          />

          <div className="ml-auto">
            <FollowToggle
              target="product"
              size="sm"
              initialFollowed={product.isFollowed}
              variant="ghost"
            />
          </div>
        </div>
      </FrostedCard>
    </motion.div>
  );
}

// ─── Shoppable Pin Component ──────────────────────────────────────────────────

function ShoppablePinMarker({
  pin,
  product,
  isHovered,
  onHover,
  onSelect,
}: {
  pin: ShoppablePin;
  product?: Product;
  isHovered: boolean;
  onHover: (pinId: string | null) => void;
  onSelect: (product: Product) => void;
}) {
  const [internalHover, setInternalHover] = useState(false);
  const active = isHovered || internalHover;

  return (
    <div
      className="absolute z-20"
      style={{
        left: `${pin.x}%`,
        top: `${pin.y}%`,
        transform: "translate(-50%, -50%)",
      }}
      onMouseEnter={() => {
        setInternalHover(true);
        onHover(pin.id);
      }}
      onMouseLeave={() => {
        setInternalHover(false);
        onHover(null);
      }}
    >
      {/* Sonar Pulsing Ring */}
      <span className="absolute -inset-2.5 rounded-full bg-[#CC5500]/40 pin-pulse pointer-events-none" />

      {/* Pin Central Button */}
      <button
        onClick={() => product && onSelect(product)}
        aria-label={`Shoppable item: ${pin.label || product?.title || "Product"}`}
        className={cn(
          "relative w-6 h-6 rounded-full bg-[#CC5500] border-2 border-white/90 shadow-[0_0_16px_rgba(204,85,0,0.8)] cursor-pointer flex items-center justify-center transition-transform duration-200",
          active ? "scale-125 bg-orange-400 ring-4 ring-orange-500/30" : "hover:scale-115",
        )}
      >
        <span className="w-2 h-2 rounded-full bg-white" />
      </button>

      {/* Frosted Hover Tooltip */}
      <AnimatePresence>
        {active && product && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 8 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 z-30 w-56 pointer-events-auto"
          >
            <FrostedCard noPadding className="p-3 shadow-2xl border-orange-500/40 bg-[#1A1A1A]/95 backdrop-blur-xl">
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <ProvenanceBadge tier={product.chipTier} compact showStatusDot={false} />
                <span className="text-[10px] font-mono text-cyan-300">
                  {product.stock > 0 ? `${product.stock} in stock` : "Sold Out"}
                </span>
              </div>
              <p className="text-xs font-semibold text-white leading-snug line-clamp-1">
                {product.title}
              </p>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10">
                <PriceTag cents={product.price} className="text-sm font-bold" />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(product);
                  }}
                  className="px-2.5 py-1 rounded bg-[#CC5500] hover:bg-[#E0621A] text-white font-mono text-[10px] font-semibold flex items-center gap-1 shadow-md cursor-pointer"
                >
                  <span>Inspect</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </FrostedCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Spatial Post Modal & Drawer ──────────────────────────────────────────────

function SpatialModal({
  post,
  onClose,
  onSelectProduct,
}: {
  post: ShoppablePost;
  onClose: () => void;
  onSelectProduct: (product: Product) => void;
}) {
  const [hoveredPinId, setHoveredPinId] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 20 }}
        transition={{ type: "spring", stiffness: 350, damping: 28 }}
        className="w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl border border-white/15 bg-[#161616] shadow-2xl flex flex-col"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#1A1A1A]/90">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                Shoppable Spatial View
              </h3>
              <p className="text-xs font-mono text-white/40">{post.location}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Split */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 min-h-0">
          {/* Spatial Canvas (Left) */}
          <div className="lg:col-span-8 bg-black/60 relative min-h-[340px] sm:min-h-[440px] flex items-center justify-center border-b lg:border-b-0 lg:border-r border-white/10 overflow-hidden">
            {/* Visual background simulation of the physical post scene */}
            <div className="absolute inset-0 bg-gradient-to-br from-stone-900 via-[#1a1816] to-[#0d0d0d]">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(204,85,0,0.15),_transparent_75%)]" />
              {/* Studio bench overlay texture */}
              <div
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)",
                  backgroundSize: "48px 48px",
                }}
              />
            </div>

            {/* Atmosphere Graphic */}
            <div className="text-center p-8 z-10 pointer-events-none opacity-40 select-none">
              <Sparkles className="w-12 h-12 text-orange-400/40 mx-auto mb-2" />
              <p className="font-mono text-xs text-white/50 uppercase tracking-widest">
                Physical Scene · {post.pins.length} Spatial Pins
              </p>
              <p className="text-[11px] text-white/30 mt-1 max-w-sm">
                Hover or tap pins in the coordinate space to view on-chain product provenance.
              </p>
            </div>

            {/* Pulsing Shoppable Pins */}
            {post.pins.map((pin) => {
              const product = PRODUCTS.find((p) => p.id === pin.productId);
              return (
                <ShoppablePinMarker
                  key={pin.id}
                  pin={pin}
                  product={product}
                  isHovered={hoveredPinId === pin.id}
                  onHover={setHoveredPinId}
                  onSelect={(p) => {
                    onClose();
                    onSelectProduct(p);
                  }}
                />
              );
            })}
          </div>

          {/* Linked Products Sidebar (Right) */}
          <div className="lg:col-span-4 p-5 sm:p-6 bg-[#161616] flex flex-col gap-4 overflow-y-auto">
            <div>
              <span className="text-[10px] font-mono text-orange-400 uppercase tracking-wider font-semibold">
                Tagged In This Scene
              </span>
              <p className="text-xs text-white/60 mt-1 leading-relaxed">
                {post.caption}
              </p>
            </div>

            <div className="space-y-3 flex-1">
              {post.pins.map((pin) => {
                const product = PRODUCTS.find((p) => p.id === pin.productId);
                if (!product) return null;
                const isHovered = hoveredPinId === pin.id;

                return (
                  <div
                    key={pin.id}
                    onMouseEnter={() => setHoveredPinId(pin.id)}
                    onMouseLeave={() => setHoveredPinId(null)}
                    onClick={() => {
                      onClose();
                      onSelectProduct(product);
                    }}
                    className={cn(
                      "p-3.5 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col gap-2.5",
                      isHovered
                        ? "border-orange-500/50 bg-orange-500/10 shadow-[0_0_20px_rgba(204,85,0,0.15)]"
                        : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <ProvenanceBadge tier={product.chipTier} compact showStatusDot={false} />
                      <PriceTag cents={product.price} className="text-sm font-bold" />
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-white leading-tight">
                        {product.title}
                      </p>
                      <p className="font-mono text-[10px] text-white/40 mt-0.5">
                        SKU: {product.sku}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/8 text-[11px] font-mono">
                      <span className="text-white/40">
                        {product.stock > 0 ? `${product.stock} available` : "Sold out"}
                      </span>
                      <span className="text-orange-400 flex items-center gap-1 font-medium group-hover:translate-x-1 transition-transform">
                        Inspect DNA <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-white/10 text-[11px] font-mono text-white/40 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-white/30" />
              <span>Captured {relativeTime(post.timestamp)}</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Cryptographic DNA & Provenance Inspection Modal ──────────────────────────

function HardwareInspectionModal({
  product,
  onClose,
}: {
  product: Product;
  onClose: () => void;
}) {
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

// ─── Ledger Contract Audit Modal ──────────────────────────────────────────────

function LedgerAuditModal({
  brand,
  onClose,
}: {
  brand: typeof BRAND_PASSPORT;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ type: "spring", stiffness: 350, damping: 28 }}
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/15 bg-[#181818] shadow-2xl flex flex-col"
      >
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#1E1E1E]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Makerverse Ledger Registry</h2>
              <p className="font-mono text-xs text-white/40">Verified Foundry Contract</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 font-mono text-xs">
          <div className="p-4 rounded-xl border border-white/10 bg-black/40 space-y-2">
            <div className="flex justify-between">
              <span className="text-white/40">Smart Contract Anchor</span>
              <span className="text-cyan-300">{brand.ledgerAddress}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">Registry Verification</span>
              <span className="text-emerald-400">Active · Cryptographically Bound</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">Secondary Royalty Enforcement</span>
              <span className="text-orange-400">EIP-2981 Standard Enabled</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">Total On-Chain Royalties Disbursed</span>
              <span className="text-[#F9F9F9] font-bold">{formatCents(brand.totalRoyaltiesEarned)}</span>
            </div>
          </div>

          <p className="text-white/60 leading-relaxed font-sans text-xs">
            Every physical product manufactured by {brand.name} carries a cryptographic silicon chip or optical registration key. When secondary trades occur across the Makerverse ecosystem, the creator royalty is atomically enforced and routed directly to this ledger wallet.
          </p>
        </div>

        <div className="px-6 py-3 border-t border-white/10 bg-[#161616] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-mono transition-colors cursor-pointer"
          >
            Close Inspector
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Shop Page Component ─────────────────────────────────────────────────

export default function BrandShopPage({
  params,
}: {
  params: Promise<{ brandId: string }> | { brandId: string };
}) {
  // Resolve params cleanly whether promise or plain object
  const resolvedParams = params instanceof Promise ? use(params) : params;
  const brandHandle = (resolvedParams?.brandId as string) || "forge-collective";

  const currentBrand = useMemo(() => {
    return getBrandByHandle(brandHandle) || BRAND_PASSPORT;
  }, [brandHandle]);

  const brandProducts = useMemo(() => {
    return getProductsByBrandHandle(currentBrand.handle);
  }, [currentBrand.handle]);

  const brandPosts = useMemo(() => {
    return getPostsByBrandHandle(currentBrand.handle);
  }, [currentBrand.handle]);

  // Local interactive state
  const [followerCount, setFollowerCount] = useState(currentBrand.followerCount);
  const [isFollowingBrand, setIsFollowingBrand] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTier, setSelectedTier] = useState<string>("ALL");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [productsState, setProductsState] = useState<Product[]>(brandProducts);

  // Sync state when brand changes
  useEffect(() => {
    setProductsState(brandProducts);
    setFollowerCount(currentBrand.followerCount);
    setIsFollowingBrand(false);
  }, [brandProducts, currentBrand]);

  // Modals state
  const [activeSpatialPost, setActiveSpatialPost] = useState<ShoppablePost | null>(null);
  const [inspectedProduct, setInspectedProduct] = useState<Product | null>(null);
  const [showLedgerModal, setShowLedgerModal] = useState(false);

  const handleBrandFollowToggle = () => {
    if (!isFollowingBrand) {
      setFollowerCount((prev) => prev + 1);
      setIsFollowingBrand(true);
    } else {
      setFollowerCount((prev) => Math.max(0, prev - 1));
      setIsFollowingBrand(false);
    }
  };

  const handleDemandSignal = async (productId: string, newCount: number) => {
    setProductsState((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, demandSignals: newCount } : p))
    );
    try {
      await fetch("/api/products/signal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, count: newCount }),
      });
    } catch (e) {
      console.warn("Demand signal API fallback:", e);
    }
  };

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return productsState.filter((product) => {
      const matchesSearch =
        product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.materials.some((m) => m.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesTier =
        selectedTier === "ALL"
          ? true
          : selectedTier === "NTAG_SERIALIZED"
            ? product.chipTier === "NTAG213_SERIALIZED" || product.chipTier === "NTAG215_SERIALIZED"
            : product.chipTier === selectedTier;

      const matchesStock = inStockOnly ? product.stock > 0 : true;

      return matchesSearch && matchesTier && matchesStock;
    });
  }, [productsState, searchQuery, selectedTier, inStockOnly]);

  return (
    <main className="min-h-screen bg-[#1A1A1A] text-[#F9F9F9] selection:bg-[#CC5500]/40 selection:text-white">
      {/* Ambient top navigation header */}
      <nav className="sticky top-0 z-40 border-b border-white/10 bg-[#1A1A1A]/85 backdrop-blur-xl px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="font-mono text-xs font-bold text-orange-400 tracking-widest uppercase hover:text-orange-300 transition-colors flex items-center gap-1.5"
          >
            <span className="w-2 h-2 rounded-full bg-[#CC5500] animate-pulse" />
            Makerverse
          </Link>
          <span className="text-white/20">/</span>
          <span className="font-mono text-xs text-white/50 truncate max-w-[150px] sm:max-w-none">
            {currentBrand.handle}
          </span>
        </div>

        {/* Real Brand Switcher */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full py-1">
          {ALL_BRANDS.map((b) => (
            <Link
              key={b.handle}
              href={`/${b.handle}`}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-mono transition-all whitespace-nowrap",
                b.handle === currentBrand.handle
                  ? "bg-orange-500/20 text-orange-300 border border-orange-500/40 shadow-sm"
                  : "bg-white/5 text-white/50 hover:text-white border border-white/10 hover:border-white/20",
              )}
            >
              {b.name}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowLedgerModal(true)}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-mono text-white/70 transition-colors cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Ledger v2.4</span>
          </button>

          <Link
            href="/vendor"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20 text-xs font-medium text-orange-300 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            <span>Vendor Terminal</span>
          </Link>
        </div>
      </nav>

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-12">
        {/* Brand Hero Header */}
        <section>
          <BrandHero
            brand={currentBrand}
            followerCount={followerCount}
            isFollowing={isFollowingBrand}
            onFollowToggle={handleBrandFollowToggle}
            onOpenLedgerModal={() => setShowLedgerModal(true)}
          />
        </section>

        {/* Product Catalog Section */}
        <section className="space-y-6">
          {/* Header & Filter Controls */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-2 border-b border-white/8">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide uppercase font-mono">
                  Product Catalog
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-white/10 text-[11px] font-mono text-white/60">
                  {filteredProducts.length} items
                </span>
              </div>
              <p className="text-xs text-white/50 mt-0.5">
                Object-centric social craft lines with embedded hardware verification.
              </p>
            </div>

            {/* Search and Stock Filter Bar */}
            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search title, SKU, metal..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-white placeholder-white/30 focus:outline-none focus:border-orange-500/50 transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-xs"
                  >
                    ×
                  </button>
                )}
              </div>

              <button
                onClick={() => setInStockOnly(!inStockOnly)}
                className={cn(
                  "px-3 py-1.5 rounded-xl border text-xs font-mono transition-all cursor-pointer select-none",
                  inStockOnly
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                    : "border-white/10 bg-white/5 text-white/60 hover:text-white",
                )}
              >
                In Stock Only
              </button>
            </div>
          </div>

          {/* Chip Tier Filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-mono scrollbar-none">
            {[
              { id: "ALL", label: "All Tiers" },
              { id: "NTAG424_DNA", label: "Tier 4: NTAG424 Cryptographic DNA" },
              { id: "NTAG_SERIALIZED", label: "Tier 2/3: NTAG Serialized" },
              { id: "QR_REGISTRY", label: "Tier 1: QR Registry" },
            ].map((tier) => (
              <button
                key={tier.id}
                onClick={() => setSelectedTier(tier.id)}
                className={cn(
                  "px-3 py-1.5 rounded-xl border whitespace-nowrap transition-all duration-200 cursor-pointer select-none",
                  selectedTier === tier.id
                    ? "border-[#CC5500]/60 bg-[#CC5500]/15 text-orange-200 font-semibold shadow-[0_0_12px_rgba(204,85,0,0.2)]"
                    : "border-white/10 bg-white/5 text-white/50 hover:border-white/20 hover:text-white/80",
                )}
              >
                {tier.label}
              </button>
            ))}
          </div>

          {/* Products Grid */}
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onInspect={setInspectedProduct}
                  onDemandSignal={handleDemandSignal}
                />
              ))}
            </div>
          ) : (
            <FrostedCard className="text-center py-12 space-y-3">
              <ShoppingBag className="w-10 h-10 text-white/20 mx-auto" />
              <p className="text-sm font-semibold text-white/80">No matching craft items found</p>
              <p className="text-xs font-mono text-white/40 max-w-sm mx-auto">
                Try loosening your filter criteria or clearing the search query.
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedTier("ALL");
                  setInStockOnly(false);
                }}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-mono text-white transition-colors cursor-pointer"
              >
                Reset All Filters
              </button>
            </FrostedCard>
          )}
        </section>

        {/* Shoppable Spatial Drawer Section */}
        {brandPosts.length > 0 && (
          <section className="space-y-5 pt-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400">
                  <Layers className="w-4 h-4" />
                </div>
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide uppercase font-mono">
                  Shoppable Spatial Posts
                </h2>
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#CC5500]/15 border border-[#CC5500]/30">
                  <span className="w-2 h-2 rounded-full bg-[#CC5500] pin-pulse" />
                  <span className="text-[10px] font-mono text-orange-300 font-semibold">
                    Live Spatial Pins
                  </span>
                </div>
              </div>
              <p className="text-xs font-mono text-white/40">
                Interactive real-world craftsman scenes
              </p>
            </div>

            {/* Posts Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {brandPosts.map((post) => (
                <FrostedCard
                  key={post.id}
                  noPadding
                  glowOnHover
                  onClick={() => setActiveSpatialPost(post)}
                  className="group cursor-pointer overflow-hidden flex flex-col h-full border border-white/10 transition-all duration-300 hover:border-orange-500/40"
                >
                  {/* Scene Graphic Container */}
                  <div className="h-44 bg-gradient-to-br from-stone-800 via-stone-900 to-[#121212] relative overflow-hidden flex items-center justify-center">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(204,85,0,0.18),_transparent_70%)]" />
                    <div
                      className="absolute inset-0 opacity-10"
                      style={{
                        backgroundImage:
                          "radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)",
                        backgroundSize: "20px 20px",
                      }}
                    />

                    {/* Scene Icon */}
                    <div className="relative z-10 text-stone-500 group-hover:scale-110 transition-transform duration-300">
                      <MapPin className="w-12 h-12 text-orange-500/40" />
                    </div>

                    {/* Pin Count Pill */}
                    <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-orange-500/40 font-mono text-[10px] font-semibold text-orange-300 flex items-center gap-1.5 shadow-lg">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#CC5500] animate-ping" />
                      <span>
                        {post.pins.length} Pin{post.pins.length !== 1 ? "s" : ""}
                      </span>
                    </div>

                    {/* Open prompt overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                      <span className="px-3 py-1.5 rounded-lg bg-[#CC5500] text-white font-mono text-xs font-semibold shadow-xl flex items-center gap-1.5">
                        <Maximize2 className="w-3.5 h-3.5" />
                        Expand Spatial View
                      </span>
                    </div>
                  </div>

                  {/* Post Metadata */}
                  <div className="p-4 flex flex-col flex-1 gap-2 bg-[#171717]">
                    <p className="text-xs font-medium text-white/90 leading-snug line-clamp-2">
                      {post.caption}
                    </p>

                    <div className="flex items-center gap-1.5 mt-auto pt-2 border-t border-white/5">
                      <MapPin className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                      <span className="font-mono text-[11px] text-white/50 truncate">
                        {post.location}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-white/25 flex-shrink-0" />
                      <span className="font-mono text-[10px] text-white/40">
                        {relativeTime(post.timestamp)}
                      </span>
                    </div>
                  </div>
                </FrostedCard>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Spatial Modal Container */}
      <AnimatePresence>
        {activeSpatialPost && (
          <SpatialModal
            post={activeSpatialPost}
            onClose={() => setActiveSpatialPost(null)}
            onSelectProduct={(product) => {
              setActiveSpatialPost(null);
              setInspectedProduct(product);
            }}
          />
        )}
      </AnimatePresence>

      {/* Hardware Provenance & DNA Inspection Modal */}
      <AnimatePresence>
        {inspectedProduct && (
          <HardwareInspectionModal
            product={inspectedProduct}
            onClose={() => setInspectedProduct(null)}
          />
        )}
      </AnimatePresence>

      {/* Ledger Contract Audit Modal */}
      <AnimatePresence>
        {showLedgerModal && (
          <LedgerAuditModal
            brand={currentBrand}
            onClose={() => setShowLedgerModal(false)}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
