// components/ui/CountdownTimer.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface CountdownTimerProps {
  /** Unix timestamp (ms) when the hold expires */
  expiresAt: number;
  /** Called when timer hits zero */
  onExpire?: () => void;
  className?: string;
  showMs?: boolean;
}

export function formatTTL(ms: number): string {
  if (ms <= 0) return "00:00";
  const totalSecs = Math.floor(ms / 1000);
  const m = Math.floor(totalSecs / 60)
    .toString()
    .padStart(2, "0");
  const s = (totalSecs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function CountdownTimer({ expiresAt, onExpire, className, showMs = false }: CountdownTimerProps) {
  const [remaining, setRemaining] = useState(() => Math.max(0, expiresAt - Date.now()));
  const expiredRef = useRef(false);

  useEffect(() => {
    expiredRef.current = expiresAt <= Date.now();
    const interval = showMs ? 100 : 250;
    
    const tick = setInterval(() => {
      const r = Math.max(0, expiresAt - Date.now());
      setRemaining(r);
      if (r <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        clearInterval(tick);
        onExpire?.();
      }
    }, interval);
    return () => clearInterval(tick);
  }, [expiresAt, onExpire, showMs]);

  const isExpired = remaining <= 0;
  const isCritical = remaining > 0 && remaining < 60_000; // < 1 min
  const isWarning = remaining >= 60_000 && remaining < 180_000; // < 3 min (1-3 min)

  // Color states: Green (>3m) -> Amber (<3m) -> Pulsing Red (<1m) -> Gray (EXPIRED)
  const colorClass = isExpired
    ? "text-white/35"
    : isCritical
      ? "text-red-400 font-bold"
      : isWarning
        ? "text-amber-400 font-semibold"
        : "text-emerald-400 font-semibold";

  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={isExpired ? "expired" : "ticking"}
        initial={{ opacity: 0, y: -2 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 2 }}
        transition={{ duration: 0.15 }}
        className={cn(
          "font-mono text-sm tabular-nums tracking-wider",
          colorClass,
          isCritical && !isExpired && "animate-pulse",
          className,
        )}
      >
        {isExpired ? "EXPIRED" : formatTTL(remaining)}
      </motion.span>
    </AnimatePresence>
  );
}

/** Compact progress bar that depletes as TTL counts down */
export function TTLBar({
  createdAt,
  expiresAt,
  className,
}: {
  createdAt: number;
  expiresAt: number;
  className?: string;
}) {
  const total = Math.max(1, expiresAt - createdAt);
  const [remaining, setRemaining] = useState(() => Math.max(0, expiresAt - Date.now()));
  const pct = Math.max(0, Math.min(100, (remaining / total) * 100));

  useEffect(() => {
    const tick = setInterval(() => {
      const r = Math.max(0, expiresAt - Date.now());
      setRemaining(r);
    }, 250);
    return () => clearInterval(tick);
  }, [expiresAt]);

  const isExpired = remaining <= 0;
  const isCritical = remaining > 0 && remaining < 60_000; // < 1 min
  const isWarning = remaining >= 60_000 && remaining < 180_000; // < 3 min

  const barColor = isExpired
    ? "bg-white/10"
    : isCritical
      ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.7)]"
      : isWarning
        ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
        : "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]";

  return (
    <div className={cn("h-1.5 w-full rounded-full bg-white/10 overflow-hidden relative", className)}>
      <motion.div
        className={cn(
          "h-full rounded-full transition-all duration-300",
          barColor,
          isCritical && !isExpired && "animate-pulse",
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
