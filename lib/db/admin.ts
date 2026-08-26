// lib/db/admin.ts
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
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
      const { data: products } = await (supabase.from("products" as any) as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (products && products.length > 0) {
        return products.map((p: any) => ({
          id: p.id,
          sku: p.sku,
          title: p.title,
          chipTier: p.hardware_tier === "NTAG424_DNA_CMAC" ? "NTAG424_DNA" : p.hardware_tier,
          stock: p.stock_quantity,
          maxStock: p.max_stock || 24,
          royaltyBps: Math.round((p.secondary_royalty_pct || 7.5) * 100),
          status: p.stock_quantity === 0 ? "OUT_OF_STOCK" : p.stock_quantity <= 3 ? "LOW_STOCK" : "IN_STOCK",
          coSignRequired: p.co_sign_required,
          lastUpdated: p.updated_at || p.created_at,
        }));
      }
    } catch (err) {
      console.warn("[getAdminInventory] Inventory fallback:", err);
    }
  }
  return INVENTORY_ITEMS;
}

export async function getAdminNfcBatchQueue(): Promise<NfcChipEntry[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const { data: chips } = await (supabase.from("physical_chips" as any) as any)
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

      if (chips && chips.length > 0) {
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
  return NFC_BATCH_QUEUE;
}

export async function getAdminActiveHolds(): Promise<HoldEntry[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const { data: holds } = await (supabase.from("cart_holds" as any) as any)
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
        .order("created_at", { ascending: false });

      if (holds && holds.length > 0) {
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
  return ACTIVE_HOLDS;
}

export async function getAdminPOSTransactions(): Promise<POSTransaction[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const { data: txs } = await (supabase.from("pos_transactions" as any) as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (txs && txs.length > 0) {
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
  return POS_TRANSACTIONS;
}

export async function getAdminInstallations(): Promise<BoothInstallation[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const { data: installations } = await (supabase.from("booth_installations" as any) as any)
        .select("*")
        .order("created_at", { ascending: true });

      if (installations && installations.length > 0) {
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
  return MOCK_INSTALLATIONS;
}

export async function getAdminGuestbook(): Promise<GuestbookEntry[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const { data: entries } = await (supabase.from("guestbook_entries" as any) as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (entries && entries.length > 0) {
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
  return INITIAL_GUESTBOOK_ENTRIES;
}

export async function getAdminRaffles(): Promise<RaffleAttempt[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const { data: raffles } = await (supabase.from("raffle_attempts" as any) as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (raffles && raffles.length > 0) {
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
  return INITIAL_RAFFLE_ATTEMPTS;
}
