// app/api/admin/inventory/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdminInventory } from "@/lib/db/admin";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { verifyAdminAuth } from "@/lib/auth/adminAuth";

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
  }

  const inventory = await getAdminInventory();
  return NextResponse.json({ items: inventory });
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdminAuth(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    const body = await request.json();
    if (!body.title || !body.sku) {
      return NextResponse.json({ error: "Missing required fields: title and sku" }, { status: 400 });
    }

    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Database persistence not configured" },
        { status: 503 }
      );
    }

    const { data, error } = await supabase.from("products").insert({
      title: body.title,
      sku: body.sku,
      price_cents: body.priceCents || 5000,
      stock_quantity: body.stock || 0,
      max_stock: body.maxStock || 24,
      hardware_tier: body.chipTier === "NTAG424_DNA" ? "NTAG424_DNA_CMAC" : (body.chipTier || "QR_REGISTRY"),
      secondary_royalty_pct: (body.royaltyBps || 750) / 100,
      materials: body.materials || [],
      description: body.description || "",
      maker_notes: body.makerNotes || "",
      product_line_id: body.productLineId || "l0000001-0000-0000-0000-000000000001",
    } as any).select().single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, item: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create SKU" }, { status: 500 });
  }
}
