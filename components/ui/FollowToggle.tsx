// components/ui/FollowToggle.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, BellOff, Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type FollowTarget = "brand" | "product";

interface FollowToggleProps {
  target: FollowTarget;
  initialFollowed?: boolean;
  label?: string;
  onToggle?: (isFollowed: boolean) => void;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function FollowToggle({
  target,
  initialFollowed = false,
  label,
  onToggle,
  className,
  size = "md",
}: FollowToggleProps) {
  const [followed, setFollowed] = useState(initialFollowed);
  const [pressed, setPressed] = useState(false);

  const handleToggle = () => {
    const next = !followed;
    setFollowed(next);
    setPressed(true);
    setTimeout(() => setPressed(false), 400);
    onToggle?.(next);
  };

  const sizeClasses = {
    sm: "h-7 px-2.5 text-xs gap-1.5",
    md: "h-8 px-3 text-sm gap-2",
    lg: "h-10 px-4 text-sm gap-2.5",
  };

  const defaultLabel =
    target === "brand"
      ? followed
        ? "Following Brand Line"
        : "Follow Brand Line"
      : followed
        ? "Following Product"
        : "Follow Product Line";

  return (
    <motion.button
      onClick={handleToggle}
      whileTap={{ scale: 0.95 }}
      animate={pressed ? { scale: [1, 1.06, 1] } : {}}
      transition={{ duration: 0.25 }}
      className={cn(
        "relative inline-flex items-center justify-center rounded-lg border font-medium transition-all duration-200 cursor-pointer select-none",
        sizeClasses[size],
        followed
          ? "border-orange-500/40 bg-orange-500/10 text-orange-300 hover:bg-orange-500/20"
          : "border-white/15 bg-white/5 text-white/60 hover:border-white/30 hover:text-white/90",
        className,
      )}
    >
      <AnimatePresence mode="wait">
        {followed ? (
          <motion.span
            key="followed"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            {label ?? defaultLabel}
          </motion.span>
        ) : (
          <motion.span
            key="unfollowed"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            {label ?? defaultLabel}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

/** Bell-style restock notification subscribe button */
export function DemandSignalButton({
  count,
  className,
}: {
  count: number;
  className?: string;
}) {
  const [active, setActive] = useState(false);
  const [localCount, setLocalCount] = useState(count);

  const handleClick = () => {
    if (!active) setLocalCount((c) => c + 1);
    else setLocalCount((c) => Math.max(0, c - 1));
    setActive((a) => !a);
  };

  return (
    <motion.button
      onClick={handleClick}
      whileTap={{ scale: 0.9 }}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-mono text-xs transition-all duration-200 cursor-pointer",
        active
          ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
          : "border-white/10 bg-white/5 text-white/40 hover:text-white/70",
        className,
      )}
    >
      <motion.span
        animate={active ? { rotate: [0, -15, 15, 0] } : {}}
        transition={{ duration: 0.4 }}
      >
        {active ? (
          <Bell className="w-3.5 h-3.5" />
        ) : (
          <BellOff className="w-3.5 h-3.5" />
        )}
      </motion.span>
      <span>{localCount} demand signals</span>
    </motion.button>
  );
}
