// app/(admin)/vendor/page.tsx
import { VendorOverviewClient } from "@/components/admin/VendorOverviewClient";
import { getVendorEmailTelemetry } from "@/lib/db/emailTelemetry";

export const dynamic = "force-dynamic";

export default async function VendorDashboardPage() {
  const emailTelemetry = await getVendorEmailTelemetry();

  return <VendorOverviewClient emailTelemetry={emailTelemetry} />;
}
