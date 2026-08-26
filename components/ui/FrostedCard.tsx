// components/ui/FrostedCard.tsx
"use client";

import { cn } from "@/lib/utils";
import { HTMLAttributes, forwardRef } from "react";

interface FrostedCardProps extends HTMLAttributes<HTMLDivElement> {
  /** Add a subtle burnt-orange glow border on hover */
  glowOnHover?: boolean;
  /** Remove all internal padding */
  noPadding?: boolean;
}

const FrostedCard = forwardRef<HTMLDivElement, FrostedCardProps>(
  ({ className, glowOnHover = false, noPadding = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "bg-white/5 backdrop-blur-md border border-white/10 shadow-2xl rounded-xl",
          !noPadding && "p-5",
          glowOnHover &&
            "transition-all duration-300 hover:border-orange-500/40 hover:shadow-[0_0_30px_rgba(204,85,0,0.15)]",
          className,
        )}
        {...props}
      />
    );
  },
);

FrostedCard.displayName = "FrostedCard";
export { FrostedCard };
