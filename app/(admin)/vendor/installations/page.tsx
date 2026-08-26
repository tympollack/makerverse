// app/(admin)/vendor/installations/page.tsx
"use client";

import { FrostedCard } from "@/components/ui/FrostedCard";
import { MonoValue } from "@/components/ui/MonoValue";
import { Cpu, Wifi, MapPin, Activity, Plus } from "lucide-react";

const MOCK_INSTALLATIONS = [
  {
    id: "inst_001",
    name: "Booth 14 — Portland Saturday Market",
    type: "Shoppable Booth Trigger",
    chipCount: 8,
    status: "ONLINE" as const,
    lastPing: "2m ago",
    location: "Hawthorne District · PDX",
    triggerCount: 47,
  },
  {
    id: "inst_002",
    name: "Studio Display — Forge HQ",
    type: "Inventory Kiosk",
    chipCount: 24,
    status: "ONLINE" as const,
    lastPing: "5m ago",
    location: "Inner SE Portland · OR",
    triggerCount: 12,
  },
  {
    id: "inst_003",
    name: "Maker Faire Booth — Hall B",
    type: "Event Installation",
    chipCount: 16,
    status: "OFFLINE" as const,
    lastPing: "3d ago",
    location: "Portland Expo Center",
    triggerCount: 203,
  },
];

export default function InstallationsPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white">Interactive Installations</h1>
          <p className="text-xs font-mono text-white/35 mt-0.5">
            Real-world booth triggers · Kiosks · Event deployments
          </p>
        </div>
        <button className="btn-cta flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" />
          Register Installation
        </button>
      </div>

      {/* Installations */}
      <div className="grid grid-cols-1 gap-4">
        {MOCK_INSTALLATIONS.map((inst) => (
          <FrostedCard key={inst.id} glowOnHover className="flex items-start gap-5">
            {/* Status indicator */}
            <div
              className={`mt-1 flex-shrink-0 w-2 h-2 rounded-full ${
                inst.status === "ONLINE" ? "bg-emerald-400" : "bg-red-500"
              }`}
            />

            {/* Icon */}
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
              <Cpu className="w-5 h-5 text-white/30" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-white/90">{inst.name}</p>
                <span
                  className={`font-mono text-[9px] px-2 py-0.5 rounded border uppercase ${
                    inst.status === "ONLINE"
                      ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                      : "text-red-400 border-red-500/30 bg-red-500/10"
                  }`}
                >
                  {inst.status}
                </span>
              </div>
              <p className="text-xs text-white/40 mt-0.5">{inst.type}</p>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-white/25" />
                  <MonoValue className="text-[10px] text-white/35">{inst.location}</MonoValue>
                </div>
                <div className="flex items-center gap-1.5">
                  <Wifi className="w-3 h-3 text-white/25" />
                  <MonoValue className="text-[10px] text-white/35">
                    Last ping: {inst.lastPing}
                  </MonoValue>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-6 flex-shrink-0">
              <div className="text-right">
                <MonoValue glow="white" className="text-lg font-bold">
                  {inst.chipCount}
                </MonoValue>
                <p className="text-[9px] font-mono text-white/25 uppercase">Chips</p>
              </div>
              <div className="text-right">
                <MonoValue glow="cyan" className="text-lg font-bold">
                  {inst.triggerCount}
                </MonoValue>
                <p className="text-[9px] font-mono text-white/25 uppercase">Triggers</p>
              </div>
            </div>
          </FrostedCard>
        ))}
      </div>

      {/* Coming soon placeholder */}
      <FrostedCard className="flex flex-col items-center gap-3 py-10 border-dashed">
        <Activity className="w-8 h-8 text-white/15" />
        <p className="text-sm font-medium text-white/30">Real-time booth trigger map coming soon</p>
        <p className="text-xs font-mono text-white/15 text-center max-w-xs">
          Interactive spatial map of all active installations with live tap heatmaps
        </p>
      </FrostedCard>
    </div>
  );
}
