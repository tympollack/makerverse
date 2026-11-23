// components/admin/QuickScheduleModal.tsx
"use client";

import { useState } from "react";
import { CalendarDays, Clock, Sparkles, Eye, EyeOff } from "lucide-react";
import { ModalShell } from "@digitalcanopy/ui";
import type { ProductBatch } from "@/lib/drops/lifecycle";
import type { ChipTier } from "@/lib/mock/shopData";
import { cn } from "@/lib/utils";

interface ScheduleBrandOption {
  id: string;
  handle: string;
  name: string;
}

interface QuickScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDateIso: string; // YYYY-MM-DD
  editingBatch?: ProductBatch | null;
  availableBrands?: ScheduleBrandOption[];
  brandAuthChecked?: boolean;
  defaultBrandHandle?: string;
  onSave: (payload: {
    batchId?: string;
    title: string;
    sku: string;
    brandHandle: string;
    goesLiveAt: string;
    autoRetireAt: string | null;
    versionTag: string;
    isPublicTeaser: boolean;
    isPublished: boolean;
    chipTier: ChipTier;
    basePriceCents: number;
  }) => Promise<void>;
}

type DurationPresetId = "24h" | "72h" | "7d" | "open" | "custom";

const DURATION_PRESETS = [
  { id: "24h", label: "24hr Drop", hours: 24 },
  { id: "72h", label: "72hr Drop", hours: 72 },
  { id: "7d", label: "7d Drop", hours: 168 },
  { id: "open", label: "Open-Ended", hours: null },
] as const;

function toLocalDatetimeInput(isoOrDate: Date | string): string {
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function getInitialDurationPreset(editingBatch?: ProductBatch | null): DurationPresetId {
  if (!editingBatch) return "24h";
  if (!editingBatch.autoRetireAt) return "open";
  const diffMs = Date.parse(editingBatch.autoRetireAt) - Date.parse(editingBatch.goesLiveAt);
  if (!Number.isFinite(diffMs) || diffMs <= 0) return "custom";
  if (Math.abs(diffMs - 24 * 3_600_000) < 60_000) return "24h";
  if (Math.abs(diffMs - 72 * 3_600_000) < 60_000) return "72h";
  if (Math.abs(diffMs - 168 * 3_600_000) < 60_000) return "7d";
  return "custom";
}

export function QuickScheduleModal({
  isOpen,
  onClose,
  selectedDateIso,
  editingBatch,
  availableBrands = [],
  brandAuthChecked = false,
  defaultBrandHandle,
  onSave,
}: QuickScheduleModalProps) {
  const hasNoOwnedBrands = Boolean(
    brandAuthChecked && availableBrands.length === 0 && !editingBatch,
  );
  const [title, setTitle] = useState(() => editingBatch?.title ?? "");
  const [sku, setSku] = useState(() => editingBatch?.sku ?? "MKR-DROP-001");
  const [brandHandle, setBrandHandle] = useState(
    () =>
      editingBatch?.brandHandle ??
      (hasNoOwnedBrands
        ? ""
        : defaultBrandHandle ?? availableBrands[0]?.handle ?? "get-bent"),
  );
  const [initialStartLocal] = useState(() =>
    editingBatch ? toLocalDatetimeInput(editingBatch.goesLiveAt) : `${selectedDateIso}T12:00`,
  );
  const [startLocal, setStartLocal] = useState(() => initialStartLocal);
  const [initialRetireLocal] = useState(() =>
    editingBatch?.autoRetireAt ? toLocalDatetimeInput(editingBatch.autoRetireAt) : "",
  );
  const [customRetireLocal, setCustomRetireLocal] = useState(() => initialRetireLocal);
  const [durationPreset, setDurationPreset] = useState<DurationPresetId>(() =>
    getInitialDurationPreset(editingBatch),
  );
  const [versionTag, setVersionTag] = useState(() => editingBatch?.versionTag ?? "v1.0");
  const [isPublicTeaser, setIsPublicTeaser] = useState(() => editingBatch?.isPublicTeaser ?? true);
  const [isPublished, setIsPublished] = useState(() => editingBatch?.isPublished ?? true);
  const [chipTier, setChipTier] = useState<ChipTier>(() => editingBatch?.chipTier ?? "NTAG213_SERIALIZED");
  const [priceUsd, setPriceUsd] = useState(() =>
    editingBatch ? Math.round(editingBatch.basePriceCents / 100) : 25,
  );
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const applyTimePreset = (hour: number) => {
    const baseDate = startLocal ? startLocal.split("T")[0] : selectedDateIso;
    const hh = String(hour).padStart(2, "0");
    setStartLocal(`${baseDate}T${hh}:00`);
  };

  const computeAutoRetireIso = (): string | null => {
    if (durationPreset === "custom") {
      if (
        editingBatch?.autoRetireAt &&
        customRetireLocal === initialRetireLocal &&
        startLocal === initialStartLocal
      ) {
        return editingBatch.autoRetireAt;
      }
      if (!customRetireLocal) return null;
      const customMs = Date.parse(customRetireLocal);
      return Number.isFinite(customMs) ? new Date(customMs).toISOString() : null;
    }

    const preset = DURATION_PRESETS.find((p) => p.id === durationPreset);
    if (!preset || preset.hours === null) return null;
    if (
      editingBatch?.autoRetireAt &&
      startLocal === initialStartLocal &&
      durationPreset === getInitialDurationPreset(editingBatch)
    ) {
      return editingBatch.autoRetireAt;
    }
    const startMs = Date.parse(startLocal);
    if (!Number.isFinite(startMs)) return null;
    return new Date(startMs + preset.hours * 3_600_000).toISOString();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg("Drop title is required.");
      return;
    }
    const normalizedBrand = brandHandle.trim().toLowerCase().replace(/^@/, "");
    if (!normalizedBrand) {
      setErrorMsg("Brand handle is required.");
      return;
    }
    const startMs = Date.parse(startLocal);
    if (!Number.isFinite(startMs)) {
      setErrorMsg("Valid launch date & time required.");
      return;
    }

    const computedRetireIso = computeAutoRetireIso();
    if (durationPreset === "custom" && !computedRetireIso) {
      setErrorMsg("Valid closing date & time required for custom window.");
      return;
    }
    if (computedRetireIso && Date.parse(computedRetireIso) <= startMs) {
      setErrorMsg("Closing timestamp must be after launch timestamp.");
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    try {
      await onSave({
        batchId: editingBatch?.id,
        title: title.trim(),
        sku: sku.trim() || `MKR-${Date.now().toString(36).slice(-4).toUpperCase()}`,
        brandHandle: normalizedBrand,
        goesLiveAt:
          editingBatch?.goesLiveAt && startLocal === initialStartLocal
            ? editingBatch.goesLiveAt
            : new Date(startMs).toISOString(),
        autoRetireAt: computedRetireIso,
        versionTag,
        isPublicTeaser,
        isPublished,
        chipTier,
        basePriceCents: Math.max(0, Math.round(priceUsd * 100)),
      });
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to save schedule.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={editingBatch ? "Reschedule Drop Release Window" : "Quick-Schedule Drop Release"}
      subtitle={`${selectedDateIso} · Automated goes_live_at → auto_retire_at window`}
      icon={<CalendarDays className="w-4 h-4 text-[#CC5500]" />}
      closeAriaLabel="Close schedule modal"
      className="w-full max-w-xl rounded-2xl bg-[#151515] border border-white/10 shadow-2xl overflow-hidden text-[#F9F9F9] flex flex-col"
      headerClassName="px-5 py-4 border-b border-white/10 bg-[#121212]"
      bodyClassName="p-5 overflow-y-auto"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 font-mono text-xs text-red-300">
            {errorMsg}
          </div>
        )}

        <div className="space-y-1">
          <label htmlFor="sched-brand" className="font-mono text-[11px] text-white/70">
            Storefront Brand Handle
          </label>
          {hasNoOwnedBrands ? (
            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/35 font-mono text-xs text-amber-200">
              No owned storefront brand found for your account. Claim or register a brand before scheduling drops.
            </div>
          ) : availableBrands.length > 0 ? (
            <select
              id="sched-brand"
              value={brandHandle}
              disabled={Boolean(editingBatch)}
              onChange={(e) => setBrandHandle(e.target.value)}
              className="w-full bg-[#1C1C1C] border border-white/10 rounded-lg px-3 py-2 font-mono text-xs text-white disabled:opacity-60 focus:outline-none focus:border-[#CC5500]"
            >
              {!availableBrands.some((b) => b.handle === brandHandle) && (
                <option value={brandHandle}>@{brandHandle}</option>
              )}
              {availableBrands.map((b) => (
                <option key={b.id} value={b.handle}>
                  {b.name} (@{b.handle})
                </option>
              ))}
            </select>
          ) : (
            <input
              id="sched-brand"
              type="text"
              value={brandHandle}
              disabled={Boolean(editingBatch)}
              onChange={(e) => setBrandHandle(e.target.value)}
              placeholder="your-brand-slug"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 font-mono text-xs text-white disabled:opacity-60 focus:outline-none focus:border-[#CC5500]"
            />
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 space-y-1">
            <label htmlFor="sched-title" className="font-mono text-[11px] text-white/70">
              Drop / Batch Title
            </label>
            <input
              id="sched-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Batch 003: Midnight Acid-Wash Tee"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#CC5500]"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="sched-sku" className="font-mono text-[11px] text-white/70">
              Batch SKU
            </label>
            <input
              id="sched-sku"
              type="text"
              value={sku}
              onChange={(e) => setSku(e.target.value.toUpperCase())}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 font-mono text-xs text-cyan-300 focus:outline-none focus:border-[#CC5500]"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <label htmlFor="sched-start" className="font-mono text-[11px] text-white/70 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#22D3EE]" />
              <span>Launch Timestamp (goes_live_at)</span>
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => applyTimePreset(0)}
                className="px-2 py-0.5 rounded bg-white/5 hover:bg-cyan-500/15 border border-white/10 hover:border-cyan-500/40 font-mono text-[10px] text-cyan-300 cursor-pointer"
              >
                12:00 AM
              </button>
              <button
                type="button"
                onClick={() => applyTimePreset(12)}
                className="px-2 py-0.5 rounded bg-white/5 hover:bg-cyan-500/15 border border-white/10 hover:border-cyan-500/40 font-mono text-[10px] text-cyan-300 cursor-pointer"
              >
                12:00 PM
              </button>
              <button
                type="button"
                onClick={() => {
                  setStartLocal(toLocalDatetimeInput(new Date()));
                  setIsPublished(true);
                }}
                className="px-2 py-0.5 rounded bg-[#CC5500]/20 hover:bg-[#CC5500]/35 border border-[#CC5500]/50 font-mono text-[10px] font-bold text-orange-200 cursor-pointer"
              >
                Publish Now
              </button>
            </div>
          </div>
          <input
            id="sched-start"
            type="datetime-local"
            value={startLocal}
            onChange={(e) => setStartLocal(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 font-mono text-xs text-white focus:outline-none focus:border-[#CC5500]"
          />
        </div>

        <div className="space-y-1.5">
          <span className="font-mono text-[11px] text-white/70 block">
            Release Window Duration (auto_retire_at)
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {DURATION_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setDurationPreset(preset.id)}
                className={cn(
                  "px-3 py-2 rounded-lg border font-mono text-xs transition-all cursor-pointer",
                  durationPreset === preset.id
                    ? "bg-[#CC5500]/20 border-[#CC5500] text-orange-200 font-bold"
                    : "bg-white/5 border-white/10 text-white/60 hover:text-white",
                )}
              >
                {preset.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                if (!customRetireLocal) {
                  const baseMs = Date.parse(startLocal);
                  setCustomRetireLocal(
                    Number.isFinite(baseMs)
                      ? toLocalDatetimeInput(new Date(baseMs + 24 * 3_600_000))
                      : "",
                  );
                }
                setDurationPreset("custom");
              }}
              className={cn(
                "px-3 py-2 rounded-lg border font-mono text-xs transition-all cursor-pointer",
                durationPreset === "custom"
                  ? "bg-[#CC5500]/20 border-[#CC5500] text-orange-200 font-bold"
                  : "bg-white/5 border-white/10 text-white/60 hover:text-white",
              )}
            >
              Custom
            </button>
          </div>
          {durationPreset === "custom" && (
            <div className="pt-1.5 space-y-1">
              <label htmlFor="sched-retire" className="font-mono text-[10px] text-white/60 block">
                Closing Timestamp (auto_retire_at)
              </label>
              <input
                id="sched-retire"
                type="datetime-local"
                value={customRetireLocal}
                onChange={(e) => setCustomRetireLocal(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 font-mono text-xs text-white focus:outline-none focus:border-[#CC5500]"
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label htmlFor="sched-version" className="font-mono text-[11px] text-white/70">
              Edition Version
            </label>
            <select
              id="sched-version"
              value={versionTag}
              onChange={(e) => setVersionTag(e.target.value)}
              className="w-full bg-[#1C1C1C] border border-white/10 rounded-lg px-3 py-2 font-mono text-xs text-white focus:outline-none focus:border-[#CC5500]"
            >
              <option value="v1.0">v1.0 (Pure-Type)</option>
              <option value="v2.0">v2.0 (Artist Edition)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="sched-tier" className="font-mono text-[11px] text-white/70">
              Hardware Tier
            </label>
            <select
              id="sched-tier"
              value={chipTier}
              onChange={(e) => setChipTier(e.target.value as ChipTier)}
              className="w-full bg-[#1C1C1C] border border-white/10 rounded-lg px-3 py-2 font-mono text-xs text-white focus:outline-none focus:border-[#CC5500]"
            >
              <option value="NTAG213_SERIALIZED">NTAG213 Serialized</option>
              <option value="QR_REGISTRY">QR Registry</option>
              <option value="NTAG424_DNA">NTAG424 DNA CMAC</option>
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="sched-price" className="font-mono text-[11px] text-white/70">
              Base Price ($)
            </label>
            <input
              id="sched-price"
              type="number"
              min={1}
              value={priceUsd}
              onChange={(e) => setPriceUsd(Number(e.target.value))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 font-mono text-xs text-white focus:outline-none focus:border-[#CC5500]"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={() => setIsPublicTeaser((v) => !v)}
            className={cn(
              "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono text-xs cursor-pointer transition-all",
              isPublicTeaser
                ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-200"
                : "bg-white/5 border-white/10 text-white/50",
            )}
          >
            {isPublicTeaser ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>{isPublicTeaser ? "Public Upcoming Teaser: ON" : "Teaser Hidden"}</span>
          </button>

          <label className="inline-flex items-center gap-2 font-mono text-xs text-white/75 cursor-pointer">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="accent-[#CC5500]"
            />
            <span>Publish to Release Queue (uncheck for Draft)</span>
          </label>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 font-mono text-xs text-white/70 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || hasNoOwnedBrands}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#CC5500] hover:bg-[#e0621a] disabled:opacity-50 font-mono text-xs font-bold text-white shadow-[0_0_20px_rgba(204,85,0,0.35)] cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{saving ? "Saving..." : editingBatch ? "Update Window" : "Confirm Schedule"}</span>
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
