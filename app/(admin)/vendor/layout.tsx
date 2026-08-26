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
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EcosystemTelemetryBar } from "@/components/admin/EcosystemTelemetryBar";

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
    label: "Cart Holds",
    icon: ShoppingCart,
    exact: false,
  },
  {
    href: "/vendor/pos",
    label: "POS Terminal",
    icon: Zap,
    exact: false,
  },
  {
    href: "/vendor/installations",
    label: "Installations",
    icon: Cpu,
    exact: false,
  },
];

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-[#1A1A1A] text-[#F9F9F9]">
      {/* Collapsible Sidebar Navigation */}
      <motion.aside
        animate={{ width: collapsed ? 64 : 230 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="flex-shrink-0 flex flex-col border-r border-white/8 bg-[#141414] overflow-hidden relative z-20"
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between px-3.5 py-4 border-b border-white/8 min-h-[58px]">
          <Link href="/vendor" className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#CC5500] to-[#8C3A00] flex-shrink-0 flex items-center justify-center shadow-[0_0_12px_rgba(204,85,0,0.35)]">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.15 }}
                  className="flex flex-col truncate"
                >
                  <span className="font-mono text-xs font-bold text-orange-200 tracking-wider">
                    MAKERVERSE
                  </span>
                  <span className="font-mono text-[9px] text-white/35 uppercase tracking-widest">
                    Vendor Admin
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </Link>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 py-4 space-y-1 px-2">
          {NAV_ITEMS.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href) && item.href !== "/vendor";
            const active = isActive;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group relative",
                  active
                    ? "bg-[#CC5500]/15 text-orange-300 border border-[#CC5500]/35 shadow-[0_0_16px_rgba(204,85,0,0.18)]"
                    : "text-white/45 hover:text-white/80 hover:bg-white/5 border border-transparent",
                )}
                title={collapsed ? item.label : undefined}
              >
                {/* Active left indicator bar */}
                {active && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#CC5500] rounded-r shadow-[0_0_8px_rgba(204,85,0,0.8)]" />
                )}
                <item.icon
                  className={cn(
                    "w-4 h-4 flex-shrink-0 transition-colors",
                    active ? "text-[#CC5500]" : "text-white/40 group-hover:text-white/70",
                  )}
                />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -6 }}
                      transition={{ duration: 0.12 }}
                      className="text-xs font-medium tracking-wide whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            );
          })}
        </nav>

        {/* Studio Provenance Seal */}
        {!collapsed && (
          <div className="px-3 pb-3">
            <div className="p-2.5 rounded-lg bg-white/3 border border-white/6 flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-md bg-[#CC5500]/15 border border-[#CC5500]/30 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-3.5 h-3.5 text-[#CC5500]" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-white/80 truncate">The Forge Collective</p>
                <p className="text-[9px] font-mono text-white/30 truncate">0x4f3E...9aB2 · Verified</p>
              </div>
            </div>
          </div>
        )}

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="flex items-center justify-center h-10 border-t border-white/8 text-white/30 hover:text-white/80 hover:bg-white/5 transition-colors cursor-pointer"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <div className="flex items-center gap-2 font-mono text-[10px]">
              <ChevronLeft className="w-4 h-4" />
              <span>Collapse Sidebar</span>
            </div>
          )}
        </button>
      </motion.aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Ecosystem Telemetry Bar (Live Horizontal Bar) */}
        <EcosystemTelemetryBar />

        {/* Page Content Viewport */}
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="max-w-7xl mx-auto"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
