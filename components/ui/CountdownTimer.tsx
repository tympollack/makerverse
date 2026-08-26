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
}

function formatTTL(ms: number): string {
  if (ms <= 0) return "00:00";
  const totalSecs = Math.floor(ms / 1000);
  const m = Math.floor(totalSecs / 60)
    .toString()
    .padStart(2, "0");
  const s = (totalSecs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function CountdownTimer({ expiresAt, onExpire, className }: CountdownTimerProps) {
  const [remaining, setRemaining] = useState(() => expiresAt - Date.now());
  const expiredRef = useRef(false);

  useEffect(() => {
    expiredRef.current = false;
    const tick = setInterval(() => {
      const r = expiresAt - Date.now();
      setRemaining(r);
      if (r <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        clearInterval(tick);
        onExpire?.();
      }
    }, 250);
    return () => clearInterval(tick);
  }, [expiresAt, onExpire]);

  const isExpired = remaining <= 0;
  const isCritical = remaining > 0 && remaining < 60_000; // < 1 min
  const isWarning = remaining >= 60_000 && remaining < 180_000; // 1–3 min

  const colorClass = isExpired
    ? "text-red-500"
    : isCritical
      ? "text-red-400"
      : isWarning
        ? "text-amber-400"
        : "text-emerald-400";

  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={isExpired ? "expired" : "ticking"}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 4 }}
        transition={{ duration: 0.15 }}
        className={cn(
          "font-mono text-sm tabular-nums",
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
  const total = expiresAt - createdAt;
  const [pct, setPct] = useState(() =>
    Math.max(0, Math.min(100, ((expiresAt - Date.now()) / total) * 100)),
  );

  useEffect(() => {
    const tick = setInterval(() => {
      const remaining = expiresAt - Date.now();
      setPct(Math.max(0, Math.min(100, (remaining / total) * 100)));
    }, 500);
    return () => clearInterval(tick);
  }, [expiresAt, total]);

  const barColor =
    pct > 50 ? "bg-emerald-500" : pct > 20 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className={cn("h-1 w-full rounded-full bg-white/10 overflow-hidden", className)}>
      <motion.div
        className={cn("h-full rounded-full transition-colors duration-500", barColor)}
        style={{ width: `${pct}%` }}
        transition={{ ease: "linear" }}
      />
    </div>
  );
}
