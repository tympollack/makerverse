// app/(admin)/vendor/page.tsx
import { AuthenticatedVendorDashboard } from "@/components/admin/AuthenticatedVendorViews";

export const dynamic = "force-dynamic";

export default function VendorDashboardPage() {
  return <AuthenticatedVendorDashboard />;
}
