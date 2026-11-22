// components/shop/ProductVisual.tsx
"use client";

import { ShoppingBag, Tag } from "lucide-react";
import { ProvenanceBadge } from "@/components/ui/ProvenanceBadge";
import type { Product } from "@/lib/mock/shopData";
import { cn } from "@/lib/utils";

export function ProductVisual({ product }: { product: Product }) {
  const isOutOfStock = product.stock === 0;

  const renderVisual = () => {
    switch (product.id) {
      case "prod_001":
        return (
          <svg className="w-24 h-24 text-orange-500/80" viewBox="0 0 100 100" fill="none" stroke="currentColor">
            <circle cx="50" cy="45" r="28" strokeWidth="6" className="text-orange-600/60" />
            <circle cx="50" cy="45" r="22" strokeWidth="2" strokeDasharray="3 3" className="text-amber-400/50" />
            <rect x="42" y="66" width="16" height="24" rx="4" fill="currentColor" fillOpacity="0.2" strokeWidth="3" className="text-stone-400" />
            <circle cx="50" cy="78" r="3" fill="#22D3EE" className="animate-pulse" />
          </svg>
        );
      case "prod_002":
        return (
          <svg className="w-24 h-24 text-amber-700/80" viewBox="0 0 100 100" fill="none" stroke="currentColor">
            <rect x="22" y="28" width="56" height="44" rx="6" strokeWidth="4" className="text-amber-800/80" fill="#78350F" fillOpacity="0.2" />
            <line x1="22" y1="50" x2="78" y2="50" strokeWidth="2" strokeDasharray="4 2" className="text-amber-300/40" />
            <path d="M50 28 V 72" strokeWidth="2" strokeDasharray="2 2" className="text-amber-400/30" />
            <circle cx="68" cy="60" r="4" fill="#22D3EE" fillOpacity="0.8" className="animate-pulse" />
          </svg>
        );
      case "prod_003":
        return (
          <svg className="w-24 h-24 text-stone-400" viewBox="0 0 100 100" fill="none" stroke="currentColor">
            <polygon points="25,25 78,48 25,72" strokeWidth="4" className="text-stone-400/80" fill="#44403C" fillOpacity="0.3" />
            <circle cx="40" cy="48" r="6" strokeWidth="2" className="text-orange-400" />
            <rect x="22" y="20" width="6" height="60" rx="2" fill="currentColor" className="text-stone-500" />
          </svg>
        );
      case "prod_004":
        return (
          <svg className="w-24 h-24 text-orange-400" viewBox="0 0 100 100" fill="none" stroke="currentColor">
            <ellipse cx="50" cy="50" rx="32" ry="20" strokeWidth="5" className="text-orange-600/70" />
            <ellipse cx="50" cy="50" rx="32" ry="20" strokeWidth="2" strokeDasharray="6 6" className="text-amber-300/60" />
            <circle cx="50" cy="30" r="4" fill="#CC5500" />
            <circle cx="50" cy="70" r="4" fill="#CC5500" />
          </svg>
        );
      case "prod_005":
        return (
          <svg className="w-24 h-24 text-amber-600/80" viewBox="0 0 100 100" fill="none" stroke="currentColor">
            <path d="M40 20 H60 L68 70 A18 18 0 0 1 32 70 Z" strokeWidth="4" className="text-amber-700/80" fill="#92400E" fillOpacity="0.2" />
            <circle cx="50" cy="32" r="5" strokeWidth="3" className="text-amber-300" />
            <circle cx="50" cy="65" r="4" fill="#8B5CF6" className="animate-pulse" />
          </svg>
        );
      case "prod_006":
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
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(204,85,0,0.12),_transparent_70%)]" />
      <div
        className="absolute inset-0 opacity-15"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.2) 1px, transparent 1px)",
          backgroundSize: "18px 18px",
        }}
      />

      <div className="relative z-10 drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] transition-transform duration-300 group-hover:scale-105">
        {renderVisual()}
      </div>

      {isOutOfStock && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/65 backdrop-blur-[2px]">
          <div className="px-3.5 py-1.5 rounded-lg border border-red-500/40 bg-red-500/10 text-red-300 font-mono text-xs font-semibold tracking-wider uppercase shadow-lg">
            Sold Out · Restock Queued
          </div>
        </div>
      )}

      <div className="absolute top-2.5 right-2.5 z-10">
        <ProvenanceBadge tier={product.chipTier} compact interactive />
      </div>

      <div className="absolute bottom-2.5 left-2.5 z-10">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/50 border border-white/10 text-[10px] font-mono text-white/50">
          <Tag className="w-2.5 h-2.5 text-orange-400" />
          {product.materials[0]}
        </span>
      </div>
    </div>
  );
}
