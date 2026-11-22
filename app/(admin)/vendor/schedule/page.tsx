// app/(admin)/vendor/schedule/page.tsx
import { DropScheduleCalendar } from "@/components/admin/DropScheduleCalendar";
import { getVendorBatches } from "@/lib/db/batches";

export const dynamic = "force-dynamic";

export default async function VendorSchedulePage() {
  const batches = await getVendorBatches();
  return <DropScheduleCalendar initialBatches={batches} />;
}
