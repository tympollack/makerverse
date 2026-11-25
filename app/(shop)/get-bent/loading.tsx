// app/(shop)/get-bent/loading.tsx
import { SkeletonBlock } from "@/components/admin/VendorSkeletons";

export default function GetBentLoading() {
  return (
    <main
      role="status"
      aria-busy="true"
      aria-label="Loading Drop Storefront"
      className="min-h-screen bg-[#1A1A1A] text-[#F9F9F9]"
    >
      <nav className="border-b border-white/10 bg-[#1A1A1A]/85 px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <SkeletonBlock className="h-5 w-44" />
          <div className="flex gap-2">
            <SkeletonBlock className="h-7 w-28 rounded-lg" />
            <SkeletonBlock className="h-7 w-24 rounded-lg" />
          </div>
        </div>
      </nav>
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10 space-y-8">
        <SkeletonBlock className="h-24 w-full rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <SkeletonBlock className="lg:col-span-6 h-96 rounded-2xl" />
          <SkeletonBlock className="lg:col-span-6 h-96 rounded-2xl" />
        </div>
      </div>
    </main>
  );
}
