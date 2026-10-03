// components/admin/BoothEngine.tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Users,
  Trophy,
  Cpu,
  Wifi,
  Radio,
  Sliders,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  RefreshCw,
  Gift,
  Copy,
  Check,
  QrCode,
  Zap,
  ShieldCheck,
  Plus,
  Play,
  Pause,
  MapPin,
  Flame,
  Award,
  Send,
} from "lucide-react";
import { FrostedCard } from "@/components/ui/FrostedCard";
import { MonoValue, ChipUID } from "@/components/ui/MonoValue";
import { VersionReleaseBadge } from "@/components/admin/VersionReleaseBadge";
import {
  MOCK_INSTALLATIONS,
  INITIAL_GUESTBOOK_ENTRIES,
  RAFFLE_REWARD_TIERS,
  INITIAL_RAFFLE_ATTEMPTS,
  type BoothInstallation,
  type GuestbookEntry,
  type RaffleAttempt,
  type AttendeeTier,
  type CheckInTapType,
} from "@/lib/mock/adminData";
import { cn, relativeTime } from "@/lib/utils";

export type BoothEngineMode = "GUESTBOOK" | "RAFFLE" | "OVERVIEW";

// ─── Attendee Tier Style Map ──────────────────────────────────────────────────

const ATTENDEE_TIER_CONFIG: Record<
  AttendeeTier,
  { label: string; bg: string; text: string; border: string }
> = {
  VIP_COLLECTOR: {
    label: "VIP Collector",
    bg: "bg-purple-500/15",
    text: "text-purple-300",
    border: "border-purple-500/30",
  },
  VERIFIED_MAKER: {
    label: "Verified Maker",
    bg: "bg-orange-500/15",
    text: "text-orange-300",
    border: "border-orange-500/30",
  },
  COZY_MEMBER: {
    label: "Cozy Member",
    bg: "bg-cyan-500/15",
    text: "text-cyan-300",
    border: "border-cyan-500/30",
  },
  GUEST: {
    label: "Booth Guest",
    bg: "bg-white/5",
    text: "text-white/50",
    border: "border-white/10",
  },
};

const TAP_TYPE_CONFIG: Record<CheckInTapType, { label: string; icon: React.ElementType }> = {
  NTAG424_TAP: { label: "NTAG424 DNA Tap", icon: ShieldCheck },
  NTAG215_TAP: { label: "NTAG215 Serialized", icon: Cpu },
  QR_SCAN: { label: "Micro-QR Scan", icon: QrCode },
  MANUAL_CHECKIN: { label: "Manual Check-In", icon: Radio },
};

// ─── Simulated Pool for Live Check-In Generator ───────────────────────────────

const SIMULATED_ATTENDEES = [
  { handle: "@portland_maker_guy", name: "Tyler Brooks", initials: "TB", tier: "COZY_MEMBER" as AttendeeTier, comments: ["Loved the copper link bracelet! Very sleek.", "Checking in at Saturday Market!"] },
  { handle: "@leathercraft_sam", name: "Samantha Ross", initials: "SR", tier: "VERIFIED_MAKER" as AttendeeTier, comments: ["Inspecting the Horween Dublin edge beveling. Top tier work.", "Great talk on secondary royalties!"] },
  { handle: "@oregon_edc", name: "David Chen", initials: "DC", tier: "VIP_COLLECTOR" as AttendeeTier, comments: ["Here to claim my reserved keyring batch!", "Second year visiting The Forge booth."] },
  { handle: "@beacon_craft", name: "Maya Patel", initials: "MP", tier: "COZY_MEMBER" as AttendeeTier, comments: ["Testing out the NFC tap with my Cozy app.", "The mill-scale steel pennant is great."] },
  { handle: "@pacific_foundry", name: "Garek North", initials: "GN", tier: "VERIFIED_MAKER" as AttendeeTier, comments: ["Sand-cast brass buckle looks incredible in person.", "Fellow PDX metalworker stopping by."] },
  { handle: "@artisan_claire", name: "Claire Dupont", initials: "CD", tier: "GUEST" as AttendeeTier, comments: ["First time at this booth. The craft quality is amazing.", "Signing the guestbook!"] },
];

export function BoothEngine() {
  // Selected Installation & Active Tab
  const [installations] = useState<BoothInstallation[]>(MOCK_INSTALLATIONS);
  const [selectedStationId, setSelectedStationId] = useState<string>(MOCK_INSTALLATIONS[0].id);
  const [mode, setMode] = useState<BoothEngineMode>("GUESTBOOK");

  // Guestbook Mode State
  const [guestbookEntries, setGuestbookEntries] = useState<GuestbookEntry[]>(INITIAL_GUESTBOOK_ENTRIES);
  const [guestFilter, setGuestFilter] = useState<"ALL" | "MEMBERS" | "COMMENTS" | "VIPS">("ALL");
  const [guestSearch, setGuestSearch] = useState("");
  const [isSimulatingFeed, setIsSimulatingFeed] = useState(false);
  const [broadcastNotice, setBroadcastNotice] = useState<string | null>(null);

  // Raffle Mode State
  const [winProbability, setWinProbability] = useState<number>(25); // 25% default (1 in 4)
  const [raffleAttempts, setRaffleAttempts] = useState<RaffleAttempt[]>(INITIAL_RAFFLE_ATTEMPTS);
  const [activeAttendeeHandle, setActiveAttendeeHandle] = useState("@solstice_made");
  const [rubProgress, setRubProgress] = useState(0);
  const [isRubbing, setIsRubbing] = useState(false);
  const [lastRaffleResult, setLastRaffleResult] = useState<RaffleAttempt | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const activeStation = installations.find((i) => i.id === selectedStationId) || installations[0];

  // ─── Continuous Live Feed Simulation ──────────────────────────────────────────

  useEffect(() => {
    if (!isSimulatingFeed) return;
    const interval = setInterval(() => {
      const randomAttendee = SIMULATED_ATTENDEES[Math.floor(Math.random() * SIMULATED_ATTENDEES.length)];
      const tapTypes: CheckInTapType[] = ["NTAG424_TAP", "NTAG215_TAP", "QR_SCAN"];
      const chosenTapType = tapTypes[Math.floor(Math.random() * tapTypes.length)];
      const randomComment = randomAttendee.comments[Math.floor(Math.random() * randomAttendee.comments.length)];

      const newEntry: GuestbookEntry = {
        id: `gb_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        attendeeHandle: randomAttendee.handle,
        attendeeName: randomAttendee.name,
        avatarInitials: randomAttendee.initials,
        verifiedTier: randomAttendee.tier,
        comment: randomComment,
        timestamp: Date.now(),
        tapType: chosenTapType,
        stationId: selectedStationId,
        tapCount: Math.floor(1 + Math.random() * 5),
        badgeEarned: randomAttendee.tier === "VIP_COLLECTOR" ? "Heritage Patron" : "Booth Explorer",
      };

      setGuestbookEntries((prev) => [newEntry, ...prev]);
    }, 4500);
    return () => clearInterval(interval);
  }, [isSimulatingFeed, selectedStationId]);

  // ─── Guestbook Handlers ───────────────────────────────────────────────────────

  const handleSimulateCheckIn = () => {
    const randomAttendee = SIMULATED_ATTENDEES[Math.floor(Math.random() * SIMULATED_ATTENDEES.length)];
    const tapTypes: CheckInTapType[] = ["NTAG424_TAP", "NTAG215_TAP", "QR_SCAN"];
    const chosenTapType = tapTypes[Math.floor(Math.random() * tapTypes.length)];
    const randomComment = randomAttendee.comments[Math.floor(Math.random() * randomAttendee.comments.length)];

    const newEntry: GuestbookEntry = {
      id: `gb_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      attendeeHandle: randomAttendee.handle,
      attendeeName: randomAttendee.name,
      avatarInitials: randomAttendee.initials,
      verifiedTier: randomAttendee.tier,
      comment: randomComment,
      timestamp: Date.now(),
      tapType: chosenTapType,
      stationId: selectedStationId,
      tapCount: Math.floor(1 + Math.random() * 5),
      badgeEarned: randomAttendee.tier === "VIP_COLLECTOR" ? "Heritage Patron" : "Booth Explorer",
    };

    setGuestbookEntries((prev) => [newEntry, ...prev]);
  };

  const handleBroadcastGreeting = () => {
    setBroadcastNotice("Station Announcement: Welcome to Booth 14! Tap physical tags for EIP-2981 verification.");
    setTimeout(() => setBroadcastNotice(null), 4000);
  };

  // Filtered Guestbook Entries
  const filteredGuestbook = useMemo(() => {
    return guestbookEntries.filter((entry) => {
      const matchesSearch =
        entry.attendeeHandle.toLowerCase().includes(guestSearch.toLowerCase()) ||
        entry.attendeeName.toLowerCase().includes(guestSearch.toLowerCase()) ||
        entry.comment.toLowerCase().includes(guestSearch.toLowerCase());

      if (!matchesSearch) return false;

      if (guestFilter === "MEMBERS") return entry.verifiedTier !== "GUEST";
      if (guestFilter === "COMMENTS") return entry.comment.length > 0;
      if (guestFilter === "VIPS") return entry.verifiedTier === "VIP_COLLECTOR" || entry.verifiedTier === "VERIFIED_MAKER";
      return true;
    });
  }, [guestbookEntries, guestSearch, guestFilter]);

  // ─── Raffle Rub Handlers (Variable-Ratio PRNG) ────────────────────────────────

  const triggerRaffleRub = () => {
    if (isRubbing) return;
    setIsRubbing(true);
    setRubProgress(0);

    // Simulate rubbing action with step progress
    const progressInterval = setInterval(() => {
      setRubProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          finalizeRaffleOutcome();
          return 100;
        }
        return prev + 25;
      });
    }, 150);
  };

  const finalizeRaffleOutcome = () => {
    // Variable-ratio probability roll: 0 to 100
    const roll = Math.random() * 100;
    const isWin = roll < winProbability;

    let resultAttempt: RaffleAttempt;

    if (isWin) {
      // Pick reward tier based on weighted probability
      const totalWeight = RAFFLE_REWARD_TIERS.reduce((sum, t) => sum + t.weight, 0);
      let randWeight = Math.random() * totalWeight;
      let selectedTier = RAFFLE_REWARD_TIERS[RAFFLE_REWARD_TIERS.length - 1];

      for (const tier of RAFFLE_REWARD_TIERS) {
        if (randWeight < tier.weight) {
          selectedTier = tier;
          break;
        }
        randWeight -= tier.weight;
      }

      // Generate instant cryptographic voucher code
      const hexChars = "0123456789ABCDEF";
      let randomSuffix = "";
      for (let i = 0; i < 6; i++) {
        randomSuffix += hexChars[Math.floor(Math.random() * 16)];
      }
      const generatedCode = `MV-${selectedTier.codePrefix}-${randomSuffix}`;

      resultAttempt = {
        id: `raf_${Date.now()}`,
        attendeeHandle: activeAttendeeHandle,
        timestamp: Date.now(),
        outcome: "WIN",
        prizeWon: selectedTier.name,
        rewardCode: generatedCode,
        discountPercent: selectedTier.discountPercent,
        dispatchStatus: "DISPATCHED",
        qrPayload: `mv://reward/${generatedCode}`,
      };
    } else {
      resultAttempt = {
        id: `raf_${Date.now()}`,
        attendeeHandle: activeAttendeeHandle,
        timestamp: Date.now(),
        outcome: "LOSS",
        dispatchStatus: "EXPIRED",
      };
    }

    setLastRaffleResult(resultAttempt);
    setRaffleAttempts((prev) => [resultAttempt, ...prev]);
    setIsRubbing(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Raffle Telemetry Calculations
  const totalRafflePlays = raffleAttempts.length;
  const totalWins = raffleAttempts.filter((a) => a.outcome === "WIN").length;
  const realizedWinRate = totalRafflePlays > 0 ? ((totalWins / totalRafflePlays) * 100).toFixed(1) : "0.0";

  return (
    <div className="space-y-6 max-w-6xl pb-12">
      {/* ─── Top Installation Header & Station Selector ──────────────────────── */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-2xl bg-[#151515] border border-white/10 shadow-xl">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#CC5500] to-[#8C3A00] flex items-center justify-center shadow-[0_0_20px_rgba(204,85,0,0.35)] flex-shrink-0">
            <Radio className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-bold text-white tracking-wide">
                Interactive Booth & Installation Engine
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold uppercase tracking-wider">
                ● Live Engine
              </span>
              <VersionReleaseBadge variant="pill" />
            </div>
            <p className="text-xs font-mono text-white/40 mt-0.5 truncate">
              {activeStation.name} · {activeStation.location} · {activeStation.hardwareUid}
            </p>
          </div>
        </div>

        {/* Station Selector Dropdown */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <div className="relative">
            <select
              value={selectedStationId}
              onChange={(e) => setSelectedStationId(e.target.value)}
              className="bg-white/5 border border-white/12 rounded-xl px-3 py-2 font-mono text-xs text-white/80 focus:outline-none focus:border-[#CC5500] cursor-pointer"
            >
              {installations.map((inst) => (
                <option key={inst.id} value={inst.id} className="bg-[#181818] text-white">
                  {inst.name} ({inst.status})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/4 border border-white/8 font-mono text-[11px] text-cyan-300 flex-shrink-0">
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            <span>12ms</span>
          </div>
        </div>
      </div>

      {/* Broadcast Banner Notice */}
      <AnimatePresence>
        {broadcastNotice && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: 0.2 }}
            className="p-3 rounded-xl bg-[#CC5500]/15 border border-[#CC5500]/40 text-orange-200 text-xs font-mono flex items-center justify-between shadow-[0_0_20px_rgba(204,85,0,0.2)]"
          >
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-orange-400 animate-bounce" />
              <span>{broadcastNotice}</span>
            </div>
            <button
              onClick={() => setBroadcastNotice(null)}
              className="text-white/40 hover:text-white transition-colors cursor-pointer"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Mode Selector Tabs ───────────────────────────────────────────────── */}
      <div className="flex rounded-xl border border-white/10 bg-[#121212] p-1 gap-1">
        {(["GUESTBOOK", "RAFFLE", "OVERVIEW"] as BoothEngineMode[]).map((tabMode) => {
          const isActive = mode === tabMode;
          return (
            <button
              key={tabMode}
              onClick={() => setMode(tabMode)}
              className={cn(
                "relative flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-mono text-xs font-semibold tracking-wider transition-all duration-200 cursor-pointer",
                isActive ? "text-white" : "text-white/40 hover:text-white/70",
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="booth-mode-tab-indicator"
                  className={cn(
                    "absolute inset-0 rounded-lg border",
                    tabMode === "GUESTBOOK"
                      ? "bg-cyan-500/15 border-cyan-500/40 shadow-[0_0_15px_rgba(34,211,238,0.15)]"
                      : tabMode === "RAFFLE"
                        ? "bg-orange-500/20 border-orange-500/40 shadow-[0_0_15px_rgba(204,85,0,0.2)]"
                        : "bg-purple-500/15 border-purple-500/40",
                  )}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                {tabMode === "GUESTBOOK" && <Users className="w-3.5 h-3.5 text-cyan-400" />}
                {tabMode === "RAFFLE" && <Gift className="w-3.5 h-3.5 text-orange-400" />}
                {tabMode === "OVERVIEW" && <Cpu className="w-3.5 h-3.5 text-purple-400" />}
                <span>
                  {tabMode === "GUESTBOOK" && "Guestbook Mode"}
                  {tabMode === "RAFFLE" && "Raffle Rub Mode"}
                  {tabMode === "OVERVIEW" && "Station Hardware"}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* ─── Mode 1: GUESTBOOK MODE ───────────────────────────────────────────── */}
      {mode === "GUESTBOOK" && (
        <motion.div
          key="guestbook"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          {/* Guestbook Telemetry Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <FrostedCard glowOnHover className="flex flex-col gap-2">
              <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
                Total Check-Ins Today
              </span>
              <MonoValue glow="cyan" className="text-2xl font-bold">
                {guestbookEntries.length + 42}
              </MonoValue>
              <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                <Flame className="w-3 h-3" /> +8 in the last hour
              </span>
            </FrostedCard>

            <FrostedCard glowOnHover className="flex flex-col gap-2">
              <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
                Verified Cozy Members
              </span>
              <MonoValue glow="white" className="text-2xl font-bold">
                {Math.round((guestbookEntries.filter((g) => g.verifiedTier !== "GUEST").length / guestbookEntries.length) * 100)}%
              </MonoValue>
              <span className="text-[10px] font-mono text-cyan-300">
                Cozy Profile Anchored
              </span>
            </FrostedCard>

            <FrostedCard glowOnHover className="flex flex-col gap-2">
              <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
                NFC Tap Rate
              </span>
              <MonoValue glow="orange" className="text-2xl font-bold">
                84.2%
              </MonoValue>
              <span className="text-[10px] font-mono text-white/30">
                NTAG424 + NTAG215 Induction
              </span>
            </FrostedCard>

            <FrostedCard glowOnHover className="flex flex-col gap-2">
              <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
                Live Feed Generator
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <button
                  onClick={() => setIsSimulatingFeed(!isSimulatingFeed)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg border font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer",
                    isSimulatingFeed
                      ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                      : "bg-white/5 border-white/10 text-white/50 hover:text-white",
                  )}
                >
                  {isSimulatingFeed ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  <span>{isSimulatingFeed ? "Live Feed: ON" : "Auto-Feed: OFF"}</span>
                </button>
              </div>
              <span className="text-[9px] font-mono text-white/30">
                {isSimulatingFeed ? "Streaming check-ins every 4.5s" : "Click to stream real-time feed"}
              </span>
            </FrostedCard>
          </div>

          {/* Action & Filter Controls */}
          <FrostedCard noPadding className="overflow-hidden">
            <div className="p-4 bg-[#141414] border-b border-white/8 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              {/* Search & Filter */}
              <div className="flex items-center gap-3 w-full md:w-auto flex-1">
                <div className="relative flex-1 max-w-xs">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    type="text"
                    value={guestSearch}
                    onChange={(e) => setGuestSearch(e.target.value)}
                    placeholder="Search attendee handle or notes..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 font-mono text-xs text-white placeholder:text-white/25 focus:outline-none focus:border-[#CC5500] transition-colors"
                  />
                </div>

                <div className="flex items-center gap-1">
                  {(["ALL", "MEMBERS", "COMMENTS", "VIPS"] as const).map((filterOpt) => (
                    <button
                      key={filterOpt}
                      onClick={() => setGuestFilter(filterOpt)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg font-mono text-[10px] uppercase font-semibold transition-colors cursor-pointer",
                        guestFilter === filterOpt
                          ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                          : "bg-white/4 text-white/40 hover:text-white border border-transparent",
                      )}
                    >
                      {filterOpt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                <button
                  onClick={handleBroadcastGreeting}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-white/70 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5 text-orange-400" />
                  <span>Broadcast Greeting</span>
                </button>

                <button
                  onClick={handleSimulateCheckIn}
                  className="btn-cta flex items-center gap-1.5 text-xs py-1.5 px-3 uppercase tracking-wider font-bold shadow-[0_0_15px_rgba(204,85,0,0.3)] cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Simulate Check-In Tap</span>
                </button>
              </div>
            </div>

            {/* Real-time Attendee Feed Stream */}
            <div className="divide-y divide-white/5 max-h-[560px] overflow-y-auto">
              <AnimatePresence initial={false}>
                {filteredGuestbook.map((entry) => {
                  const tierConfig = ATTENDEE_TIER_CONFIG[entry.verifiedTier];
                  const tapConfig = TAP_TYPE_CONFIG[entry.tapType];
                  const TapIcon = tapConfig.icon;

                  return (
                    <motion.div
                      key={entry.id}
                      layout
                      initial={{ opacity: 0, x: -16, backgroundColor: "rgba(34,211,238,0.12)" }}
                      animate={{ opacity: 1, x: 0, backgroundColor: "transparent" }}
                      exit={{ opacity: 0, x: 16 }}
                      transition={{ duration: 0.3 }}
                      className="p-4 hover:bg-white/2 transition-colors flex items-start gap-4"
                    >
                      {/* Monogram Avatar */}
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-stone-800 to-stone-900 border border-white/12 flex items-center justify-center font-mono text-xs font-bold text-orange-300 shadow-md flex-shrink-0">
                        {entry.avatarInitials}
                      </div>

                      {/* Attendee Info & Craft Comments */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-white">
                            {entry.attendeeHandle}
                          </span>
                          <span className="text-xs text-white/50">({entry.attendeeName})</span>

                          {/* Verification Badge */}
                          <span
                            className={cn(
                              "font-mono text-[9px] px-2 py-0.5 rounded-full border font-semibold",
                              tierConfig.bg,
                              tierConfig.text,
                              tierConfig.border,
                            )}
                          >
                            {tierConfig.label}
                          </span>

                          {entry.badgeEarned && (
                            <span className="inline-flex items-center gap-1 font-mono text-[9px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                              <Award className="w-2.5 h-2.5 text-amber-400" />
                              {entry.badgeEarned}
                            </span>
                          )}
                        </div>

                        {/* Comment Note */}
                        {entry.comment && (
                          <p className="text-xs text-white/80 mt-1.5 leading-relaxed bg-white/2 p-2 rounded-lg border border-white/5">
                            &ldquo;{entry.comment}&rdquo;
                          </p>
                        )}

                        {/* Bottom Metadata Bar */}
                        <div className="flex items-center gap-4 mt-2 font-mono text-[10px] text-white/35 flex-wrap">
                          <div className="flex items-center gap-1">
                            <TapIcon className="w-3 h-3 text-cyan-400" />
                            <span>{tapConfig.label}</span>
                          </div>
                          <span>•</span>
                          <span>Visit #{entry.tapCount}</span>
                          <span>•</span>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{relativeTime(entry.timestamp)}</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </FrostedCard>
        </motion.div>
      )}

      {/* ─── Mode 2: RAFFLE RUB MODE ──────────────────────────────────────────── */}
      {mode === "RAFFLE" && (
        <motion.div
          key="raffle"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          {/* Raffle Telemetry Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <FrostedCard glowOnHover className="flex flex-col gap-2">
              <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
                Configured Win Rate
              </span>
              <MonoValue glow="orange" className="text-2xl font-bold">
                {winProbability}%
              </MonoValue>
              <span className="text-[10px] font-mono text-orange-300/80">
                1 in {(100 / winProbability).toFixed(1)} probability (VR Schedule)
              </span>
            </FrostedCard>

            <FrostedCard glowOnHover className="flex flex-col gap-2">
              <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
                Realized Win Rate
              </span>
              <MonoValue glow="cyan" className="text-2xl font-bold">
                {realizedWinRate}%
              </MonoValue>
              <span className="text-[10px] font-mono text-white/30">
                {totalWins} wins / {totalRafflePlays} total plays
              </span>
            </FrostedCard>

            <FrostedCard glowOnHover className="flex flex-col gap-2">
              <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
                Dispatched Rewards
              </span>
              <MonoValue glow="white" className="text-2xl font-bold">
                {totalWins} Vouchers
              </MonoValue>
              <span className="text-[10px] font-mono text-emerald-400">
                Instant Cryptographic Tokens
              </span>
            </FrostedCard>

            <FrostedCard glowOnHover className="flex flex-col gap-2">
              <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
                Voucher Redemption
              </span>
              <MonoValue glow="white" className="text-2xl font-bold">
                {raffleAttempts.filter((a) => a.dispatchStatus === "CLAIMED").length} Claimed
              </MonoValue>
              <span className="text-[10px] font-mono text-white/30">
                POS Terminal & Web Store
              </span>
            </FrostedCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Variable-Ratio Generator Configurator */}
            <div className="lg:col-span-5 space-y-5">
              <FrostedCard className="space-y-4">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-orange-400" />
                  <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                    Variable-Ratio Probability Generator
                  </h3>
                </div>
                <p className="text-xs text-white/60 leading-relaxed">
                  Reinforcement schedule delivers instant winning rewards on an unpredictable ratio with an exact mathematical target.
                </p>

                {/* Slider Component */}
                <div className="p-4 rounded-xl bg-white/3 border border-white/8 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-white/70 font-mono">
                      Target Win Probability
                    </span>
                    <MonoValue glow="orange" className="text-lg font-bold">
                      {winProbability}%
                    </MonoValue>
                  </div>

                  <input
                    type="range"
                    min={5}
                    max={60}
                    step={5}
                    value={winProbability}
                    onChange={(e) => setWinProbability(Number(e.target.value))}
                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#CC5500]"
                  />

                  {/* Preset quick buttons */}
                  <div className="flex items-center justify-between gap-1 pt-1">
                    {[10, 20, 25, 33, 50].map((preset) => (
                      <button
                        key={preset}
                        onClick={() => setWinProbability(preset)}
                        className={cn(
                          "px-2 py-0.5 rounded font-mono text-[10px] transition-colors cursor-pointer",
                          winProbability === preset
                            ? "bg-orange-500/20 text-orange-300 border border-orange-500/40"
                            : "bg-white/5 text-white/40 hover:text-white",
                        )}
                      >
                        {preset}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reward Tiers Config */}
                <div className="space-y-2.5 pt-2">
                  <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
                    Configured Reward Tiers
                  </span>
                  <div className="space-y-2">
                    {RAFFLE_REWARD_TIERS.map((tier) => (
                      <div
                        key={tier.id}
                        className="p-2.5 rounded-lg bg-white/3 border border-white/6 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-white/90 truncate">{tier.name}</p>
                          <p className="text-[10px] font-mono text-white/40 truncate mt-0.5">
                            Prefix: {tier.codePrefix}-* · Weight: {tier.weight}%
                          </p>
                        </div>
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-orange-500/15 text-orange-300 border border-orange-500/30 font-bold flex-shrink-0">
                          {tier.badge}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </FrostedCard>
            </div>

            {/* Right Column: Interactive Rub Simulation Surface & Reward Dispatch */}
            <div className="lg:col-span-7 space-y-5">
              {/* Interactive Rub Simulator Card */}
              <FrostedCard className="space-y-4 border-orange-500/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-orange-400" />
                    <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                      Attendee Rub & Reveal Simulator
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-cyan-300">Station 01 Active</span>
                </div>

                {/* Attendee Selector */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/8">
                  <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center font-mono text-xs text-orange-300">
                    @
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="text-[10px] font-mono text-white/40 block">Attendee Handle</label>
                    <input
                      type="text"
                      value={activeAttendeeHandle}
                      onChange={(e) => setActiveAttendeeHandle(e.target.value)}
                      className="bg-transparent font-mono text-xs text-white focus:outline-none w-full"
                    />
                  </div>
                  <button
                    onClick={() => {
                      const randomHandle = SIMULATED_ATTENDEES[Math.floor(Math.random() * SIMULATED_ATTENDEES.length)].handle;
                      setActiveAttendeeHandle(randomHandle);
                    }}
                    className="text-[10px] font-mono text-orange-400 hover:text-orange-300 underline decoration-dotted cursor-pointer flex-shrink-0"
                  >
                    Randomize
                  </button>
                </div>

                {/* Rubbing Surface Canvas Simulation */}
                <div className="relative h-48 rounded-xl bg-gradient-to-br from-stone-900 via-[#181818] to-[#121212] border border-white/10 overflow-hidden flex flex-col items-center justify-center p-6 text-center shadow-inner">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(204,85,0,0.15),_transparent_70%)]" />

                  <AnimatePresence mode="wait">
                    {!lastRaffleResult && !isRubbing && (
                      <motion.div
                        key="ready"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="relative z-10 space-y-3"
                      >
                        <Trophy className="w-10 h-10 text-orange-400 mx-auto drop-shadow-[0_0_15px_rgba(204,85,0,0.5)]" />
                        <div>
                          <p className="text-sm font-bold text-white">Scratch / Rub To Claim</p>
                          <p className="text-xs font-mono text-white/40 mt-0.5">
                            Tap NFC Tag or trigger simulation to reveal instant reward
                          </p>
                        </div>
                        <button
                          onClick={triggerRaffleRub}
                          className="btn-cta flex items-center gap-2 text-xs py-2 px-5 font-bold uppercase tracking-wider mx-auto shadow-[0_0_20px_rgba(204,85,0,0.4)] cursor-pointer"
                        >
                          <Flame className="w-3.5 h-3.5" />
                          <span>Simulate NFC Rub / Tap</span>
                        </button>
                      </motion.div>
                    )}

                    {isRubbing && (
                      <motion.div
                        key="rubbing"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="relative z-10 space-y-3 w-full max-w-xs"
                      >
                        <Radio className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
                        <p className="text-xs font-mono text-cyan-300 font-bold uppercase tracking-wider">
                          Evaluating Variable-Ratio Roll ({rubProgress}%)...
                        </p>
                        <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-orange-500 to-cyan-400"
                            style={{ width: `${rubProgress}%` }}
                          />
                        </div>
                      </motion.div>
                    )}

                    {lastRaffleResult && !isRubbing && (
                      <motion.div
                        key="result"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: "spring", stiffness: 350, damping: 25 }}
                        className="relative z-10 space-y-3"
                      >
                        {lastRaffleResult.outcome === "WIN" ? (
                          <div className="space-y-2">
                            <div className="inline-flex p-2 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                              <CheckCircle2 className="w-8 h-8" />
                            </div>
                            <h4 className="text-sm sm:text-base font-bold text-white">
                              WINNER! Reward Code Dispatched
                            </h4>
                            <p className="text-xs font-mono text-emerald-300 font-semibold">
                              {lastRaffleResult.prizeWon}
                            </p>

                            {/* Code Pill */}
                            <div className="flex items-center justify-center gap-2 pt-1">
                              <span className="font-mono text-sm px-3 py-1 rounded-lg bg-black/60 border border-orange-500/40 text-cyan-300 font-bold tracking-wider select-all">
                                {lastRaffleResult.rewardCode}
                              </span>
                              <button
                                onClick={() => lastRaffleResult.rewardCode && copyToClipboard(lastRaffleResult.rewardCode)}
                                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors cursor-pointer"
                                title="Copy voucher code"
                              >
                                {copiedCode === lastRaffleResult.rewardCode ? (
                                  <Check className="w-4 h-4 text-emerald-400" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="inline-flex p-2 rounded-full bg-white/10 text-white/40">
                              <XCircle className="w-8 h-8" />
                            </div>
                            <h4 className="text-sm font-bold text-white/90">No Match This Time</h4>
                            <p className="text-xs font-mono text-white/40">
                              Consolation Cozy Spatial POAP badge dispatched to {lastRaffleResult.attendeeHandle}
                            </p>
                          </div>
                        )}

                        <button
                          onClick={() => {
                            setLastRaffleResult(null);
                            const randomHandle = SIMULATED_ATTENDEES[Math.floor(Math.random() * SIMULATED_ATTENDEES.length)].handle;
                            setActiveAttendeeHandle(randomHandle);
                          }}
                          className="px-4 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-white/70 hover:text-white transition-all cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Reset for Next Attendee</span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </FrostedCard>

              {/* Real-time Dispatch Stream Table */}
              <FrostedCard noPadding>
                <div className="p-3.5 bg-[#141414] border-b border-white/8 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-orange-400" />
                    <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                      Live Reward Dispatch Stream
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono text-white/40">
                    {raffleAttempts.length} Records
                  </span>
                </div>

                <div className="divide-y divide-white/5 max-h-56 overflow-y-auto">
                  {raffleAttempts.map((attempt) => (
                    <div
                      key={attempt.id}
                      className="p-3 hover:bg-white/2 transition-colors flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {attempt.outcome === "WIN" ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-white/20 flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="font-mono text-xs font-bold text-white truncate">
                            {attempt.attendeeHandle}
                          </p>
                          <p className="text-[10px] font-mono text-white/40 truncate">
                            {attempt.outcome === "WIN" ? attempt.prizeWon : "Consolation Badge"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        {attempt.rewardCode && (
                          <span className="font-mono text-[10px] text-cyan-300 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/30">
                            {attempt.rewardCode}
                          </span>
                        )}
                        <span
                          className={cn(
                            "font-mono text-[9px] px-2 py-0.5 rounded font-bold uppercase",
                            attempt.outcome === "WIN"
                              ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                              : "bg-white/5 text-white/30 border border-white/8",
                          )}
                        >
                          {attempt.outcome}
                        </span>
                        <span className="font-mono text-[10px] text-white/30 hidden sm:inline">
                          {relativeTime(attempt.timestamp)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </FrostedCard>
            </div>
          </div>
        </motion.div>
      )}

      {/* ─── Mode 3: OVERVIEW & STATION HARDWARE ───────────────────────────────── */}
      {mode === "OVERVIEW" && (
        <motion.div
          key="overview"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FrostedCard className="space-y-4">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Induction Reader Specifications
                </h3>
              </div>

              <div className="divide-y divide-white/6 font-mono text-xs">
                <div className="py-2.5 flex justify-between">
                  <span className="text-white/40">Hardware Model:</span>
                  <span className="text-white font-semibold">{activeStation.readerModel}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-white/40">Station UID:</span>
                  <ChipUID uid={activeStation.hardwareUid} />
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-white/40">Operating Frequency:</span>
                  <span className="text-cyan-300">13.56 MHz (ISO 14443-A)</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-white/40">Cryptographic Protocol:</span>
                  <span className="text-purple-300">AES-128 SUN-CMAC (NXP AN12196)</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-white/40">Station IP Address:</span>
                  <span className="text-white/80">{activeStation.stationIp}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-white/40">Telemetry Health:</span>
                  <span className="text-emerald-400 font-bold">ONLINE · 12ms Latency</span>
                </div>
              </div>
            </FrostedCard>

            <FrostedCard className="space-y-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-orange-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Deployment Coordinates
                </h3>
              </div>

              <div className="p-4 rounded-xl bg-white/3 border border-white/8 space-y-3">
                <div>
                  <p className="text-xs font-bold text-white">{activeStation.name}</p>
                  <p className="text-xs font-mono text-white/40 mt-0.5">{activeStation.location}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/6 font-mono text-xs">
                  <div>
                    <span className="text-white/30 block text-[10px]">CHIP CAPACITY:</span>
                    <MonoValue glow="white" className="text-base font-bold">
                      {activeStation.chipCount} Tags
                    </MonoValue>
                  </div>
                  <div>
                    <span className="text-white/30 block text-[10px]">TOTAL TRIGGERS:</span>
                    <MonoValue glow="cyan" className="text-base font-bold">
                      {activeStation.triggerCount} Taps
                    </MonoValue>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-mono">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Station is fully synchronized with Redis event streams.</span>
              </div>
            </FrostedCard>
          </div>
        </motion.div>
      )}
    </div>
  );
}
