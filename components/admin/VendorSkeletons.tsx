// components/admin/VendorSkeletons.tsx
import { FrostedCard } from "@/components/ui/FrostedCard";
import { cn } from "@/lib/utils";

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={cn("rounded-lg bg-white/5 animate-pulse", className)} />;
}

export function VendorDashboardSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading Vendor Dashboard"
      className="space-y-8 max-w-5xl"
    >
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <FrostedCard key={i} className="flex flex-col gap-3">
            <SkeletonBlock className="w-8 h-8 rounded-lg" />
            <div className="space-y-2">
              <SkeletonBlock className="h-2.5 w-24" />
              <SkeletonBlock className="h-7 w-16" />
            </div>
          </FrostedCard>
        ))}
      </div>

      {/* Two-column activity snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, col) => (
          <FrostedCard key={col} noPadding>
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
              <SkeletonBlock className="h-3.5 w-36" />
              <SkeletonBlock className="h-3 w-16" />
            </div>
            <div className="divide-y divide-white/5">
              {Array.from({ length: 3 }).map((_, row) => (
                <div key={row} className="flex items-center justify-between px-4 py-3 gap-3">
                  <div className="space-y-1.5 flex-1">
                    <SkeletonBlock className="h-3.5 w-44" />
                    <SkeletonBlock className="h-2.5 w-24" />
                  </div>
                  <SkeletonBlock className="h-5 w-20 rounded-full" />
                </div>
              ))}
            </div>
          </FrostedCard>
        ))}
      </div>

      {/* Inventory snapshot */}
      <FrostedCard noPadding>
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
          <SkeletonBlock className="h-3.5 w-40" />
          <SkeletonBlock className="h-3 w-16" />
        </div>
        <div className="divide-y divide-white/5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="px-4 py-3 flex items-center justify-between gap-4">
              <div className="space-y-2 flex-1">
                <SkeletonBlock className="h-3.5 w-56" />
                <SkeletonBlock className="h-2.5 w-28" />
                <SkeletonBlock className="h-1 w-32 rounded-full" />
              </div>
              <SkeletonBlock className="h-5 w-16" />
            </div>
          ))}
        </div>
      </FrostedCard>
    </div>
  );
}

export function VendorInventorySkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading Inventory & NFC Management"
      className="space-y-8 max-w-6xl pb-12"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <SkeletonBlock className="h-6 w-64" />
          <SkeletonBlock className="h-3 w-96 max-w-full" />
        </div>
        <SkeletonBlock className="h-9 w-40 rounded-lg" />
      </div>

      <SkeletonBlock className="h-16 w-full rounded-xl" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <FrostedCard key={i} className="space-y-2">
            <SkeletonBlock className="h-3 w-28" />
            <SkeletonBlock className="h-7 w-20" />
          </FrostedCard>
        ))}
      </div>

      <FrostedCard noPadding>
        <div className="px-4 py-3 border-b border-white/8 flex items-center justify-between">
          <SkeletonBlock className="h-4 w-48" />
          <SkeletonBlock className="h-8 w-56 rounded-lg" />
        </div>
        <div className="divide-y divide-white/5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="px-4 py-3.5 flex items-center justify-between gap-4">
              <SkeletonBlock className="h-4 w-52" />
              <SkeletonBlock className="h-4 w-24" />
              <SkeletonBlock className="h-5 w-20 rounded-full" />
              <SkeletonBlock className="h-7 w-28 rounded-lg" />
            </div>
          ))}
        </div>
      </FrostedCard>
    </div>
  );
}

export function VendorScheduleSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading Drop Schedule"
      className="space-y-6 max-w-6xl pb-12"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <SkeletonBlock className="h-6 w-56" />
          <SkeletonBlock className="h-3 w-80 max-w-full" />
        </div>
        <div className="flex items-center gap-2">
          <SkeletonBlock className="h-8 w-24 rounded-lg" />
          <SkeletonBlock className="h-8 w-28 rounded-lg" />
        </div>
      </div>

      <FrostedCard className="p-4 space-y-3">
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-4 w-full" />
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 14 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      </FrostedCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <FrostedCard key={i} className="space-y-3">
            <SkeletonBlock className="h-4 w-24 rounded-full" />
            <SkeletonBlock className="h-5 w-52" />
            <SkeletonBlock className="h-3 w-36" />
          </FrostedCard>
        ))}
      </div>
    </div>
  );
}

export function VendorHoldsSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading Cart Holds"
      className="space-y-6 max-w-6xl"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <SkeletonBlock className="h-6 w-64" />
          <SkeletonBlock className="h-3 w-80 max-w-full" />
        </div>
        <div className="flex gap-2">
          <SkeletonBlock className="h-9 w-36 rounded-lg" />
          <SkeletonBlock className="h-9 w-28 rounded-lg" />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <FrostedCard key={i} className="space-y-2">
            <SkeletonBlock className="h-3 w-24" />
            <SkeletonBlock className="h-7 w-14" />
          </FrostedCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <FrostedCard key={i} className="space-y-3">
            <div className="flex justify-between">
              <SkeletonBlock className="h-4 w-48" />
              <SkeletonBlock className="h-5 w-24 rounded-full" />
            </div>
            <SkeletonBlock className="h-2 w-full rounded-full" />
            <div className="flex gap-2">
              <SkeletonBlock className="h-7 w-24 rounded-lg" />
              <SkeletonBlock className="h-7 w-20 rounded-lg" />
            </div>
          </FrostedCard>
        ))}
      </div>
    </div>
  );
}

export function VendorPosSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading POS Terminal"
      className="space-y-6 max-w-4xl"
    >
      <div className="space-y-2">
        <SkeletonBlock className="h-6 w-72" />
        <SkeletonBlock className="h-3 w-80 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <SkeletonBlock className="h-14 rounded-xl" />
        <SkeletonBlock className="h-14 rounded-xl" />
      </div>
      <FrostedCard className="space-y-4 p-6">
        <SkeletonBlock className="h-5 w-52" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SkeletonBlock className="h-24 rounded-xl" />
          <SkeletonBlock className="h-24 rounded-xl" />
        </div>
        <SkeletonBlock className="h-10 w-44 rounded-lg" />
      </FrostedCard>
    </div>
  );
}

export function VendorInstallationsSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading Booth Installations"
      className="space-y-6 max-w-6xl pb-12"
    >
      <FrostedCard className="p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <SkeletonBlock className="w-11 h-11 rounded-xl" />
          <div className="space-y-2">
            <SkeletonBlock className="h-5 w-64" />
            <SkeletonBlock className="h-3 w-48" />
          </div>
        </div>
        <SkeletonBlock className="h-9 w-56 rounded-xl" />
      </FrostedCard>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <FrostedCard key={i} className="space-y-2">
            <SkeletonBlock className="h-3 w-28" />
            <SkeletonBlock className="h-7 w-20" />
          </FrostedCard>
        ))}
      </div>

      <FrostedCard className="space-y-3 p-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-16 w-full rounded-xl" />
        ))}
      </FrostedCard>
    </div>
  );
}
