// components/shop/DropShareBar.tsx
"use client";

import { useState } from "react";
import { Share2, Copy, Check, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface DropShareBarProps {
  brandName: string;
  brandHandle: string;
  batchLabel?: string;
  mintedCount: number;
  topBidDollars?: number;
  sharePath?: string;
  className?: string;
}

export function DropShareBar({
  brandName,
  brandHandle,
  batchLabel = "Batch 001",
  mintedCount,
  topBidDollars,
  sharePath,
  className,
}: DropShareBarProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedRally, setCopiedRally] = useState(false);

  const normalizedHandle = brandHandle.replace(/^@/, "");
  const path = sharePath || `/${normalizedHandle}`;

  const getShareUrl = () => {
    if (typeof window !== "undefined" && window.location?.origin) {
      return `${window.location.origin}${path}`;
    }
    return `https://makerverse.sunshade.icu${path}`;
  };

  const nextMilestone = mintedCount < 69 ? 69 : mintedCount < 420 ? 420 : mintedCount + 25;
  const rallyText =
    mintedCount > 0
      ? `Help push ${batchLabel} past ${nextMilestone} shirts on ${brandName} (${mintedCount} minted so far${
          topBidDollars ? ` · #069 bid $${topBidDollars}` : ""
        }) →`
      : `Join ${batchLabel} on ${brandName} (${normalizedHandle}) →`;

  const handleCopyDropLink = async () => {
    const url = getShareUrl();
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard API unavailable in non-HTTPS test context
    }
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleRallyShare = async () => {
    const url = getShareUrl();
    const fullMessage = `${rallyText} ${url}`;
    try {
      await navigator.clipboard.writeText(fullMessage);
    } catch {
      // Fallback gracefully
    }
    setCopiedRally(true);
    setTimeout(() => setCopiedRally(false), 2200);
  };

  const xIntentHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    `${rallyText} ${getShareUrl()}`,
  )}`;

  return (
    <div
      className={cn(
        "rounded-xl bg-white/5 border border-white/10 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3",
        className,
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-7 h-7 rounded-lg bg-[#CC5500]/20 border border-[#CC5500]/40 flex items-center justify-center text-[#CC5500] flex-shrink-0">
          <Share2 className="w-3.5 h-3.5" />
        </div>
        <div className="min-w-0">
          <p className="font-mono text-xs font-bold text-white truncate">
            Rally the Pool · {mintedCount} Minted
          </p>
          <p className="font-mono text-[10px] text-white/50 truncate">{rallyText}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={handleCopyDropLink}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/15 font-mono text-xs text-white transition-colors cursor-pointer"
        >
          {copiedLink ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-300 font-bold">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-cyan-300" />
              <span>Copy Drop Link</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleRallyShare}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#CC5500] hover:bg-[#e0621a] border border-[#CC5500]/60 font-mono text-xs font-bold text-white shadow-[0_0_16px_rgba(204,85,0,0.3)] transition-colors cursor-pointer"
        >
          {copiedRally ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Rally Text Copied!</span>
            </>
          ) : (
            <>
              <Share2 className="w-3.5 h-3.5" />
              <span>Share to X / Group Chat</span>
            </>
          )}
        </button>

        <a
          href={xIntentHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open X share intent"
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-colors"
          title="Post directly to X"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}
