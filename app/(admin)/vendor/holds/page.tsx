// app/(admin)/vendor/holds/page.tsx
import { HoldEngineMonitor } from "@/components/admin/HoldEngineMonitor";
import { getAdminActiveHolds } from "@/lib/db/admin";

export const dynamic = "force-dynamic";

export default async function HoldsPage() {
  const holds = await getAdminActiveHolds();
  return <HoldEngineMonitor initialHolds={holds} />;
}
