// app/api/products/signal/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { getProductById } from "@/lib/db/products";
import { resolveShopperIdentity } from "@/lib/auth/shopperAuth";

export async function POST(request: NextRequest) {
  try {
    const shopper = await resolveShopperIdentity(request);
    if (!shopper.isAuthenticated && !shopper.isPrivileged) {
      return NextResponse.json(
        { error: "Authentication required to signal product interest" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { productId, count, active = true } = body;

    if (!productId) {
      return NextResponse.json({ error: "Missing productId" }, { status: 400 });
    }

    const product = await getProductById(productId);
    if (!product) {
      return NextResponse.json({ error: `Product '${productId}' not found` }, { status: 404 });
    }

    const supabase = getSupabaseServiceRoleClient();
    if (supabase) {
      try {
        if (!active) {
          // Un-signal interest: remove persisted signal
          await supabase
            .from("demand_signals")
            .delete()
            .match({ product_id: productId, user_id: shopper.userId } as any);

          return NextResponse.json({
            success: true,
            productId,
            active: false,
            demandSignals: Math.max(0, (count ?? product.demandSignals) - 1),
          });
        }

        // Signal interest via RPC or table upsert
        const { data, error } = await (supabase as any).rpc("signal_product_interest", {
          p_product_id: productId,
        });

        if (!error && data) {
          return NextResponse.json({ success: true, active: true, data });
        }

        // Fallback to table insert if RPC unavailable
        await supabase.from("demand_signals").upsert({
          product_id: productId,
          user_id: shopper.userId,
        } as any);

        return NextResponse.json({
          success: true,
          productId,
          active: true,
          demandSignals: (count ?? product.demandSignals) + 1,
        });
      } catch (dbErr) {
        console.warn("[signal] Supabase operation fallback:", dbErr);
      }
    }

    // Default simulated response for offline/mock environments
    const nextDemandSignals = active
      ? (count ?? product.demandSignals) + 1
      : Math.max(0, (count ?? product.demandSignals) - 1);

    return NextResponse.json({
      success: true,
      productId,
      active,
      demandSignals: nextDemandSignals,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to signal interest" }, { status: 500 });
  }
}
