// app/(admin)/vendor/inventory/page.tsx
import { InventoryManager } from "@/components/admin/InventoryManager";
import {
  getAdminBatchOrdersMap,
  getAdminInventory,
  getAdminNfcBatchQueue,
} from "@/lib/db/admin";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const [items, chips, ordersBySku] = await Promise.all([
    getAdminInventory(),
    getAdminNfcBatchQueue(),
    getAdminBatchOrdersMap(),
  ]);

  return (
    <InventoryManager
      initialItems={items}
      initialChips={chips}
      initialOrdersBySku={ordersBySku}
    />
  );
}
