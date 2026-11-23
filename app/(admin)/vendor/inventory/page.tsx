// app/(admin)/vendor/inventory/page.tsx
import { InventoryManager } from "@/components/admin/InventoryManager";
import {
  getAdminInventory,
  getAdminNfcBatchQueue,
} from "@/lib/db/admin";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const [items, chips] = await Promise.all([
    getAdminInventory(),
    getAdminNfcBatchQueue(),
  ]);

  return (
    <InventoryManager
      initialItems={items}
      initialChips={chips}
    />
  );
}
