// app/(admin)/vendor/installations/page.tsx
import { BoothEngine } from "@/components/admin/BoothEngine";
import {
  getAdminGuestbook,
  getAdminInstallations,
  getAdminRaffles,
} from "@/lib/db/admin";

export const dynamic = "force-dynamic";

export default async function InstallationsPage() {
  const [installations, guestbook, raffles] = await Promise.all([
    getAdminInstallations(),
    getAdminGuestbook(),
    getAdminRaffles(),
  ]);

  return (
    <div className="space-y-6">
      <BoothEngine
        initialInstallations={installations}
        initialGuestbook={guestbook}
        initialRaffles={raffles}
      />
    </div>
  );
}
