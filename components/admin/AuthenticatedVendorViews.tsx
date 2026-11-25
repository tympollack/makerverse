// components/admin/AuthenticatedVendorViews.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { VendorDashboardClient } from "@/components/admin/VendorDashboardClient";
import { HoldEngineMonitor } from "@/components/admin/HoldEngineMonitor";
import { POSTerminal } from "@/components/admin/POSTerminal";
import { BoothEngine } from "@/components/admin/BoothEngine";
import type {
  BoothInstallation,
  GuestbookEntry,
  HoldEntry,
  InventoryItem,
  POSTransaction,
  RaffleAttempt,
} from "@/lib/mock/adminData";
import type { ProductBatch } from "@/lib/drops/lifecycle";

async function getSessionToken(): Promise<string | null> {
  const sb = getSupabaseBrowserClient();
  if (!sb) return null;
  try {
    const { data } = await sb.auth.getSession();
    return data?.session?.access_token ?? null;
  } catch {
    return null;
  }
}

export function AuthenticatedVendorDashboard() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [holds, setHolds] = useState<HoldEntry[]>([]);
  const [transactions, setTransactions] = useState<POSTransaction[]>([]);
  const [batches, setBatches] = useState<ProductBatch[]>([]);

  useEffect(() => {
    if (typeof fetch !== "function") return;
    let active = true;

    async function load() {
      const token = await getSessionToken();
      if (!token || !active) return;
      const headers = { Authorization: `Bearer ${token}` };

      const [invRes, holdsRes, posRes, dropsRes] = await Promise.all([
        fetch("/api/admin/inventory", { headers }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch("/api/admin/holds", { headers }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch("/api/admin/pos", { headers }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch("/api/drops?mode=all", { headers }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ]);

      if (!active) return;
      if (Array.isArray(invRes?.items)) setInventory(invRes.items);
      if (Array.isArray(holdsRes?.holds)) setHolds(holdsRes.holds);
      if (Array.isArray(posRes?.transactions)) setTransactions(posRes.transactions);
      if (Array.isArray(dropsRes?.batches)) setBatches(dropsRes.batches);
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <VendorDashboardClient
      inventory={inventory}
      holds={holds}
      transactions={transactions}
      batches={batches}
    />
  );
}

export function AuthenticatedHoldMonitor() {
  const [holds, setHolds] = useState<HoldEntry[]>([]);
  const [revision, setRevision] = useState(0);

  const fetchLiveHolds = useCallback(async (): Promise<HoldEntry[]> => {
    if (typeof fetch !== "function") return [];
    const token = await getSessionToken();
    if (!token) return [];
    try {
      const res = await fetch("/api/admin/holds", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data?.holds) ? data.holds : [];
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    let active = true;
    void fetchLiveHolds().then((rows) => {
      if (!active) return;
      setHolds(rows);
      setRevision((r) => r + 1);
    });
    return () => {
      active = false;
    };
  }, [fetchLiveHolds]);

  return (
    <HoldEngineMonitor
      key={revision}
      initialHolds={holds}
      initialEvents={[]}
      liveMode
      onSync={fetchLiveHolds}
    />
  );
}

export function AuthenticatedPosTerminal() {
  const [transactions, setTransactions] = useState<POSTransaction[]>([]);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (typeof fetch !== "function") return;
    let active = true;

    async function load() {
      const token = await getSessionToken();
      if (!token || !active) return;
      try {
        const res = await fetch("/api/admin/pos", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok || !active) return;
        const data = await res.json();
        if (Array.isArray(data?.transactions)) {
          setTransactions(data.transactions);
          setRevision((r) => r + 1);
        }
      } catch {
        // Keep empty state on failure
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  return <POSTerminal key={revision} initialTransactions={transactions} />;
}

export function AuthenticatedBoothEngine() {
  const [installations, setInstallations] = useState<BoothInstallation[]>([]);
  const [guestbook, setGuestbook] = useState<GuestbookEntry[]>([]);
  const [raffles, setRaffles] = useState<RaffleAttempt[]>([]);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (typeof fetch !== "function") return;
    let active = true;

    async function load() {
      const token = await getSessionToken();
      if (!token || !active) return;
      const headers = { Authorization: `Bearer ${token}` };

      const [instRes, gbRes, rafRes] = await Promise.all([
        fetch("/api/admin/installations", { headers }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch("/api/admin/guestbook", { headers }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch("/api/admin/raffle", { headers }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ]);

      if (!active) return;
      if (Array.isArray(instRes?.installations)) setInstallations(instRes.installations);
      if (Array.isArray(gbRes?.entries)) setGuestbook(gbRes.entries);
      if (Array.isArray(rafRes?.attempts)) setRaffles(rafRes.attempts);
      setRevision((r) => r + 1);
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <BoothEngine
      key={revision}
      initialInstallations={installations}
      initialGuestbook={guestbook}
      initialRaffles={raffles}
    />
  );
}
