// app/(admin)/vendor/page.tsx
"use client";

import { motion } from "framer-motion";
import {
  Package,
  Clock,
  Zap,
  TrendingUp,
  ArrowUpRight,
  ExternalLink,
} from "lucide-react";
import { FrostedCard } from "@/components/ui/FrostedCard";
import { MonoValue, PriceTag } from "@/components/ui/MonoValue";
import { StatusBadge, ChipTierBadge } from "@/components/ui/StatusBadge";
import { CountdownTimer } from "@/components/ui/CountdownTimer";
import { TELEMETRY, ACTIVE_HOLDS, INVENTORY_ITEMS, POS_TRANSACTIONS } from "@/lib/mock/adminData";
import Link from "next/link";

const STAT_CARDS = [
  {
    label: "Active Followers",
    value: TELEMETRY.activeFollowers.toLocaleString(),
    icon: TrendingUp,
    accent: "text-orange-400",
    glow: "orange" as const,
  },
  {
    label: "Total Royalties",
    value: `$${(TELEMETRY.secondaryRoyaltiesTotal / 100).toFixed(2)}`,
    icon: Zap,
    accent: "text-emerald-400",
    glow: "white" as const,
  },
  {
    label: "Active Holds",
    value: ACTIVE_HOLDS.filter((h) => h.state === "ACTIVE_HOLD").length.toString(),
    icon: Clock,
    accent: "text-amber-400",
    glow: "cyan" as const,
  },
  {
    label: "SKUs In Stock",
    value: INVENTORY_ITEMS.filter((i) => i.status !== "OUT_OF_STOCK").length.toString(),
    icon: Package,
    accent: "text-sky-400",
    glow: "white" as const,
  },
];

export default function VendorDashboardPage() {
  return (
    <div className="space-y-8 max-w-5xl">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.3 }}
          >
            <FrostedCard glowOnHover className="flex flex-col gap-3">
              <div className={`w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center ${stat.accent}`}>
                <stat.icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-mono text-white/35 uppercase tracking-widest">
                  {stat.label}
                </p>
                <MonoValue glow={stat.glow} className="text-2xl font-bold mt-0.5">
                  {stat.value}
                </MonoValue>
              </div>
            </FrostedCard>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active holds preview */}
        <FrostedCard noPadding>
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
            <h2 className="text-xs font-semibold text-white/70 uppercase tracking-widest">
              Active Hold Engine
            </h2>
            <Link
              href="/vendor/holds"
              className="flex items-center gap-1 text-[10px] font-mono text-orange-400 hover:text-orange-300 transition-colors"
            >
              View all <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-white/5">
            {ACTIVE_HOLDS.slice(0, 3).map((hold) => (
              <div key={hold.holdId} className="flex items-center justify-between px-4 py-2.5 gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-white/80 truncate">
                    {hold.productTitle}
                  </p>
                  <MonoValue className="text-[10px] text-white/30">{hold.buyerHandle}</MonoValue>
                </div>
                <StatusBadge variant={hold.state} />
                <CountdownTimer expiresAt={hold.expiresAt} className="w-12 text-right" />
              </div>
            ))}
          </div>
        </FrostedCard>

        {/* Recent POS */}
        <FrostedCard noPadding>
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
            <h2 className="text-xs font-semibold text-white/70 uppercase tracking-widest">
              Recent POS Transactions
            </h2>
            <Link
              href="/vendor/pos"
              className="flex items-center gap-1 text-[10px] font-mono text-orange-400 hover:text-orange-300 transition-colors"
            >
              Open POS <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-white/5">
            {POS_TRANSACTIONS.map((tx) => (
              <div key={tx.txId} className="flex items-center justify-between px-4 py-2.5 gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-white/80 truncate">{tx.productTitle}</p>
                  <MonoValue className="text-[10px] text-white/30">
                    {tx.buyerHandle ?? "Unclaimed"}
                  </MonoValue>
                </div>
                <StatusBadge variant={tx.mode} />
                <StatusBadge variant={tx.status} />
                <PriceTag cents={tx.price} className="text-xs" />
              </div>
            ))}
          </div>
        </FrostedCard>
      </div>

      {/* Inventory snapshot */}
      <FrostedCard noPadding>
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
          <h2 className="text-xs font-semibold text-white/70 uppercase tracking-widest">
            Inventory Snapshot
          </h2>
          <Link
            href="/vendor/inventory"
            className="flex items-center gap-1 text-[10px] font-mono text-orange-400 hover:text-orange-300 transition-colors"
          >
            Manage <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="divide-y divide-white/5">
          {INVENTORY_ITEMS.map((item) => {
            const pct = (item.stock / item.maxStock) * 100;
            return (
              <div key={item.id} className="px-4 py-2.5 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium text-white/80 truncate">{item.title}</p>
                    <ChipTierBadge tier={item.chipTier} />
                  </div>
                  <MonoValue className="text-[10px] text-white/30 mt-0.5">
                    {item.sku}
                  </MonoValue>
                  <div className="h-1 w-32 bg-white/10 rounded-full mt-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        pct > 50 ? "bg-emerald-500" : pct > 20 ? "bg-amber-500" : "bg-red-500"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <MonoValue className="text-xs">
                    {item.stock} / {item.maxStock}
                  </MonoValue>
                  <StatusBadge variant={item.status} className="mt-1" />
                </div>
              </div>
            );
          })}
        </div>
      </FrostedCard>
    </div>
  );
}
