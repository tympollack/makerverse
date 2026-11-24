// app/(admin)/vendor/page.tsx
import { VendorDashboardClient } from "@/components/admin/VendorDashboardClient";
import {
  getAdminActiveHolds,
  getAdminInventory,
  getAdminPOSTransactions,
} from "@/lib/db/admin";
import { getVendorBatches } from "@/lib/db/batches";

export const dynamic = "force-dynamic";

export default async function VendorDashboardPage() {
  const [inventory, holds, transactions, batches] = await Promise.all([
    getAdminInventory(),
    getAdminActiveHolds(),
    getAdminPOSTransactions(),
    getVendorBatches(),
  ]);

  return (
    <VendorDashboardClient
      inventory={inventory}
      holds={holds}
      transactions={transactions}
      batches={batches}
    />
  );
}
