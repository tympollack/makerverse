// components/admin/VendorDashboardClient.tsx
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Package,
  Clock,
  Zap,
  CalendarDays,
  ArrowUpRight,
  ExternalLink,
} from "lucide-react";
import { FrostedCard } from "@/components/ui/FrostedCard";
import { MonoValue, PriceTag } from "@/components/ui/MonoValue";
import { StatusBadge, ChipTierBadge } from "@/components/ui/StatusBadge";
import { CountdownTimer } from "@/components/ui/CountdownTimer";
import { VersionReleaseBadge } from "@/components/admin/VersionReleaseBadge";
import { resolveBatchLifecycleStatus, type ProductBatch } from "@/lib/drops/lifecycle";
import type { HoldEntry, InventoryItem, POSTransaction } from "@/lib/mock/adminData";

interface VendorDashboardClientProps {
  inventory: InventoryItem[];
  holds: HoldEntry[];
  transactions: POSTransaction[];
  batches: ProductBatch[];
}

export function VendorDashboardClient({
  inventory,
  holds,
  transactions,
  batches,
}: VendorDashboardClientProps) {
  const activeHoldsCount = holds.filter((h) => h.state === "ACTIVE_HOLD").length;
  const inStockCount = inventory.filter((i) => i.status !== "OUT_OF_STOCK").length;
  const activeOrScheduledDrops = batches.filter((b) => {
    const status = resolveBatchLifecycleStatus(b);
    return status === "LIVE" || status === "SCHEDULED";
  }).length;
  const totalPosCents = transactions.reduce((sum, tx) => sum + (tx.price || 0), 0);

  const statCards = [
    {
      label: "Active Drops",
      value: activeOrScheduledDrops.toString(),
      icon: CalendarDays,
      accent: "text-orange-400",
      glow: "orange" as const,
    },
    {
      label: "POS Sales Volume",
      value: `$${(totalPosCents / 100).toFixed(2)}`,
      icon: Zap,
      accent: "text-emerald-400",
      glow: "white" as const,
    },
    {
      label: "Active Holds",
      value: activeHoldsCount.toString(),
      icon: Clock,
      accent: "text-amber-400",
      glow: "cyan" as const,
    },
    {
      label: "SKUs In Stock",
      value: inStockCount.toString(),
      icon: Package,
      accent: "text-sky-400",
      glow: "white" as const,
    },
  ];

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Gateway & SDK Release Banner */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <VersionReleaseBadge variant="banner" />
      </motion.div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
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
          {holds.length === 0 ? (
            <div className="px-4 py-8 text-center font-mono text-xs text-white/40">
              No active cart holds right now.
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {holds.slice(0, 3).map((hold) => (
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
          )}
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
          {transactions.length === 0 ? (
            <div className="px-4 py-8 text-center font-mono text-xs text-white/40">
              No POS transactions recorded yet.
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {transactions.slice(0, 4).map((tx) => (
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
          )}
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
        {inventory.length === 0 ? (
          <div className="px-4 py-8 text-center font-mono text-xs text-white/40">
            No SKUs registered yet. Add your first product in Inventory &amp; NFC.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {inventory.slice(0, 6).map((item) => {
              const pct = item.maxStock > 0 ? Math.min(100, (item.stock / item.maxStock) * 100) : 0;
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
        )}
      </FrostedCard>
    </div>
  );
}
