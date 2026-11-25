// app/(admin)/vendor/pos/page.tsx
import { AuthenticatedPosTerminal } from "@/components/admin/AuthenticatedVendorViews";

export const dynamic = "force-dynamic";

export default function POSPage() {
  return <AuthenticatedPosTerminal />;
}
