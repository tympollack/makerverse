// components/ui/FollowToggle.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Plus, Radio, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export type FollowTarget = "brand" | "product";

export interface FollowToggleProps {
  target: FollowTarget;
  initialFollowed?: boolean;
  label?: string;
  followingLabel?: string;
  onToggle?: (isFollowed: boolean) => void;
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "ghost" | "chip";
  showIcon?: boolean;
}

export function FollowToggle({
  target,
  initialFollowed = false,
  label,
  followingLabel,
  onToggle,
  className,
  size = "md",
  variant = "primary",
  showIcon = true,
}: FollowToggleProps) {
  const [followed, setFollowed] = useState(initialFollowed);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !followed;
    setFollowed(next);
    onToggle?.(next);
  };

  const sizeClasses = {
    sm: "h-7 px-2.5 text-xs gap-1.5",
    md: "h-8 px-3.5 text-xs gap-2",
    lg: "h-10 px-5 text-sm gap-2.5 font-medium",
  };

  const defaultUnfollowedLabel =
    target === "brand" ? "Follow Brand Line" : "Follow Line";
  const defaultFollowedLabel =
    target === "brand" ? "Following Brand Line" : "Following Line";

  const currentLabel = followed
    ? followingLabel ?? defaultFollowedLabel
    : label ?? defaultUnfollowedLabel;

  return (
    <motion.button
      type="button"
      onClick={handleToggle}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 450, damping: 25 }}
      className={cn(
        "relative inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 cursor-pointer select-none overflow-hidden",
        sizeClasses[size],
        followed
          ? "border border-[#CC5500]/50 bg-[#CC5500]/15 text-orange-200 shadow-[0_0_20px_rgba(204,85,0,0.25)] hover:bg-[#CC5500]/25"
          : variant === "primary"
            ? "bg-[#CC5500] hover:bg-[#E0621A] text-[#F9F9F9] shadow-[0_0_20px_rgba(204,85,0,0.3)] border border-[#CC5500]/50"
            : "border border-white/15 bg-white/5 text-white/70 hover:border-white/30 hover:text-white hover:bg-white/10",
        className,
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        {followed ? (
          <motion.span
            key="followed"
            initial={{ opacity: 0, y: 6, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="flex items-center gap-1.5"
          >
            {showIcon && (
              <motion.span
                initial={{ rotate: -45, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 600, damping: 20 }}
              >
                <Check className="w-3.5 h-3.5 text-orange-400 stroke-[2.5]" />
              </motion.span>
            )}
            <span>{currentLabel}</span>
          </motion.span>
        ) : (
          <motion.span
            key="unfollowed"
            initial={{ opacity: 0, y: 6, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="flex items-center gap-1.5"
          >
            {showIcon && (
              <motion.span
                initial={{ rotate: 45, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 600, damping: 20 }}
              >
                {target === "brand" ? (
                  <Radio className="w-3.5 h-3.5" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
              </motion.span>
            )}
            <span>{currentLabel}</span>
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
