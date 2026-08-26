// components/admin/EcosystemTelemetryBar.tsx
"use client";

import { useEffect, useState } from "react";
import { Users, DollarSign, Wifi, WifiOff, Sparkles } from "lucide-react";
import { MonoValue } from "@/components/ui/MonoValue";
import { TELEMETRY } from "@/lib/mock/adminData";
import { cn } from "@/lib/utils";

interface EcosystemTelemetryBarProps {
  className?: string;
  condensed?: boolean;
}

export function EcosystemTelemetryBar({ className, condensed = false }: EcosystemTelemetryBarProps) {
  const [latency, setLatency] = useState(TELEMETRY.edgeNodeLatencyMs);
  const [pulse, setPulse] = useState(false);

  // Simulated latency jitter and live heartbeat
  useEffect(() => {
    const interval = setInterval(() => {
      setPulse(true);
      setLatency(11 + Math.floor(Math.random() * 4));
      setTimeout(() => setPulse(false), 600);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const isOnline = TELEMETRY.edgeNodeStatus === "ONLINE" || TELEMETRY.edgeNodeStatus === "CONNECTED";

  return (
    <div
      className={cn(
        "w-full bg-[#121212]/95 backdrop-blur-md border-b border-white/8 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-y-2 gap-x-6 text-xs select-none",
        className,
      )}
    >
      {/* Left: Section label & Live Pulse */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-orange-500/10 border border-orange-500/20 text-[10px] font-mono text-orange-400">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-orange-500" />
          </span>
          <span className="font-semibold tracking-wider uppercase">Live Telemetry</span>
        </div>
        {!condensed && (
          <span className="hidden md:inline font-mono text-[10px] text-white/30">
            Node: us-west-pdx-01
          </span>
        )}
      </div>

      {/* Middle: Key metrics */}
      <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
        {/* Metric 1: Active Profile Followers */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-white/5 border border-white/8 flex items-center justify-center text-white/40">
            <Users className="w-3 h-3 text-cyan-400" />
          </div>
          <div>
            <p className="text-[9px] font-mono text-white/35 uppercase tracking-wider leading-none">
              Followers
            </p>
            <div className="flex items-center gap-1 mt-0.5">
              <MonoValue glow="white" className="text-xs font-semibold leading-none">
                {TELEMETRY.activeFollowers.toLocaleString()}
              </MonoValue>
              <span className="text-[9px] font-mono text-emerald-400 flex items-center">
                +12%
              </span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-white/8 hidden sm:block" />

        {/* Metric 2: Total Secondary Royalties Earned (EIP-2981) */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
            <Sparkles className="w-3 h-3 text-orange-400" />
          </div>
          <div>
            <div className="flex items-center gap-1">
              <p className="text-[9px] font-mono text-white/35 uppercase tracking-wider leading-none">
                Secondary Royalties
              </p>
              <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-orange-500/15 text-orange-300 border border-orange-500/20">
                EIP-2981
              </span>
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <MonoValue glow="orange" asCurrency className="text-xs font-bold leading-none">
                {TELEMETRY.secondaryRoyaltiesTotal}
              </MonoValue>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-white/8 hidden sm:block" />

        {/* Metric 3: MTD Revenue */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <DollarSign className="w-3 h-3 text-emerald-400" />
          </div>
          <div>
            <p className="text-[9px] font-mono text-white/35 uppercase tracking-wider leading-none">
              MTD Revenue
            </p>
            <div className="flex items-center gap-1 mt-0.5">
              <MonoValue glow="cyan" asCurrency className="text-xs font-semibold leading-none">
                {TELEMETRY.mtdRevenue}
              </MonoValue>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Edge Node Connectivity Status & Latency */}
      <div className="flex items-center gap-2.5 ml-auto sm:ml-0 flex-shrink-0">
        <div
          className={cn(
            "flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white/5 border border-white/8 transition-all duration-300",
            pulse && "border-cyan-500/40 bg-cyan-500/10",
          )}
        >
          {isOnline ? (
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-red-400" />
          )}
          <div className="flex items-center gap-1.5 font-mono text-[10px]">
            <span className="text-white/40">node_status:</span>
            <span className={cn("font-bold", isOnline ? "text-emerald-400" : "text-red-400")}>
              ONLINE
            </span>
          </div>
          <span className="text-white/20">|</span>
          <span className="font-mono text-[10px] text-cyan-300 font-semibold tabular">
            {latency}ms
          </span>
        </div>
      </div>
    </div>
  );
}
