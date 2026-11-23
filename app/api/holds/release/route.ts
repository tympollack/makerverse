// app/api/holds/release/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCartHold, releaseCartHold } from "@/lib/redis/holdEngine";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { resolveShopperIdentity } from "@/lib/auth/shopperAuth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { holdId, reason = "user_cancelled", userId } = body;

    if (!holdId) {
      return NextResponse.json({ error: "Missing holdId" }, { status: 400 });
    }

    const supabase = getSupabaseServiceRoleClient();

    // Lookup existing hold in Redis (or fallback to persisted cart_holds if TTL expired)
    const existing = await getCartHold(holdId);
    let holdOwnerId = existing.hold?.userId ?? null;
    let persistedRow: Record<string, any> | null = null;

    if (!existing.hold && supabase) {
      try {
        const { data: holdRow } = await (supabase.from("cart_holds" as any) as any)
          .select("*")
          .eq("id", holdId)
          .maybeSingle();
        if (holdRow) {
          persistedRow = holdRow;
          holdOwnerId = holdRow.user_id ?? null;
        }
      } catch (dbErr) {
        console.warn("[holds/release] DB fallback lookup failed:", dbErr);
      }
    }

    if (!existing.hold && !persistedRow) {
      return NextResponse.json(
        { error: `Cart hold '${holdId}' not found or already released` },
        { status: 404 }
      );
    }

    // Security check: Only the hold owner or privileged caller can release the reservation
    const shopper = await resolveShopperIdentity(request, userId);
    const effectiveOwnerId = holdOwnerId || "shopper_anon";
    const isHoldOwnerUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(effectiveOwnerId);

    if (isHoldOwnerUuid && !shopper.isAuthenticated && !shopper.isPrivileged) {
      return NextResponse.json(
        { error: "Forbidden: Authentication required to release verified user holds" },
        { status: 403 }
      );
    }

    if (!shopper.isPrivileged && holdOwnerId && shopper.userId !== holdOwnerId) {
      return NextResponse.json(
        { error: "Forbidden: You cannot release another shopper's hold" },
        { status: 403 }
      );
    }

    if (!existing.hold && persistedRow) {
      if (persistedRow.status === "FULFILLED") {
        return NextResponse.json(
          { success: false, code: "ALREADY_FULFILLED", error: `Cart hold '${holdId}' is already fulfilled` },
          { status: 400 }
        );
      }
      if (supabase && (persistedRow.status === "ACTIVE_HOLD" || persistedRow.status === "PAYMENT_RETRYING")) {
        await (supabase.from("cart_holds" as any) as any)
          .update({ status: "EXPIRED_RELEASE", updated_at: new Date().toISOString() })
          .eq("id", holdId);
      }
      return NextResponse.json({
        success: true,
        releasedHold: {
          holdId,
          productId: persistedRow.product_id,
          userId: effectiveOwnerId,
          qty: persistedRow.quantity || 1,
          state: "EXPIRED_RELEASE",
        },
      });
    }

    // Execute Redis release (authoritative reservation lock)
    const releaseResult = await releaseCartHold(holdId, reason);

    if (!releaseResult.success) {
      return NextResponse.json(releaseResult, { status: 400 });
    }

    // Sync hold status in Supabase without mutating physical products.stock_quantity
    if (supabase) {
      try {
        await (supabase.from("cart_holds" as any) as any)
          .update({ status: "EXPIRED_RELEASE", updated_at: new Date().toISOString() })
          .eq("id", holdId)
          .in("status", ["ACTIVE_HOLD", "PAYMENT_RETRYING"]);
      } catch (dbErr) {
        console.warn("[holds/release] Staging DB hold status sync fallback:", dbErr);
      }
    }

    return NextResponse.json(releaseResult);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to release hold" }, { status: 500 });
  }
}
