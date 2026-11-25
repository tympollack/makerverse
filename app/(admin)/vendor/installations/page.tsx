// app/(admin)/vendor/installations/page.tsx
import { AuthenticatedBoothEngine } from "@/components/admin/AuthenticatedVendorViews";

export const dynamic = "force-dynamic";

export default function InstallationsPage() {
  return (
    <div className="space-y-6">
      <AuthenticatedBoothEngine />
    </div>
  );
}
