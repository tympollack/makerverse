// app/(shop)/[brandId]/page.tsx
"use client";

import { useState } from "react";
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
} from "lucide-react";
import { FrostedCard } from "@/components/ui/FrostedCard";
import { ProvenanceBadge } from "@/components/ui/ProvenanceBadge";
import { FollowToggle, DemandSignalButton } from "@/components/ui/FollowToggle";
import { MonoValue, PriceTag } from "@/components/ui/MonoValue";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { BRAND_PASSPORT, PRODUCTS, SHOPPABLE_POSTS } from "@/lib/mock/shopData";
import type { Product, ShoppablePost } from "@/lib/mock/shopData";
import { cn, relativeTime } from "@/lib/utils";

// ─── Brand Passport Hero ──────────────────────────────────────────────────────

function BrandHero() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10">
      {/* Banner gradient placeholder */}
      <div className="h-44 bg-gradient-to-br from-orange-950/60 via-stone-900 to-[#1A1A1A] relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(204,85,0,0.18),_transparent_65%)]" />
        {/* Texture dots */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
      </div>

      {/* Content bar */}
      <div className="bg-[#1A1A1A]/80 backdrop-blur-xl border-t border-white/8 px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Avatar */}
        <div className="-mt-12 relative flex-shrink-0">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-700 to-stone-800 border-2 border-white/15 shadow-2xl flex items-center justify-center text-3xl font-bold text-orange-200">
            FC
          </div>
          {BRAND_PASSPORT.isVerified && (
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center shadow-lg">
              <BadgeCheck className="w-3.5 h-3.5 text-white" />
            </div>
          )}
        </div>

        {/* Identity */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-white">{BRAND_PASSPORT.name}</h1>
            {BRAND_PASSPORT.isVerified && (
              <StatusBadge variant="VERIFIED" label="Verified Ledger" />
            )}
          </div>
          <MonoValue className="text-xs text-white/40 mt-0.5">
            {BRAND_PASSPORT.ledgerAddress}
          </MonoValue>
          <p className="text-sm text-white/60 mt-2 max-w-xl leading-relaxed">
            {BRAND_PASSPORT.bio}
          </p>
        </div>

        {/* Stats + Follow */}
        <div className="flex flex-col items-end gap-3 flex-shrink-0">
          <FollowToggle target="brand" size="lg" />
          <div className="flex items-center gap-4 text-right">
            <div>
              <p className="text-xs text-white/40 font-mono">Followers</p>
              <MonoValue glow="white" className="text-base font-semibold">
                {BRAND_PASSPORT.followerCount.toLocaleString()}
              </MonoValue>
            </div>
            <div>
              <p className="text-xs text-white/40 font-mono">Products</p>
              <MonoValue glow="white" className="text-base font-semibold">
                {BRAND_PASSPORT.productCount}
              </MonoValue>
            </div>
            <div>
              <p className="text-xs text-white/40 font-mono">Royalties</p>
              <PriceTag cents={BRAND_PASSPORT.totalRoyaltiesEarned} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Product Card ──────────────────────────────────────────────────────────────

function ProductCard({ product }: { product: Product }) {
  const stockPct = (product.stock / product.maxStock) * 100;
  const isOutOfStock = product.stock === 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <FrostedCard glowOnHover className="flex flex-col h-full gap-3">
        {/* Image placeholder */}
        <div
          className={cn(
            "h-40 rounded-lg bg-gradient-to-br from-stone-800 to-stone-900 relative overflow-hidden flex items-center justify-center",
            isOutOfStock && "opacity-50",
          )}
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(204,85,0,0.08),_transparent)]" />
          <ShoppingBag className="w-10 h-10 text-white/10" />
          {isOutOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg">
              <span className="font-mono text-xs text-white/60 tracking-widest uppercase">
                Out of Stock
              </span>
            </div>
          )}
          {/* Stock bar */}
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                stockPct > 50
                  ? "bg-emerald-500"
                  : stockPct > 20
                    ? "bg-amber-500"
                    : "bg-red-500",
              )}
              style={{ width: `${stockPct}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-2 flex-1">
          <ProvenanceBadge tier={product.chipTier} compact />

          <div>
            <h3 className="font-semibold text-white/90 text-sm leading-tight">
              {product.title}
            </h3>
            <MonoValue className="text-[10px] text-white/30 mt-0.5">
              SKU: {product.sku}
            </MonoValue>
          </div>

          <p className="text-xs text-white/50 leading-relaxed flex-1">
            {product.description}
          </p>

          {/* Price & Stock */}
          <div className="flex items-center justify-between mt-auto">
            <PriceTag cents={product.price} />
            <span className="font-mono text-xs text-white/40">
              {isOutOfStock ? "—" : `${product.stock} / ${product.maxStock} left`}
            </span>
          </div>

          {/* Royalty */}
          <MonoValue className="text-[10px] text-white/25">
            {(product.royaltyBps / 100).toFixed(1)}% secondary royalty · EIP-2981
          </MonoValue>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-white/8">
          <DemandSignalButton count={product.demandSignals} />
          <div className="ml-auto">
            <FollowToggle
              target="product"
              initialFollowed={product.isFollowed}
              size="sm"
            />
          </div>
        </div>
      </FrostedCard>
    </motion.div>
  );
}

// ─── Shoppable Pin ────────────────────────────────────────────────────────────

function ShoppablePin({
  pin,
  onHover,
}: {
  pin: ShoppablePost["pins"][0];
  onHover: (productId: string | null) => void;
}) {
  const product = PRODUCTS.find((p) => p.id === pin.productId);
  const [showTooltip, setShowTooltip] = useState(false);

  const handleEnter = () => {
    setShowTooltip(true);
    onHover(pin.productId);
  };
  const handleLeave = () => {
    setShowTooltip(false);
    onHover(null);
  };

  return (
    <div
      className="absolute"
      style={{ left: `${pin.x}%`, top: `${pin.y}%`, transform: "translate(-50%, -50%)" }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {/* Pulse ring */}
      <span className="absolute inline-flex w-5 h-5 rounded-full bg-orange-500/50 pin-pulse" />
      {/* Dot */}
      <button className="relative w-5 h-5 rounded-full bg-orange-500 border-2 border-white/30 shadow-lg shadow-orange-500/40 cursor-pointer hover:scale-125 transition-transform duration-200" />

      <AnimatePresence>
        {showTooltip && product && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 4 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-20 w-44 pointer-events-none"
          >
            <FrostedCard noPadding className="p-2.5 shadow-2xl">
              <ProvenanceBadge tier={product.chipTier} compact className="mb-1.5" />
              <p className="text-xs font-medium text-white/90 leading-tight">
                {product.title}
              </p>
              <PriceTag cents={product.price} className="text-sm mt-1" />
            </FrostedCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Spatial Drawer ───────────────────────────────────────────────────────────

function ShoppableSpatialDrawer() {
  const [activePost, setActivePost] = useState<ShoppablePost | null>(null);
  const [hoveredProductId, setHoveredProductId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Layers className="w-4 h-4 text-orange-400" />
        <h2 className="text-sm font-semibold text-white/80 uppercase tracking-widest">
          Shoppable Spatial Posts
        </h2>
        <div className="ml-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-400 pin-pulse" />
          <span className="text-[10px] font-mono text-orange-300">Live Pins</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {SHOPPABLE_POSTS.map((post) => (
          <FrostedCard
            key={post.id}
            noPadding
            glowOnHover
            className="cursor-pointer overflow-hidden"
            onClick={() => setActivePost(post)}
          >
            {/* Image placeholder */}
            <div className="h-36 bg-gradient-to-br from-stone-800 to-stone-950 relative flex items-center justify-center">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(204,85,0,0.12),_transparent)]" />
              <MapPin className="w-8 h-8 text-white/10" />
              {/* Pin count badge */}
              <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-orange-500/20 border border-orange-500/30 font-mono text-[10px] text-orange-300">
                {post.pins.length} pin{post.pins.length !== 1 ? "s" : ""}
              </div>
            </div>
            <div className="p-3">
              <p className="text-xs font-medium text-white/80 leading-snug line-clamp-2">
                {post.caption}
              </p>
              <div className="flex items-center gap-1.5 mt-2">
                <MapPin className="w-3 h-3 text-orange-400/60 flex-shrink-0" />
                <span className="font-mono text-[10px] text-white/35 truncate">
                  {post.location}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <Clock className="w-3 h-3 text-white/20 flex-shrink-0" />
                <span className="font-mono text-[10px] text-white/30">
                  {relativeTime(post.timestamp)}
                </span>
              </div>
            </div>
          </FrostedCard>
        ))}
      </div>

      {/* Expanded post drawer */}
      <AnimatePresence>
        {activePost && (
          <motion.div
            key={activePost.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.25 }}
          >
            <FrostedCard noPadding className="overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
                <div>
                  <p className="text-sm font-semibold text-white/90">{activePost.caption}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <MapPin className="w-3 h-3 text-orange-400/60" />
                    <span className="font-mono text-[10px] text-white/40">
                      {activePost.location}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setActivePost(null)}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4 text-white/50" />
                </button>
              </div>

              {/* Spatial image with shoppable pins */}
              <div className="h-72 bg-gradient-to-br from-stone-800 via-stone-900 to-stone-950 relative">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(204,85,0,0.06),_transparent)]" />
                {/* Placeholder grid */}
                <div
                  className="absolute inset-0 opacity-5"
                  style={{
                    backgroundImage:
                      "linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)",
                    backgroundSize: "40px 40px",
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <MapPin className="w-16 h-16 text-white/5" />
                </div>
                {/* Pins */}
                {activePost.pins.map((pin) => (
                  <ShoppablePin
                    key={pin.id}
                    pin={pin}
                    onHover={setHoveredProductId}
                  />
                ))}
              </div>

              {/* Linked products */}
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {activePost.pins.map((pin) => {
                  const product = PRODUCTS.find((p) => p.id === pin.productId);
                  if (!product) return null;
                  return (
                    <div
                      key={pin.id}
                      className={cn(
                        "flex items-center gap-3 p-2.5 rounded-lg border transition-all duration-200",
                        hoveredProductId === product.id
                          ? "border-orange-500/40 bg-orange-500/8"
                          : "border-white/8 bg-white/3",
                      )}
                    >
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-stone-700 to-stone-800 flex items-center justify-center flex-shrink-0">
                        <ShoppingBag className="w-4 h-4 text-white/30" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white/80 truncate">
                          {product.title}
                        </p>
                        <PriceTag cents={product.price} className="text-xs" />
                      </div>
                      <ChevronRight className="w-4 h-4 text-white/20 flex-shrink-0" />
                    </div>
                  );
                })}
              </div>
            </FrostedCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BrandShopPage() {
  return (
    <main className="min-h-screen bg-[#1A1A1A]">
      {/* Top nav strip */}
      <nav className="sticky top-0 z-50 border-b border-white/8 bg-[#1A1A1A]/80 backdrop-blur-xl px-6 py-3 flex items-center gap-3">
        <span className="font-mono text-xs text-orange-400 tracking-widest uppercase">
          Makerverse
        </span>
        <span className="text-white/20">/</span>
        <span className="font-mono text-xs text-white/40">
          {BRAND_PASSPORT.handle}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/vendor"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors text-xs text-white/60 font-medium"
          >
            <ExternalLink className="w-3 h-3" />
            Vendor Admin
          </Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-10">
        {/* Brand Hero */}
        <BrandHero />

        {/* Product Catalog */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white/80 uppercase tracking-widest">
              Product Catalog
            </h2>
            <span className="font-mono text-xs text-white/30">
              {PRODUCTS.length} items
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PRODUCTS.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>

        {/* Spatial Drawer */}
        <section>
          <ShoppableSpatialDrawer />
        </section>
      </div>
    </main>
  );
}
