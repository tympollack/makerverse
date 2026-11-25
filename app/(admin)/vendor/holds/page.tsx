// app/(admin)/vendor/holds/page.tsx
import { AuthenticatedHoldMonitor } from "@/components/admin/AuthenticatedVendorViews";

export const dynamic = "force-dynamic";

export default function HoldsPage() {
  return <AuthenticatedHoldMonitor />;
}
