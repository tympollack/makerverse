// app/(admin)/vendor/schedule/page.tsx
import { DropScheduleCalendar } from "@/components/admin/DropScheduleCalendar";
import { getVendorBatches } from "@/lib/db/batches";
import { getAllBrands } from "@/lib/db/brands";

export const dynamic = "force-dynamic";

export default async function VendorSchedulePage() {
  const [batches, brands] = await Promise.all([
    getVendorBatches(),
    getAllBrands(),
  ]);

  return (
    <DropScheduleCalendar
      initialBatches={batches}
      initialBrands={brands.map((b) => ({
        id: b.id,
        handle: b.handle,
        name: b.name,
      }))}
    />
  );
}
