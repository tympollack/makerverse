// components/ui/DemandSignalButton.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, BellRing, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DemandSignalButtonProps {
  initialCount: number;
  productId?: string;
  className?: string;
  onSignalChange?: (count: number, active: boolean) => void;
  size?: "sm" | "md";
}

export function DemandSignalButton({
  initialCount,
  productId,
  className,
  onSignalChange,
  size = "sm",
}: DemandSignalButtonProps) {
  const [active, setActive] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [isSignaling, setIsSignaling] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextActive = !active;
    const nextCount = nextActive ? count + 1 : Math.max(0, count - 1);

    setActive(nextActive);
    setCount(nextCount);

    if (nextActive) {
      setIsSignaling(true);
      setShowFeedback(true);
      setTimeout(() => setIsSignaling(false), 800);
      setTimeout(() => setShowFeedback(false), 2400);
    }

    onSignalChange?.(nextCount, nextActive);
  };

  const sizeClasses = {
    sm: "h-8 px-2.5 text-xs gap-2",
    md: "h-9 px-3.5 text-xs gap-2.5",
  };

  return (
    <div className="relative inline-flex items-center">
      <motion.button
        type="button"
        onClick={handleClick}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.94 }}
        transition={{ type: "spring", stiffness: 450, damping: 25 }}
        className={cn(
          "relative inline-flex items-center rounded-lg border font-mono transition-all duration-200 cursor-pointer select-none",
          sizeClasses[size],
          active
            ? "border-amber-500/50 bg-amber-500/15 text-amber-300 shadow-[0_0_16px_rgba(245,158,11,0.2)]"
            : "border-white/10 bg-white/5 text-white/50 hover:border-white/25 hover:text-white/80 hover:bg-white/8",
          className,
        )}
      >
        {/* Pulse ripple ring on activation */}
        {active && (
          <span className="absolute inset-0 rounded-lg bg-amber-400/20 animate-ping pointer-events-none" />
        )}

        <motion.span
          animate={
            isSignaling
              ? {
                  rotate: [0, -20, 20, -15, 15, -6, 6, 0],
                  scale: [1, 1.25, 1.25, 1.1, 1.1, 1],
                }
              : {}
          }
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="flex-shrink-0"
        >
          {active ? (
            <BellRing className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
          ) : (
            <Bell className="w-3.5 h-3.5" />
          )}
        </motion.span>

        <span className="tabular font-medium flex items-center gap-1.5">
          <span>{count}</span>
          <span className="text-[11px] text-white/40 hidden sm:inline">
            {active ? "signaled" : "signals"}
          </span>
        </span>
      </motion.button>

      {/* Floating feedback toast */}
      <AnimatePresence>
        {showFeedback && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: -4, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap z-30 pointer-events-none"
          >
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-stone-900/95 border border-amber-500/40 shadow-xl text-[10px] font-mono text-amber-300">
              <Flame className="w-3 h-3 text-amber-400 fill-amber-400 animate-pulse" />
              <span>Demand RPC Broadcasted</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
