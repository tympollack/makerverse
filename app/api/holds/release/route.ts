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
