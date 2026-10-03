// app/api/products/signal/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, count } = body;

    if (!productId) {
      return NextResponse.json({ error: "Missing productId" }, { status: 400 });
    }

    const supabase = getSupabaseServiceRoleClient();
    if (supabase) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId);
      if (isUuid) {
        try {
          const { data, error } = await (supabase as any).rpc("signal_product_interest", {
            p_product_id: productId,
          });

          if (!error && data) {
            return NextResponse.json({ success: true, data });
          }
        } catch (rpcErr) {
          console.warn("[signal] RPC fallback:", rpcErr);
        }
      }
    }

    // Default simulated response
    return NextResponse.json({
      success: true,
      productId,
      demandSignals: (count ?? 0) + 1,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to signal interest" }, { status: 500 });
  }
}
