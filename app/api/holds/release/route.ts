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

    // Lookup existing hold to verify ownership
    const existing = await getCartHold(holdId);
    if (!existing.hold) {
      return NextResponse.json(
        { error: `Cart hold '${holdId}' not found or already released` },
        { status: 404 }
      );
    }

    // Security check: Only the hold owner or privileged caller can release the reservation
    const shopper = await resolveShopperIdentity(request, userId);
    const isHoldOwnerUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(existing.hold.userId);

    if (isHoldOwnerUuid && !shopper.isAuthenticated && !shopper.isPrivileged) {
      return NextResponse.json(
        { error: "Forbidden: Authentication required to release verified user holds" },
        { status: 403 }
      );
    }

    if (!shopper.isPrivileged && shopper.userId !== existing.hold.userId) {
      return NextResponse.json(
        { error: "Forbidden: You cannot release another shopper's hold" },
        { status: 403 }
      );
    }

    // Execute Redis release
    const releaseResult = await releaseCartHold(holdId, reason);

    if (!releaseResult.success) {
      return NextResponse.json(releaseResult, { status: 400 });
    }

    // Only sync with Supabase staging DB if Redis release succeeded
    const supabase = getSupabaseServiceRoleClient();
    if (supabase) {
      try {
        const { error: rpcErr } = await (supabase as any).rpc("execute_hold_release", {
          p_hold_id: holdId,
        });
        if (rpcErr) {
          console.warn("[holds/release] Staging DB release RPC error:", rpcErr.message);
          // Fallback to table updates: mark status EXPIRED_RELEASE and restore product stock
          const { data: holdRow } = await (supabase.from("cart_holds" as any) as any)
            .select("*")
            .eq("id", holdId)
            .maybeSingle();

          if (holdRow && (holdRow.status === "ACTIVE_HOLD" || holdRow.status === "PAYMENT_RETRYING")) {
            await (supabase.from("cart_holds" as any) as any)
              .update({ status: "EXPIRED_RELEASE", updated_at: new Date().toISOString() })
              .eq("id", holdId);

            if (holdRow.product_id) {
              const { data: prod } = await (supabase.from("products" as any) as any)
                .select("stock_quantity")
                .eq("id", holdRow.product_id)
                .maybeSingle();

              if (prod) {
                await (supabase.from("products" as any) as any)
                  .update({
                    stock_quantity: prod.stock_quantity + (holdRow.quantity || 1),
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", holdRow.product_id);
              }
            }
          }
        }
      } catch (dbErr) {
        console.warn("[holds/release] Staging DB release fallback:", dbErr);
      }
    }

    return NextResponse.json(releaseResult);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to release hold" }, { status: 500 });
  }
}
