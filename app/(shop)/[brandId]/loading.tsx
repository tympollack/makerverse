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
    <FrostedCard className="flex flex-col gap-3">
      <Shimmer className="h-40 w-full" />
      <Shimmer className="h-4 w-24" />
      <Shimmer className="h-3 w-full" />
      <Shimmer className="h-3 w-3/4" />
      <div className="flex items-center justify-between mt-auto">
        <Shimmer className="h-5 w-16" />
        <Shimmer className="h-3 w-20" />
      </div>
      <div className="flex items-center gap-2 pt-2 border-t border-white/8">
        <Shimmer className="h-7 w-32" />
        <Shimmer className="h-7 w-28 ml-auto" />
      </div>
    </FrostedCard>
  );
}

export default function ShopLoading() {
  return (
    <main className="min-h-screen bg-[#1A1A1A]">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-white/8 bg-[#1A1A1A]/80 backdrop-blur-xl px-6 py-3">
        <Shimmer className="h-4 w-48" />
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-10">
        {/* Hero skeleton */}
        <div className="rounded-2xl border border-white/10 overflow-hidden">
          <Shimmer className="h-44 w-full rounded-none" />
          <div className="bg-[#1A1A1A]/80 px-6 py-5 flex items-center gap-4">
            <Shimmer className="w-20 h-20 rounded-2xl flex-shrink-0 -mt-12" />
            <div className="flex-1 space-y-2">
              <Shimmer className="h-5 w-48" />
              <Shimmer className="h-3 w-64" />
              <Shimmer className="h-3 w-full max-w-md" />
            </div>
          </div>
        </div>

        {/* Product grid skeleton */}
        <section className="space-y-4">
          <Shimmer className="h-4 w-32" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
