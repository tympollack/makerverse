// app/api/admin/pos/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdminPOSTransactions } from "@/lib/db/admin";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";

export async function GET() {
  const transactions = await getAdminPOSTransactions();
  return NextResponse.json({ transactions });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = getSupabaseServiceRoleClient();

    if (supabase) {
      const { data, error } = await supabase.from("pos_transactions").insert({
        brand_id: "b0000001-0000-0000-0000-000000000001",
        sku: body.sku,
        product_title: body.productTitle,
        price_cents: body.price,
        mode: body.mode || "HIGH_TOUCH",
        buyer_handle: body.buyerHandle,
        chip_uid: body.chipUid,
        status: body.status || "MINT_COMPLETE",
        nfc_tapped: Boolean(body.nfcTapped),
        qr_scanned: Boolean(body.qrScanned),
      } as any).select().single();

      if (!error && data) {
        return NextResponse.json({ success: true, transaction: data });
      }
    }

    return NextResponse.json({ success: true, transaction: body });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to record POS transaction" }, { status: 500 });
  }
}
