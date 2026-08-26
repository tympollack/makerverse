// app/(admin)/vendor/layout.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package,
  ShoppingCart,
  Cpu,
  Zap,
  Activity,
  Users,
  DollarSign,
  Wifi,
  WifiOff,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MonoValue } from "@/components/ui/MonoValue";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TELEMETRY } from "@/lib/mock/adminData";

// ─── Nav Items ────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  {
    href: "/vendor",
    label: "Dashboard",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    href: "/vendor/inventory",
    label: "Inventory & NFC",
    icon: Package,
    exact: false,
  },
  {
    href: "/vendor/holds",
    label: "Commerce & Holds",
    icon: ShoppingCart,
    exact: false,
  },
  {
    href: "/vendor/installations",
    label: "Installations",
    icon: Cpu,
    exact: false,
  },
  {
    href: "/vendor/pos",
    label: "POS Handshake",
    icon: Zap,
    exact: false,
  },
];

// ─── Telemetry Bar ────────────────────────────────────────────────────────────

function TelemetryBar({ collapsed }: { collapsed: boolean }) {
  const isConnected = TELEMETRY.edgeNodeStatus === "CONNECTED";

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-3 px-2 py-4 border-t border-white/8">
        <div
          className={cn(
            "w-2 h-2 rounded-full",
            isConnected ? "bg-emerald-400" : "bg-red-400",
          )}
          title={`Edge: ${TELEMETRY.edgeNodeStatus}`}
        />
      </div>
    );
  }

  return (
    <div className="border-t border-white/8 px-3 py-3 space-y-2">
      <p className="font-mono text-[9px] text-white/25 uppercase tracking-widest px-1">
        Ecosystem Telemetry
      </p>

      {/* Followers */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-white/40">
          <Users className="w-3 h-3" />
          <span className="text-[10px] font-mono">Followers</span>
        </div>
        <MonoValue glow="white" className="text-xs">
          {TELEMETRY.activeFollowers.toLocaleString()}
        </MonoValue>
      </div>

      {/* Royalties */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-white/40">
          <DollarSign className="w-3 h-3" />
          <span className="text-[10px] font-mono">Royalties</span>
        </div>
        <MonoValue glow="orange" asCurrency className="text-xs">
          {TELEMETRY.secondaryRoyaltiesTotal}
        </MonoValue>
      </div>

      {/* MTD royalties */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-white/30">
          <Activity className="w-3 h-3" />
          <span className="text-[10px] font-mono">This Month</span>
        </div>
        <MonoValue glow="orange" asCurrency className="text-[10px]">
          {TELEMETRY.secondaryRoyaltiesThisMonth}
        </MonoValue>
      </div>

      {/* Edge node */}
      <div className="mt-2 flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/8">
        <div className="flex items-center gap-1.5">
          {isConnected ? (
            <Wifi className="w-3 h-3 text-emerald-400" />
          ) : (
            <WifiOff className="w-3 h-3 text-red-400" />
          )}
          <span className="text-[10px] font-mono text-white/40">Edge Node</span>
        </div>
        <div className="flex items-center gap-1.5">
          <StatusBadge
            variant={TELEMETRY.edgeNodeStatus}
            label={TELEMETRY.edgeNodeStatus === "CONNECTED" ? "Connected" : TELEMETRY.edgeNodeStatus}
            dot
          />
          <MonoValue className="text-[9px] text-white/25">
            {TELEMETRY.edgeNodeLatencyMs}ms
          </MonoValue>
        </div>
      </div>
    </div>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-[#1A1A1A]">
      {/* Sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 64 : 220 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className="flex-shrink-0 flex flex-col border-r border-white/8 bg-[#151515] overflow-hidden relative z-10"
      >
        {/* Logo / brand */}
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-white/8 min-h-[57px]">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-600 to-orange-800 flex-shrink-0 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className="font-mono text-xs font-bold text-orange-300 tracking-wider whitespace-nowrap"
              >
                MAKERVERSE
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-3 space-y-0.5 px-2">
          {NAV_ITEMS.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href) && item.href !== "/vendor";
            const isDashboard = item.exact && pathname === item.href;
            const active = isDashboard || isActive;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all duration-150 group",
                  active
                    ? "bg-orange-500/15 text-orange-300 border border-orange-500/25"
                    : "text-white/40 hover:text-white/70 hover:bg-white/5 border border-transparent",
                )}
                title={collapsed ? item.label : undefined}
              >
                <item.icon
                  className={cn(
                    "w-4 h-4 flex-shrink-0 transition-colors",
                    active ? "text-orange-400" : "text-white/30 group-hover:text-white/60",
                  )}
                />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -6 }}
                      transition={{ duration: 0.12 }}
                      className="text-xs font-medium whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            );
          })}
        </nav>

        {/* Telemetry */}
        <TelemetryBar collapsed={collapsed} />

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="flex items-center justify-center h-9 border-t border-white/8 text-white/25 hover:text-white/60 hover:bg-white/5 transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-3.5 h-3.5" />
          ) : (
            <ChevronLeft className="w-3.5 h-3.5" />
          )}
        </button>
      </motion.aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="flex items-center gap-4 px-6 py-3 border-b border-white/8 bg-[#1A1A1A]/60 backdrop-blur-md sticky top-0 z-10">
          <div className="flex-1">
            <span className="font-mono text-[10px] text-white/25 uppercase tracking-widest">
              Vendor Admin
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/8">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono text-[10px] text-white/40">
                {TELEMETRY.activeSessions} active sessions
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20">
              <Activity className="w-3 h-3 text-orange-400" />
              <span className="font-mono text-[10px] text-orange-300">
                {TELEMETRY.pendingMints} pending mints
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
