// app/(admin)/vendor/pos/page.tsx
import { POSTerminal } from "@/components/admin/POSTerminal";
import { getAdminPOSTransactions } from "@/lib/db/admin";

export const dynamic = "force-dynamic";

export default async function POSPage() {
  const transactions = await getAdminPOSTransactions();
  return <POSTerminal initialTransactions={transactions} />;
}
