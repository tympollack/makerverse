// components/admin/VersionReleaseBadge.tsx
"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Layers,
  Cpu,
  ShieldCheck,
  CheckCircle2,
  X,
  ExternalLink,
  Zap,
  Radio,
  Sparkles,
  Lock,
  ChevronRight,
} from "lucide-react";
import { sdk, MAKERVERSE_RELEASE_VERSION } from "@/lib/version";
import { cn } from "@/lib/utils";

interface VersionReleaseBadgeProps {
  className?: string;
  variant?: "pill" | "badge" | "subtle" | "banner";
  showModalOnClick?: boolean;
}

export function VersionReleaseBadge({
  className,
  variant = "pill",
  showModalOnClick = true,
}: VersionReleaseBadgeProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const version = sdk.version.toString(); // e.g. "v0.1.0"
  const activeFeatures = sdk.featureGates.getActiveFeatures();
  const allFeatures = sdk.featureGates.getAllFeatures();

  const handshakeResult = sdk.validateHandshake({
    gatewayVersion: sdk.version,
    minSupportedVersion: "0.1.0",
    recommendedVersion: "0.1.0",
  });

  const isCompatible = handshakeResult.status === "compatible";

  return (
    <>
      {variant === "pill" && (
        <button
          type="button"
          onClick={() => showModalOnClick && setModalOpen(true)}
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 font-mono text-[10px] tracking-wider transition-all duration-200 hover:bg-cyan-500/20 hover:border-cyan-500/40 cursor-pointer select-none",
            className
          )}
          title="Click to view SDK & Gateway Version Info"
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-500" />
          </span>
          <span className="font-bold">SDK {version}</span>
          <span className="text-cyan-400/50">·</span>
          <span className="text-[9px] uppercase font-semibold text-emerald-400">Release</span>
        </button>
      )}

      {variant === "badge" && (
        <button
          type="button"
          onClick={() => showModalOnClick && setModalOpen(true)}
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/70 font-mono text-[9px] tracking-wider transition-colors hover:bg-white/10 hover:text-white cursor-pointer select-none",
            className
          )}
        >
          <Layers className="w-3 h-3 text-cyan-400" />
          <span>{version}</span>
        </button>
      )}

      {variant === "subtle" && (
        <span className={cn("font-mono text-[10px] text-white/40 select-none", className)}>
          {version}
        </span>
      )}

      {variant === "banner" && (
        <div
          className={cn(
            "p-3 rounded-xl bg-gradient-to-r from-cyan-950/40 via-orange-950/20 to-transparent border border-cyan-500/20 flex flex-wrap items-center justify-between gap-3 text-xs select-none",
            className
          )}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 flex-shrink-0">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white/90">Ecosystem Gateway Online</span>
                <span className="px-1.5 py-0.2 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-[9px] font-bold">
                  {version} RELEASE
                </span>
              </div>
              <p className="text-[10px] font-mono text-white/40 mt-0.5">
                Central Semantic Versioning & Feature Gating Engine Active
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-mono text-cyan-300 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>Gateway Diagnostics</span>
            <ChevronRight className="w-3 h-3 text-cyan-400" />
          </button>
        </div>
      )}

      {/* System Version & Handshake Info Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="w-full max-w-lg rounded-2xl bg-[#141414] border border-white/12 shadow-[0_0_40px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 bg-[#181818]">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500/20 to-orange-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">Makerverse Ecosystem Version</h3>
                    <p className="text-[10px] font-mono text-white/40">makerverse_sdk v{MAKERVERSE_RELEASE_VERSION}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
                {/* Handshake Status Card */}
                <div className="p-3.5 rounded-xl bg-white/3 border border-white/8 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">
                      Gateway Handshake Status
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-bold">
                      <CheckCircle2 className="w-3 h-3" />
                      {handshakeResult.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-white/70 leading-relaxed">
                    {handshakeResult.message}
                  </p>
                </div>

                {/* Version Contract Matrix */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-xl bg-white/3 border border-white/8">
                    <p className="text-[9px] font-mono text-white/40 uppercase tracking-wider">Client SDK Version</p>
                    <p className="text-sm font-mono font-bold text-cyan-300 mt-0.5">{version}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/3 border border-white/8">
                    <p className="text-[9px] font-mono text-white/40 uppercase tracking-wider">Gateway Baseline</p>
                    <p className="text-sm font-mono font-bold text-orange-400 mt-0.5">
                      {handshakeResult.gatewayVersion.toString()}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/3 border border-white/8">
                    <p className="text-[9px] font-mono text-white/40 uppercase tracking-wider">Min Supported Range</p>
                    <p className="text-sm font-mono font-bold text-white/80 mt-0.5">
                      {handshakeResult.minSupportedVersion.toString()}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/3 border border-white/8">
                    <p className="text-[9px] font-mono text-white/40 uppercase tracking-wider">Polyrepo Range Lock</p>
                    <p className="text-sm font-mono font-bold text-emerald-400 mt-0.5">^{MAKERVERSE_RELEASE_VERSION}</p>
                  </div>
                </div>

                {/* Feature Gates Catalog for v0.1.0 */}
                <div className="p-3.5 rounded-xl bg-white/3 border border-white/8 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">
                      SemVer Feature Gating Engine
                    </span>
                    <span className="text-[10px] font-mono text-cyan-400">
                      {activeFeatures.length} Active / {allFeatures.length} Total
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {allFeatures.map((feat) => {
                      const isSupported = sdk.supportsFeature(feat.key);
                      return (
                        <div
                          key={feat.key}
                          className="flex items-center justify-between p-2 rounded-lg bg-white/2 border border-white/5 text-xs"
                        >
                          <div className="min-w-0 pr-2">
                            <p className="font-mono text-[11px] font-semibold text-white/90 truncate">
                              {feat.key}
                            </p>
                            <p className="text-[10px] text-white/40 truncate">{feat.description}</p>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className="text-[9px] font-mono text-white/30">
                              min: {typeof feat.minVersion === "string" ? feat.minVersion : feat.minVersion?.toString() ?? "0.1.0"}
                            </span>
                            {isSupported ? (
                              <span className="px-1.5 py-0.2 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-[9px] font-bold">
                                ACTIVE
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded bg-white/5 border border-white/10 text-white/30 font-mono text-[9px]">
                                LOCKED
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Middleware Guardrails Summary */}
                <div className="p-3 rounded-xl bg-white/3 border border-white/8 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-orange-400" />
                    <div>
                      <p className="font-semibold text-white/80">Stream & API Interceptor Guardrails</p>
                      <p className="text-[10px] font-mono text-white/40">Strict Major Bounds & Payload Header Enforcement</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-orange-500/15 border border-orange-500/30 text-orange-400 font-mono text-[10px] font-bold">
                    ENFORCED
                  </span>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-5 py-3 border-t border-white/8 bg-[#181818] flex items-center justify-between text-[10px] font-mono text-white/40">
                <span>Release: v{MAKERVERSE_RELEASE_VERSION} (Initial Release)</span>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
