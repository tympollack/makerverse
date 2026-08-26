// components/ui/FrostedCard.tsx
"use client";

import { cn } from "@/lib/utils";
import { HTMLAttributes, forwardRef } from "react";

export interface FrostedCardProps extends HTMLAttributes<HTMLDivElement> {
  /** Add a subtle burnt-orange glow border and shadow on hover */
  glowOnHover?: boolean;
  /** Add an electric-cyan glow border on hover */
  cyanGlowOnHover?: boolean;
  /** Remove all internal padding */
  noPadding?: boolean;
}

const FrostedCard = forwardRef<HTMLDivElement, FrostedCardProps>(
  (
    {
      className,
      glowOnHover = false,
      cyanGlowOnHover = false,
      noPadding = false,
      ...props
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          "bg-white/5 backdrop-blur-md border border-white/10 shadow-2xl rounded-xl transition-all duration-300",
          !noPadding && "p-5",
          glowOnHover &&
            "hover:border-[#CC5500]/40 hover:shadow-[0_0_30px_rgba(204,85,0,0.2)]",
          cyanGlowOnHover &&
            "hover:border-cyan-400/40 hover:shadow-[0_0_24px_rgba(34,211,238,0.2)]",
          className,
        )}
        {...props}
      />
    );
  },
);

FrostedCard.displayName = "FrostedCard";
export { FrostedCard };
