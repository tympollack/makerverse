// app/api/products/signal/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { getProductById } from "@/lib/db/products";
import { resolveShopperIdentity } from "@/lib/auth/shopperAuth";

export async function POST(request: NextRequest) {
  try {
    const shopper = await resolveShopperIdentity(request);
    // Anonymous unauthenticated callers without a session identifier are rejected (Issue 18)
    if (!shopper.isAuthenticated && !shopper.isPrivileged && shopper.userId === "shopper_anon") {
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
      if (!shopper.isAuthenticated && !shopper.isPrivileged) {
        return NextResponse.json(
          { error: "Authentication required to signal product interest" },
          { status: 401 }
        );
      }

      if (!active) {
        // Un-signal interest: remove persisted signal
        const { error: delErr } = await (supabase.from("demand_signals" as any) as any)
          .delete()
          .match({ product_id: productId, user_id: shopper.userId });

        if (delErr) {
          return NextResponse.json({ error: delErr.message }, { status: 400 });
        }

        const { count: sigCount, error: countErr } = await (supabase.from("demand_signals" as any) as any)
          .select("*", { count: "exact", head: true })
          .eq("product_id", productId);

        return NextResponse.json({
          success: true,
          productId,
          active: false,
          demandSignals: countErr ? Math.max(0, (count ?? product.demandSignals) - 1) : (sigCount ?? 0),
        });
      }

      // Signal interest via RPC or table upsert
      const { data, error: rpcErr } = await (supabase as any).rpc("signal_product_interest", {
        p_product_id: productId,
      });

      if (!rpcErr && data) {
        const signalCount =
          data.total_signals ??
          data.total_demand_count ??
          data.total_demand_signals ??
          ((count ?? product.demandSignals) + 1);

        return NextResponse.json({
          success: true,
          productId,
          active: true,
          demandSignals: signalCount,
          data,
        });
      }

      // Fallback to table upsert if RPC unavailable
      const { error: upsertErr } = await (supabase.from("demand_signals" as any) as any).upsert({
        product_id: productId,
        user_id: shopper.userId,
      });

      if (upsertErr) {
        return NextResponse.json({ error: upsertErr.message }, { status: 400 });
      }

      const { count: sigCount, error: countErr } = await (supabase.from("demand_signals" as any) as any)
        .select("*", { count: "exact", head: true })
        .eq("product_id", productId);

      return NextResponse.json({
        success: true,
        productId,
        active: true,
        demandSignals: countErr ? (count ?? product.demandSignals) + 1 : (sigCount ?? 1),
      });
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
