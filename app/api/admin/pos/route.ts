// app/api/admin/pos/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdminPOSTransactions } from "@/lib/db/admin";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { verifyAdminAuth } from "@/lib/auth/adminAuth";

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
  }

  const transactions = await getAdminPOSTransactions();
  return NextResponse.json({ transactions });
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdminAuth(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    const body = await request.json();
    if (!body.sku || !body.productTitle) {
      return NextResponse.json(
        { error: "Missing required fields: sku and productTitle" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Database persistence not configured" },
        { status: 503 }
      );
    }

    const { data, error } = await supabase.from("pos_transactions").insert({
      brand_id: body.brandId || "b0000001-0000-0000-0000-000000000001",
      sku: body.sku,
      product_title: body.productTitle,
      price_cents: body.price || 0,
      mode: body.mode || "HIGH_TOUCH",
      buyer_handle: body.buyerHandle || null,
      chip_uid: body.chipUid || "04:00:00:00:00:00:00",
      status: body.status || "MINT_COMPLETE",
      nfc_tapped: Boolean(body.nfcTapped),
      qr_scanned: Boolean(body.qrScanned),
    } as any).select().single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, transaction: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to record POS transaction" }, { status: 500 });
  }
}
