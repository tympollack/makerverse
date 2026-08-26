// app/api/holds/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createCartHold, getCartHold } from "@/lib/redis/holdEngine";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, userId = "shopper_anon", qty = 1, ttlSeconds = 600, sku } = body;

    if (!productId) {
      return NextResponse.json({ error: "Missing productId" }, { status: 400 });
    }

    // Execute Redis atomic reservation lock
    const holdResult = await createCartHold({
      productId,
      userId,
      qty,
      ttlSeconds,
      sku,
    });

    // Optionally sync with Supabase staging database if connected
    const supabase = getSupabaseServiceRoleClient();
    if (supabase && holdResult.success && holdResult.hold) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId);
      if (isUuid) {
        try {
          await supabase.from("cart_holds").insert({
            product_id: productId,
            quantity: qty,
            status: "ACTIVE_HOLD",
            expires_at: new Date(holdResult.hold.expiresAt).toISOString(),
            idempotency_key: holdResult.hold.holdId,
          } as any);
        } catch (dbErr) {
          console.warn("[holds/create] Staging DB hold insert fallback:", dbErr);
        }
      }
    }

    return NextResponse.json(holdResult);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create hold" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const holdId = request.nextUrl.searchParams.get("holdId");
  if (!holdId) {
    return NextResponse.json({ error: "Missing holdId parameter" }, { status: 400 });
  }

  const result = await getCartHold(holdId);
  return NextResponse.json(result);
}
