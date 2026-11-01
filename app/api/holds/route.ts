// app/api/holds/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createCartHold, getCartHold, releaseCartHold } from "@/lib/redis/holdEngine";
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
    // Unauthenticated callers cannot claim a UUID identity (SEC_0002)
    const isTargetUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(shopper.userId);
    const resolvedUserId = (!shopper.isAuthenticated && isTargetUuid) ? "shopper_anon" : shopper.userId;

    // Fetch authoritative product stock to seed pool if needed (BUG_0002)
    const product = await getProductById(productId);
    if (!product) {
      return NextResponse.json({ error: `Product '${productId}' not found` }, { status: 404 });
    }

    if (product.stock < qty) {
      return NextResponse.json(
        { success: false, code: "INSUFFICIENT_STOCK", error: `Insufficient stock for product ${productId}` },
        { status: 409 }
      );
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

    // Sync with Supabase staging database if connected (BUG_0001, BUG_0003)
    const supabase = getSupabaseServiceRoleClient();
    if (supabase && holdResult.hold) {
      try {
        const { error: insertErr } = await supabase.from("cart_holds").insert({
          id: holdResult.hold.holdId,
          product_id: productId,
          user_id: resolvedUserId,
          quantity: qty,
          status: "ACTIVE_HOLD",
          expires_at: new Date(holdResult.hold.expiresAt).toISOString(),
          idempotency_key: holdResult.hold.holdId,
        } as any);

        let updateErr = null;
        if (!insertErr) {
          // Atomically decrement database stock so execute_hold_release restores the exact balance
          const res = await (supabase.from("products" as any) as any)
            .update({
              stock_quantity: Math.max(0, product.stock - qty),
              updated_at: new Date().toISOString(),
            })
            .eq("id", productId);
          updateErr = res.error;
        }

        if (insertErr || updateErr) {
          // Compensate: release Redis hold on DB write failure to maintain stock consistency
          await releaseCartHold(holdResult.hold.holdId, "admin_override");
          const errMsg = insertErr?.message || updateErr?.message || "Failed to persist hold";
          return NextResponse.json(
            { error: `Database persistence failed: ${errMsg}` },
            { status: 500 }
          );
        }
      } catch (dbErr: any) {
        await releaseCartHold(holdResult.hold.holdId, "admin_override");
        return NextResponse.json(
          { error: `Database persistence error: ${dbErr?.message || dbErr}` },
          { status: 500 }
        );
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

  // Security check: Only hold owner or privileged caller can read hold details (SEC_0002)
  const shopper = await resolveShopperIdentity(request);
  const isHoldOwnerUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(result.hold.userId);

  if (isHoldOwnerUuid && !shopper.isAuthenticated && !shopper.isPrivileged) {
    return NextResponse.json(
      { error: "Forbidden: Authentication required to inspect verified user holds" },
      { status: 403 }
    );
  }

  if (!shopper.isPrivileged && shopper.userId !== result.hold.userId) {
    return NextResponse.json(
      { error: "Forbidden: You do not have permission to view this hold" },
      { status: 403 }
    );
  }

  return NextResponse.json(result);
}
