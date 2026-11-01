// app/api/holds/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createCartHold, getCartHold } from "@/lib/redis/holdEngine";
import { getProductById } from "@/lib/db/products";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { resolveShopperIdentity } from "@/lib/auth/shopperAuth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, userId, qty = 1, ttlSeconds = 600, sku } = body;

    if (!productId) {
      return NextResponse.json({ error: "Missing productId" }, { status: 400 });
    }

    // Validate quantity and ttl parameters
    if (!Number.isInteger(qty) || qty < 1 || qty > 10) {
      return NextResponse.json(
        { error: "Invalid quantity: must be an integer between 1 and 10" },
        { status: 400 }
      );
    }

    if (!Number.isInteger(ttlSeconds) || ttlSeconds < 30 || ttlSeconds > 1800) {
      return NextResponse.json(
        { error: "Invalid ttlSeconds: must be an integer between 30 and 1800" },
        { status: 400 }
      );
    }

    // Resolve secure shopper identity
    const shopper = await resolveShopperIdentity(request, userId);
    const resolvedUserId = shopper.userId;

    // Fetch authoritative product stock to seed pool if needed
    const product = await getProductById(productId);
    if (!product) {
      return NextResponse.json({ error: `Product '${productId}' not found` }, { status: 404 });
    }

    // Execute Redis atomic reservation lock
    const holdResult = await createCartHold({
      productId,
      userId: resolvedUserId,
      qty,
      ttlSeconds,
      sku: sku || product.sku,
      initialStockIfUnset: product.stock,
    });

    if (!holdResult.success) {
      return NextResponse.json(
        holdResult,
        { status: holdResult.code === "INSUFFICIENT_STOCK" ? 409 : 400 }
      );
    }

    // Sync with Supabase staging database if connected
    const supabase = getSupabaseServiceRoleClient();
    if (supabase && holdResult.hold) {
      try {
        const { error: dbErr } = await supabase.from("cart_holds").insert({
          id: holdResult.hold.holdId,
          product_id: productId,
          user_id: resolvedUserId,
          quantity: qty,
          status: "ACTIVE_HOLD",
          expires_at: new Date(holdResult.hold.expiresAt).toISOString(),
          idempotency_key: holdResult.hold.holdId,
        } as any);

        if (dbErr) {
          console.warn("[holds/create] Staging DB hold insert error:", dbErr.message);
        }
      } catch (dbErr) {
        console.warn("[holds/create] Staging DB hold insert fallback:", dbErr);
      }
    }

    return NextResponse.json(holdResult, { status: 201 });
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
  if (!result.hold) {
    return NextResponse.json({ error: "Cart hold not found" }, { status: 404 });
  }

  // Security check: Only hold owner or privileged caller can read hold details
  const shopper = await resolveShopperIdentity(request);
  if (!shopper.isPrivileged && shopper.userId !== result.hold.userId) {
    return NextResponse.json(
      { error: "Forbidden: You do not have permission to view this hold" },
      { status: 403 }
    );
  }

  return NextResponse.json(result);
}
