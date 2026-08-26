// components/ui/MonoValue.tsx
"use client";

import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

interface MonoValueProps extends HTMLAttributes<HTMLSpanElement> {
  /** Render in electric-cyan glow mode for telemetry data */
  glow?: "cyan" | "orange" | "white" | "none";
  /** Format cents as dollar amount */
  asCurrency?: boolean;
  /** Truncate long strings (UIDs, hashes) with ellipsis */
  truncate?: boolean;
}

export function MonoValue({
  children,
  className,
  glow = "none",
  asCurrency = false,
  truncate = false,
  ...props
}: MonoValueProps) {
  const glowStyles = {
    cyan: "text-cyan-300 [text-shadow:0_0_12px_rgba(34,211,238,0.6)]",
    orange: "text-orange-400 [text-shadow:0_0_12px_rgba(204,85,0,0.5)]",
    white: "text-[#F9F9F9] [text-shadow:0_0_8px_rgba(249,249,249,0.4)]",
    none: "text-white/70",
  };

  const value =
    asCurrency && typeof children === "number"
      ? `$${(children / 100).toFixed(2)}`
      : children;

  return (
    <span
      className={cn(
        "font-mono text-sm",
        glowStyles[glow],
        truncate && "truncate block max-w-[180px]",
        className,
      )}
      {...props}
    >
      {value}
    </span>
  );
}

/** Thin wrapper specifically for wallet addresses / UIDs */
export function ChipUID({ uid, className }: { uid: string; className?: string }) {
  return (
    <MonoValue
      glow="cyan"
      className={cn("text-xs tracking-widest", className)}
    >
      {uid}
    </MonoValue>
  );
}

/** Formatted price in orange mono */
export function PriceTag({ cents, className }: { cents: number; className?: string }) {
  return (
    <MonoValue glow="orange" asCurrency className={cn("text-base font-semibold", className)}>
      {cents}
    </MonoValue>
  );
}
