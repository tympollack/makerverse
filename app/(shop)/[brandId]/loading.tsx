// app/(shop)/[brandId]/loading.tsx
import { FrostedCard } from "@/components/ui/FrostedCard";

function Shimmer({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-lg bg-white/5 animate-pulse ${className}`}
    />
  );
}

function ProductCardSkeleton() {
  return (
    <FrostedCard className="flex flex-col gap-4">
      <Shimmer className="h-48 w-full rounded-xl" />
      <div className="space-y-2">
        <div className="flex justify-between">
          <Shimmer className="h-3 w-20" />
          <Shimmer className="h-3 w-28" />
        </div>
        <Shimmer className="h-1.5 w-full rounded-full" />
      </div>
      <div className="space-y-2 flex-1">
        <Shimmer className="h-5 w-3/4" />
        <Shimmer className="h-3.5 w-1/3" />
        <Shimmer className="h-3 w-full" />
        <Shimmer className="h-3 w-4/5" />
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-white/8">
        <Shimmer className="h-6 w-20" />
        <Shimmer className="h-7 w-24 rounded-lg" />
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-white/8">
        <Shimmer className="h-8 w-28 rounded-lg" />
        <Shimmer className="h-8 w-24 rounded-lg" />
      </div>
    </FrostedCard>
  );
}

export default function ShopLoading() {
  return (
    <main className="min-h-screen bg-[#1A1A1A]">
      {/* Top Nav Strip */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#1A1A1A]/80 backdrop-blur-xl px-6 py-3.5 flex items-center justify-between">
        <Shimmer className="h-4 w-44" />
        <div className="flex items-center gap-2">
          <Shimmer className="h-7 w-24 rounded-lg" />
          <Shimmer className="h-7 w-32 rounded-lg" />
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-12">
        {/* Brand Hero Skeleton */}
        <div className="rounded-2xl border border-white/10 overflow-hidden bg-[#161616]">
          <Shimmer className="h-48 sm:h-56 w-full rounded-none" />
          <div className="bg-[#1A1A1A]/95 px-6 py-6 flex flex-col lg:flex-row items-start lg:items-center gap-6">
            <Shimmer className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl flex-shrink-0 -mt-20 lg:-mt-24" />
            <div className="flex-1 space-y-3 w-full">
              <Shimmer className="h-7 w-64" />
              <Shimmer className="h-4 w-80" />
              <Shimmer className="h-3 w-full max-w-xl" />
              <Shimmer className="h-3 w-3/4 max-w-lg" />
            </div>
            <div className="flex flex-col items-end gap-3 w-full lg:w-auto">
              <Shimmer className="h-10 w-44 rounded-xl" />
              <div className="flex gap-4">
                <Shimmer className="h-8 w-16" />
                <Shimmer className="h-8 w-16" />
                <Shimmer className="h-8 w-20" />
              </div>
            </div>
          </div>
        </div>

        {/* Product Grid Skeleton */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <Shimmer className="h-5 w-40" />
            <Shimmer className="h-8 w-64 rounded-xl" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
