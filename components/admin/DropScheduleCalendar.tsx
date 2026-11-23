// components/admin/DropScheduleCalendar.tsx
"use client";

import { useState, useMemo } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Plus,
  Clock,
  Eye,
  EyeOff,
} from "lucide-react";
import { FrostedCard } from "@/components/ui/FrostedCard";
import { CountdownTimer } from "@/components/ui/CountdownTimer";
import { QuickScheduleModal } from "@/components/admin/QuickScheduleModal";
import {
  resolveBatchLifecycleStatus,
  detectFulfillmentOverlaps,
  getCountdownTargetMs,
  MOCK_SCHEDULED_BATCHES,
  type ProductBatch,
  type BatchReleaseStatus,
} from "@/lib/drops/lifecycle";
import {
  scheduleBatchRelease,
  rescheduleBatchWindow,
  togglePublicTeaser,
} from "@/app/(admin)/vendor/schedule/actions";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn, formatCents } from "@/lib/utils";

const STATUS_STYLE: Record<BatchReleaseStatus, { label: string; pill: string; dot: string }> = {
  DRAFT: {
    label: "DRAFT",
    pill: "bg-slate-500/15 border-slate-500/35 text-slate-300",
    dot: "bg-slate-400",
  },
  SCHEDULED: {
    label: "SCHEDULED",
    pill: "bg-cyan-500/15 border-[#22D3EE]/40 text-[#22D3EE]",
    dot: "bg-[#22D3EE]",
  },
  LIVE: {
    label: "LIVE",
    pill: "bg-[#CC5500]/20 border-[#CC5500]/60 text-orange-200",
    dot: "bg-[#CC5500] animate-pulse",
  },
  RETIRED: {
    label: "RETIRED",
    pill: "bg-emerald-500/15 border-emerald-500/40 text-emerald-300",
    dot: "bg-emerald-400",
  },
};

function toDateKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function buildCalendarDays(anchorDate: Date, viewMode: "month" | "2week"): Date[] {
  if (viewMode === "2week") {
    const start = new Date(anchorDate);
    start.setDate(start.getDate() - start.getDay());
    return Array.from({ length: 14 }, (_, i) => addDays(start, i));
  }

  const firstOfMonth = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
  const lastOfMonth = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0);
  const start = addDays(firstOfMonth, -firstOfMonth.getDay());
  const totalWeeks = Math.ceil((firstOfMonth.getDay() + lastOfMonth.getDate()) / 7);
  return Array.from({ length: totalWeeks * 7 }, (_, i) => addDays(start, i));
}

function batchSpansDay(batch: ProductBatch, day: Date): boolean {
  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, 0).getTime();
  const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999).getTime();
  const start = Date.parse(batch.goesLiveAt);
  const end = batch.autoRetireAt ? Date.parse(batch.autoRetireAt) : Number.POSITIVE_INFINITY;
  return start <= dayEnd && end >= dayStart;
}

export function DropScheduleCalendar({
  initialBatches = MOCK_SCHEDULED_BATCHES,
}: {
  initialBatches?: ProductBatch[];
}) {
  const [batches, setBatches] = useState<ProductBatch[]>(initialBatches);
  const [viewMode, setViewMode] = useState<"month" | "2week">("month");
  const [anchorDate, setAnchorDate] = useState<Date>(() => new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDateIso, setSelectedDateIso] = useState<string>(() => toDateKey(new Date()));
  const [editingBatch, setEditingBatch] = useState<ProductBatch | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  const days = useMemo(() => buildCalendarDays(anchorDate, viewMode), [anchorDate, viewMode]);
  const todayKey = toDateKey(new Date());

  const { overlappingIds, advisories } = useMemo(
    () => detectFulfillmentOverlaps(batches.filter((b) => b.isPublished)),
    [batches],
  );

  const upcomingQueue = useMemo(() => {
    return [...batches].sort((a, b) => Date.parse(a.goesLiveAt) - Date.parse(b.goesLiveAt));
  }, [batches]);

  const handleNavigate = (dir: -1 | 0 | 1) => {
    if (dir === 0) {
      setAnchorDate(new Date());
      return;
    }
    setAnchorDate((prev) => {
      if (viewMode === "2week") return addDays(prev, dir * 14);
      return new Date(prev.getFullYear(), prev.getMonth() + dir, 1);
    });
  };

  const openNewForDay = (day: Date) => {
    setSelectedDateIso(toDateKey(day));
    setEditingBatch(null);
    setModalOpen(true);
  };

  const openEditBatch = (batch: ProductBatch) => {
    setSelectedDateIso(toDateKey(new Date(batch.goesLiveAt)));
    setEditingBatch(batch);
    setModalOpen(true);
  };

  const getAuthToken = async (): Promise<string | undefined> => {
    const sb = getSupabaseBrowserClient();
    if (!sb) return undefined;
    try {
      const { data } = await sb.auth.getSession();
      return data?.session?.access_token;
    } catch {
      return undefined;
    }
  };

  const handleSaveBatch = async (payload: {
    batchId?: string;
    title: string;
    sku: string;
    brandHandle: string;
    goesLiveAt: string;
    autoRetireAt: string | null;
    versionTag: string;
    isPublicTeaser: boolean;
    isPublished: boolean;
    chipTier: ProductBatch["chipTier"];
    basePriceCents: number;
  }) => {
    const authToken = await getAuthToken();

    if (payload.batchId) {
      const res = await rescheduleBatchWindow({
        batchId: payload.batchId,
        goesLiveAt: payload.goesLiveAt,
        autoRetireAt: payload.autoRetireAt,
        isPublished: payload.isPublished,
        title: payload.title,
        sku: payload.sku,
        versionTag: payload.versionTag,
        isPublicTeaser: payload.isPublicTeaser,
        chipTier: payload.chipTier,
        basePriceCents: payload.basePriceCents,
        authToken,
      });
      if (!res.success) {
        throw new Error(res.error || "Failed to reschedule drop.");
      }
      setBatches((prev) =>
        prev.map((b) =>
          b.id === payload.batchId
            ? {
                ...b,
                title: payload.title,
                sku: payload.sku,
                goesLiveAt: payload.goesLiveAt,
                autoRetireAt: payload.autoRetireAt,
                versionTag: payload.versionTag,
                isPublicTeaser: payload.isPublicTeaser,
                isPublished: payload.isPublished,
                chipTier: payload.chipTier,
                basePriceCents: payload.basePriceCents,
              }
            : b,
        ),
      );
      return;
    }

    const res = await scheduleBatchRelease({
      title: payload.title,
      sku: payload.sku,
      brandHandle: payload.brandHandle,
      goesLiveAt: payload.goesLiveAt,
      autoRetireAt: payload.autoRetireAt,
      versionTag: payload.versionTag,
      isPublicTeaser: payload.isPublicTeaser,
      isPublished: payload.isPublished,
      chipTier: payload.chipTier,
      basePriceCents: payload.basePriceCents,
      authToken,
    });
    if (!res.success || !res.batch) {
      throw new Error(res.error || "Failed to schedule drop.");
    }
    setBatches((prev) => [...prev, res.batch!]);
  };

  const handleToggleTeaser = async (batch: ProductBatch) => {
    setPublishError(null);
    const next = !batch.isPublicTeaser;
    const authToken = await getAuthToken();
    const res = await togglePublicTeaser({
      batchId: batch.id,
      isPublicTeaser: next,
      authToken,
    });
    if (res.success) {
      setBatches((prev) =>
        prev.map((b) => (b.id === batch.id ? { ...b, isPublicTeaser: next } : b)),
      );
    } else {
      setPublishError(res.error || "Failed to update teaser visibility.");
    }
  };

  const handlePublishNow = async (batch: ProductBatch) => {
    setPublishError(null);
    const nowDate = new Date();
    const nowMs = nowDate.getTime();
    const nowIso = nowDate.toISOString();

    let nextAutoRetireAt: string | null = batch.autoRetireAt;
    if (batch.autoRetireAt) {
      const retireMs = Date.parse(batch.autoRetireAt);
      if (Number.isFinite(retireMs) && retireMs <= nowMs) {
        const liveMs = Date.parse(batch.goesLiveAt);
        const origDurationMs =
          Number.isFinite(liveMs) && retireMs > liveMs
            ? retireMs - liveMs
            : 24 * 60 * 60 * 1000;
        nextAutoRetireAt = new Date(nowMs + origDurationMs).toISOString();
      }
    }

    const authToken = await getAuthToken();
    const res = await rescheduleBatchWindow({
      batchId: batch.id,
      goesLiveAt: nowIso,
      autoRetireAt: nextAutoRetireAt,
      isPublished: true,
      authToken,
    });
    if (res.success) {
      setBatches((prev) =>
        prev.map((b) =>
          b.id === batch.id
            ? {
                ...b,
                goesLiveAt: nowIso,
                autoRetireAt: nextAutoRetireAt,
                isPublished: true,
                releaseStatus: "LIVE",
              }
            : b,
        ),
      );
    } else {
      setPublishError(res.error || "Failed to publish batch immediately.");
    }
  };

  const headerLabel = anchorDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Drop Release Calendar
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#CC5500]/15 border border-[#CC5500]/40 font-mono text-[10px] font-bold text-orange-300">
              {batches.length} BATCHES
            </span>
          </div>
          <p className="font-mono text-xs text-white/45 mt-1">
            Schedule goes_live_at launch windows, auto-retire cutoffs, and public storefront teasers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Month / 2-Week View Toggle */}
          <div className="inline-flex rounded-xl bg-white/5 border border-white/10 p-1 font-mono text-xs">
            <button
              type="button"
              onClick={() => setViewMode("month")}
              className={cn(
                "px-3 py-1 rounded-lg transition-colors cursor-pointer",
                viewMode === "month"
                  ? "bg-[#CC5500] text-white font-bold"
                  : "text-white/55 hover:text-white",
              )}
            >
              Month
            </button>
            <button
              type="button"
              onClick={() => setViewMode("2week")}
              className={cn(
                "px-3 py-1 rounded-lg transition-colors cursor-pointer",
                viewMode === "2week"
                  ? "bg-[#CC5500] text-white font-bold"
                  : "text-white/55 hover:text-white",
              )}
            >
              2-Week
            </button>
          </div>

          <button
            type="button"
            onClick={() => openNewForDay(new Date())}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#CC5500] hover:bg-[#e0621a] font-mono text-xs font-bold text-white shadow-[0_0_20px_rgba(204,85,0,0.35)] cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Schedule Drop</span>
          </button>
        </div>
      </div>

      {publishError && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/35 flex items-center justify-between gap-2 text-red-200 font-mono text-xs"
        >
          <span>{publishError}</span>
          <button
            type="button"
            onClick={() => setPublishError(null)}
            className="text-red-300 hover:text-white underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Fulfillment Overlap Advisory Banner */}
      {advisories.length > 0 && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/35 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-start sm:items-center gap-2.5 text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5 sm:mt-0" />
            <div className="font-mono text-xs">
              <span className="font-bold text-amber-300 uppercase tracking-wider mr-2">
                Fulfillment Overlap Advisory:
              </span>
              <span>{advisories[0].message}</span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 font-mono text-[10px] font-bold text-amber-200 whitespace-nowrap">
            {advisories.length} Window Alert{advisories.length === 1 ? "" : "s"}
          </span>
        </div>
      )}

      {/* Calendar Navigation & Legend */}
      <FrostedCard className="p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleNavigate(-1)}
              aria-label="Prev"
              className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 font-mono text-xs text-white/75 flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>
            <button
              type="button"
              onClick={() => handleNavigate(0)}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 font-mono text-xs text-cyan-300 cursor-pointer"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => handleNavigate(1)}
              aria-label="Next"
              className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 font-mono text-xs text-white/75 flex items-center gap-1 cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <span className="ml-2 font-mono text-sm font-bold text-white">{headerLabel}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 font-mono text-[10px]">
            {(Object.keys(STATUS_STYLE) as BatchReleaseStatus[]).map((status) => (
              <span
                key={status}
                className={cn(
                  "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border",
                  STATUS_STYLE[status].pill,
                )}
              >
                <span className={cn("w-1.5 h-1.5 rounded-full", STATUS_STYLE[status].dot)} />
                <span>{STATUS_STYLE[status].label}</span>
              </span>
            ))}
          </div>
        </div>

        {/* 7-Column Calendar Grid */}
        <div className="grid grid-cols-7 gap-1.5">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName) => (
            <div
              key={dayName}
              className="py-1.5 text-center font-mono text-[10px] uppercase tracking-wider text-white/40"
            >
              {dayName}
            </div>
          ))}

          {days.map((day) => {
            const key = toDateKey(day);
            const isToday = key === todayKey;
            const inCurrentMonth = day.getMonth() === anchorDate.getMonth();
            const dayBatches = batches.filter((b) => batchSpansDay(b, day));

            return (
              <div
                key={key}
                onClick={() => openNewForDay(day)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.target !== e.currentTarget) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openNewForDay(day);
                  }
                }}
                className={cn(
                  "min-h-[96px] rounded-xl p-2 border transition-all cursor-pointer flex flex-col gap-1.5 text-left",
                  isToday
                    ? "bg-[#CC5500]/10 border-[#CC5500]/50"
                    : inCurrentMonth || viewMode === "2week"
                      ? "bg-[#161616] border-white/8 hover:border-white/20"
                      : "bg-[#121212]/60 border-white/5 opacity-55 hover:opacity-85",
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "font-mono text-[11px] font-bold",
                      isToday ? "text-[#CC5500]" : "text-white/70",
                    )}
                  >
                    {day.getDate()}
                  </span>
                  {dayBatches.some((b) => overlappingIds.has(b.id)) && (
                    <AlertTriangle
                      className="w-3 h-3 text-amber-400"
                      aria-label="Fulfillment Overlap Advisory"
                    />
                  )}
                </div>

                <div className="space-y-1">
                  {dayBatches.slice(0, 2).map((batch) => {
                    const status = resolveBatchLifecycleStatus(batch);
                    const style = STATUS_STYLE[status];
                    return (
                      <button
                        key={batch.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditBatch(batch);
                        }}
                        className={cn(
                          "w-full text-left px-1.5 py-1 rounded-md border font-mono text-[9px] truncate flex items-center gap-1 cursor-pointer hover:brightness-110",
                          style.pill,
                        )}
                        title={`${batch.title} (${status})`}
                      >
                        <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", style.dot)} />
                        <span className="truncate">{batch.title}</span>
                      </button>
                    );
                  })}
                  {dayBatches.length > 2 && (
                    <span className="block font-mono text-[9px] text-white/45 px-1">
                      +{dayBatches.length - 2} more
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </FrostedCard>

      {/* Upcoming Launch Queue */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-white/80 flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#22D3EE]" />
            <span>Drop Launch Queue &amp; Countdown Telemetry</span>
          </h2>
          <span className="font-mono text-[10px] text-white/40">
            Click any batch to reschedule release window
          </span>
        </div>

        {upcomingQueue.length === 0 ? (
          <FrostedCard className="p-8 text-center space-y-2">
            <CalendarDays className="w-8 h-8 text-orange-400/50 mx-auto" />
            <p className="text-sm font-semibold text-white">No drops scheduled yet</p>
            <p className="font-mono text-xs text-white/45">
              Click any date on the calendar above to queue your next 24hr or 7-day release.
            </p>
          </FrostedCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {upcomingQueue.map((batch) => {
              const status = resolveBatchLifecycleStatus(batch);
              const style = STATUS_STYLE[status];
              const targetMs = getCountdownTargetMs(batch);
              const hasOverlap = overlappingIds.has(batch.id);

              return (
                <FrostedCard key={batch.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full border font-mono text-[9px] font-bold",
                            style.pill,
                          )}
                        >
                          <span className={cn("w-1.5 h-1.5 rounded-full", style.dot)} />
                          <span>{style.label}</span>
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-[9px] text-white/70">
                          {batch.versionTag}
                        </span>
                        {hasOverlap && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/35 font-mono text-[9px] text-amber-300">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            <span>Fulfillment Overlap Advisory</span>
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-white truncate">{batch.title}</h3>
                      <p className="font-mono text-[10px] text-white/45">
                        @{batch.brandHandle} · {batch.sku} · {formatCents(batch.basePriceCents)}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {(status === "DRAFT" || status === "SCHEDULED") && (
                        <button
                          type="button"
                          onClick={() => void handlePublishNow(batch)}
                          className="px-2.5 py-1 rounded-lg bg-[#CC5500]/20 hover:bg-[#CC5500]/35 border border-[#CC5500]/50 font-mono text-[10px] font-bold text-orange-200 cursor-pointer whitespace-nowrap"
                        >
                          Publish Now
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openEditBatch(batch)}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-[#CC5500]/20 border border-white/10 hover:border-[#CC5500]/40 font-mono text-[10px] text-white/75 hover:text-orange-200 cursor-pointer whitespace-nowrap"
                      >
                        Reschedule
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/8 font-mono text-[11px]">
                    <div className="flex items-center gap-2">
                      {targetMs ? (
                        <>
                          <span className="text-white/45">
                            {status === "SCHEDULED" ? "LAUNCHES IN:" : "CLOSES IN:"}
                          </span>
                          <CountdownTimer
                            expiresAt={targetMs}
                            format="drop"
                            className="text-xs font-bold text-[#22D3EE]"
                          />
                        </>
                      ) : (
                        <span className="text-white/40">
                          {status === "RETIRED"
                            ? `Locked permanently at N=${batch.mintedCount}`
                            : "Unpublished Draft"}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleTeaser(batch)}
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] cursor-pointer",
                        batch.isPublicTeaser
                          ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-300"
                          : "bg-white/5 border-white/10 text-white/40",
                      )}
                    >
                      {batch.isPublicTeaser ? (
                        <>
                          <Eye className="w-3 h-3" />
                          <span>Teaser On</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3 h-3" />
                          <span>Hidden</span>
                        </>
                      )}
                    </button>
                  </div>
                </FrostedCard>
              );
            })}
          </div>
        )}
      </div>

      <QuickScheduleModal
        key={editingBatch ? `edit-${editingBatch.id}` : `new-${selectedDateIso}-${modalOpen}`}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        selectedDateIso={selectedDateIso}
        editingBatch={editingBatch}
        onSave={handleSaveBatch}
      />
    </div>
  );
}
