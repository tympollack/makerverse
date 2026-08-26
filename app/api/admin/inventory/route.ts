// app/api/admin/inventory/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdminInventory } from "@/lib/db/admin";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";

export async function GET() {
  const inventory = await getAdminInventory();
  return NextResponse.json({ items: inventory });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = getSupabaseServiceRoleClient();

    if (supabase) {
      const { data, error } = await supabase.from("products").insert({
        title: body.title,
        sku: body.sku,
        price_cents: body.priceCents || 5000,
        stock_quantity: body.stock || 0,
        max_stock: body.maxStock || 24,
        hardware_tier: body.chipTier === "NTAG424_DNA" ? "NTAG424_DNA_CMAC" : body.chipTier,
        secondary_royalty_pct: (body.royaltyBps || 750) / 100,
        materials: body.materials || [],
        description: body.description || "",
        maker_notes: body.makerNotes || "",
        product_line_id: "l0000001-0000-0000-0000-000000000001",
      } as any).select().single();

      if (!error && data) {
        return NextResponse.json({ success: true, item: data });
      }
    }

    return NextResponse.json({ success: true, item: body });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create SKU" }, { status: 500 });
  }
}
