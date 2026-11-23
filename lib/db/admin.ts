// lib/db/admin.ts
import { getSupabaseServerClient, getSupabaseServiceRoleClient } from "@/lib/supabase/server";
import type { BatchOrderRow } from "@/lib/utils/exportBatchManifest";
import {
  IS_MOCK_ENABLED,
  TELEMETRY,
  INVENTORY_ITEMS,
  NFC_BATCH_QUEUE,
  ACTIVE_HOLDS,
  POS_TRANSACTIONS,
  MOCK_INSTALLATIONS,
  INITIAL_GUESTBOOK_ENTRIES,
  INITIAL_RAFFLE_ATTEMPTS,
  type InventoryItem,
  type NfcChipEntry,
  type HoldEntry,
  type POSTransaction,
  type BoothInstallation,
  type GuestbookEntry,
  type RaffleAttempt,
} from "@/lib/mock/adminData";

export async function getAdminTelemetry() {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      return {
        ...TELEMETRY,
        edgeNodeStatus: "ONLINE" as const,
      };
    } catch (err) {
      console.warn("[getAdminTelemetry] Telemetry fallback:", err);
    }
  }
  return TELEMETRY;
}

export async function getAdminInventory(): Promise<InventoryItem[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const { data: products, error } = await (supabase.from("products" as any) as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && products) {
        return products.map((p: any) => {
          const spec =
            p.hardware_spec && typeof p.hardware_spec === "object"
              ? p.hardware_spec
              : {};
          return {
            id: p.id,
            sku: p.sku,
            title: p.title,
            chipTier:
              p.hardware_tier === "NTAG424_DNA_CMAC"
                ? "NTAG424_DNA"
                : p.hardware_tier,
            stock: p.stock_quantity,
            maxStock: p.max_stock || 24,
            priceCents: p.price_cents ?? 2500,
            royaltyBps: Math.round((p.secondary_royalty_pct || 7.5) * 100),
            status:
              p.stock_quantity === 0
                ? "OUT_OF_STOCK"
                : p.stock_quantity <= 3
                  ? "LOW_STOCK"
                  : "IN_STOCK",
            coSignRequired: p.co_sign_required,
            lastUpdated: p.updated_at || p.created_at,
            versionTag: spec.versionTag || undefined,
            artistAttribution: spec.artistAttribution || undefined,
            parentSku: spec.parentSku || undefined,
            frontChestStamp: spec.frontChestStamp || undefined,
            backStatement: spec.backStatement || undefined,
            auctionEnabled: Boolean(spec.auctionEnabled),
            durationHours: spec.durationHours ?? null,
          };
        });
      }
    } catch (err) {
      console.warn("[getAdminInventory] Inventory fallback:", err);
    }
  }
  return IS_MOCK_ENABLED ? INVENTORY_ITEMS : [];
}

export async function getAdminNfcBatchQueue(): Promise<NfcChipEntry[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const { data: chips, error } = await (supabase.from("physical_chips" as any) as any)
        .select(`
          uid,
          lock_status,
          mint_status,
          metadata,
          products (
            sku,
            title,
            hardware_tier
          )
        `)
        .order("created_at", { ascending: false });

      if (!error && chips) {
        return chips.map((c: any) => {
          const product = c.products || {};
          const meta = typeof c.metadata === "object" ? c.metadata : {};
          return {
            uid: c.uid,
            cmac: meta.cmac || "3A9F1C2E4B8D7F60",
            tier: product.hardware_tier === "NTAG424_DNA_CMAC" ? "NTAG424_DNA" : "NTAG215_SERIALIZED",
            assignedSku: product.sku || null,
            lockState: c.lock_status === "PASSWORD_PROTECTED" ? "PASSWORD_PROTECTED" : "UNLOCKED",
            ferriteBacking: Boolean(meta.ferriteBacking ?? true),
            encodedAt: c.created_at || null,
          };
        });
      }
    } catch (err) {
      console.warn("[getAdminNfcBatchQueue] Queue fallback:", err);
    }
  }
  return IS_MOCK_ENABLED ? NFC_BATCH_QUEUE : [];
}

export async function getAdminActiveHolds(): Promise<HoldEntry[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const { data: holds, error } = await (supabase.from("cart_holds" as any) as any)
        .select(`
          id,
          product_id,
          quantity,
          status,
          expires_at,
          created_at,
          products (
            sku,
            title
          )
        `)
        .eq("status", "ACTIVE_HOLD")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });

      if (!error && holds) {
        return holds.map((h: any) => {
          const product = h.products || {};
          const expiresMs = new Date(h.expires_at).getTime();
          const createdMs = new Date(h.created_at).getTime();
          return {
            holdId: h.id,
            redisKey: `makerverse:hold:${h.id}`,
            productId: h.product_id,
            productTitle: product.title || "Reserved Craft Item",
            sku: product.sku || "PROD-SKU",
            buyerHandle: "@makerverse_shopper",
            buyerAddress: "0x8f2A...1cD9",
            createdAt: createdMs,
            expiresAt: expiresMs,
            ttlSeconds: 900,
            state: "ACTIVE_HOLD",
          };
        });
      }
    } catch (err) {
      console.warn("[getAdminActiveHolds] Holds fallback:", err);
    }
  }
  return IS_MOCK_ENABLED ? ACTIVE_HOLDS : [];
}

export async function getAdminPOSTransactions(): Promise<POSTransaction[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const { data: txs, error } = await (supabase.from("pos_transactions" as any) as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && txs) {
        return txs.map((t: any) => ({
          txId: t.id,
          mode: t.mode,
          productTitle: t.product_title,
          sku: t.sku,
          price: t.price_cents,
          timestamp: t.created_at,
          buyerHandle: t.buyer_handle || null,
          chipUid: t.chip_uid,
          status: t.status,
          nfcTapped: t.nfc_tapped,
          qrScanned: t.qr_scanned,
        }));
      }
    } catch (err) {
      console.warn("[getAdminPOSTransactions] POS fallback:", err);
    }
  }
  return IS_MOCK_ENABLED ? POS_TRANSACTIONS : [];
}

export async function getAdminInstallations(): Promise<BoothInstallation[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const { data: installations, error } = await (supabase.from("booth_installations" as any) as any)
        .select("*")
        .order("created_at", { ascending: true });

      if (!error && installations) {
        return installations.map((i: any) => ({
          id: i.id,
          name: i.name,
          type: i.installation_type,
          chipCount: i.chip_count,
          status: i.status,
          lastPing: "just now",
          location: i.location,
          triggerCount: i.trigger_count,
          hardwareUid: i.hardware_uid,
          stationIp: i.station_ip,
          readerModel: i.reader_model,
        }));
      }
    } catch (err) {
      console.warn("[getAdminInstallations] Installations fallback:", err);
    }
  }
  return IS_MOCK_ENABLED ? MOCK_INSTALLATIONS : [];
}

export async function getAdminGuestbook(): Promise<GuestbookEntry[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const { data: entries, error } = await (supabase.from("guestbook_entries" as any) as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && entries) {
        return entries.map((e: any) => ({
          id: e.id,
          attendeeHandle: e.attendee_handle,
          attendeeName: e.attendee_name,
          avatarInitials: e.avatar_initials,
          verifiedTier: e.verified_tier as any,
          comment: e.comment,
          timestamp: new Date(e.created_at).getTime(),
          tapType: e.tap_type as any,
          stationId: e.installation_id,
          tapCount: e.tap_count,
          badgeEarned: e.badge_earned || undefined,
        }));
      }
    } catch (err) {
      console.warn("[getAdminGuestbook] Guestbook fallback:", err);
    }
  }
  return IS_MOCK_ENABLED ? INITIAL_GUESTBOOK_ENTRIES : [];
}

export async function getAdminRaffles(): Promise<RaffleAttempt[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const { data: raffles, error } = await (supabase.from("raffle_attempts" as any) as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && raffles) {
        return raffles.map((r: any) => ({
          id: r.id,
          attendeeHandle: r.attendee_handle,
          timestamp: new Date(r.created_at).getTime(),
          outcome: r.outcome,
          prizeWon: r.prize_won || undefined,
          rewardCode: r.reward_code || undefined,
          discountPercent: r.discount_percent || undefined,
          dispatchStatus: r.dispatch_status,
          qrPayload: r.qr_payload || undefined,
        }));
      }
    } catch (err) {
      console.warn("[getAdminRaffles] Raffles fallback:", err);
    }
  }
  return IS_MOCK_ENABLED ? INITIAL_RAFFLE_ATTEMPTS : [];
}

/**
 * Aggregates finalized POS transactions and fulfilled cart holds keyed by uppercase SKU
 * so BatchSettlementModal exports real production order manifests instead of an empty list.
 */
export async function getAdminBatchOrdersMap(): Promise<Record<string, BatchOrderRow[]>> {
  const supabase = getSupabaseServiceRoleClient() || getSupabaseServerClient();
  const ordersBySku: Record<string, BatchOrderRow[]> = {};

  if (!supabase) {
    return ordersBySku;
  }

  try {
    const { data: posRows } = await (supabase.from("pos_transactions" as any) as any)
      .select("id, sku, price_cents, buyer_handle, status, created_at")
      .order("created_at", { ascending: true });

    if (Array.isArray(posRows)) {
      for (const row of posRows) {
        const skuKey = String(row.sku || "").trim().toUpperCase();
        if (!skuKey) continue;
        if (!ordersBySku[skuKey]) ordersBySku[skuKey] = [];
        const serialNumber = ordersBySku[skuKey].length + 1;
        ordersBySku[skuKey].push({
          serialNumber,
          editionDenominator: serialNumber,
          size: "L",
          recipientName: row.buyer_handle || `Collector #${String(serialNumber).padStart(3, "0")}`,
          address: "",
          city: "",
          state: "",
          zip: "",
          holderHandle: row.buyer_handle || `@collector_${String(serialNumber).padStart(3, "0")}`,
          claimStatus: row.status === "UNCLAIMED" ? "UNCLAIMED" : "MINTED_INITIAL",
          paidDollars: Number(((row.price_cents || 0) / 100).toFixed(2)),
        });
      }
    }

    const { data: fulfilledHolds } = await (supabase.from("cart_holds" as any) as any)
      .select("id, quantity, user_id, products(sku, price_cents, max_stock)")
      .eq("status", "FULFILLED")
      .order("created_at", { ascending: true });

    if (Array.isArray(fulfilledHolds)) {
      for (const hold of fulfilledHolds) {
        const prod = Array.isArray(hold.products) ? hold.products[0] : hold.products;
        const skuKey = String(prod?.sku || "").trim().toUpperCase();
        if (!skuKey) continue;
        if (!ordersBySku[skuKey]) ordersBySku[skuKey] = [];
        const qty = Math.max(1, Number(hold.quantity || 1));
        for (let i = 0; i < qty; i++) {
          const serialNumber = ordersBySku[skuKey].length + 1;
          ordersBySku[skuKey].push({
            serialNumber,
            editionDenominator: Number(prod?.max_stock || serialNumber),
            size: "L",
            recipientName: hold.user_id || `Collector #${String(serialNumber).padStart(3, "0")}`,
            address: "",
            city: "",
            state: "",
            zip: "",
            holderHandle: hold.user_id || `@collector_${String(serialNumber).padStart(3, "0")}`,
            claimStatus: "MINTED_INITIAL",
            paidDollars: Number(((prod?.price_cents || 0) / 100).toFixed(2)),
          });
        }
      }
    }

    for (const list of Object.values(ordersBySku)) {
      const total = list.length;
      for (const entry of list) {
        if (entry.editionDenominator < total) {
          entry.editionDenominator = total;
        }
      }
    }
  } catch (err) {
    console.warn("[getAdminBatchOrdersMap] Batch order aggregation notice:", err);
  }

  return ordersBySku;
}
