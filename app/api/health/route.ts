// app/api/health/route.ts
import { NextResponse } from "next/server";
import { isSupabaseConfigured, getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { ALL_BRANDS, PRODUCTS } from "@/lib/mock/shopData";

export async function GET() {
  const isConfigured = isSupabaseConfigured();
  let dbStatus = "FALLBACK_DATASET";
  let brandCount = ALL_BRANDS.length;
  let productCount = PRODUCTS.length;

  if (isConfigured) {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const { count: bCount, error: bErr } = await supabase
          .from("brands")
          .select("*", { count: "exact", head: true });

        const { count: pCount, error: pErr } = await supabase
          .from("products")
          .select("*", { count: "exact", head: true });

        if (!bErr && !pErr) {
          dbStatus = "CONNECTED_STAGING_DB";
          brandCount = bCount ?? brandCount;
          productCount = pCount ?? productCount;
        }
      } catch (err) {
        dbStatus = "DEGRADED_USING_LOCAL_DATASET";
      }
    }
  }

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    database: {
      status: dbStatus,
      configured: isConfigured,
      brandsCount: brandCount,
      productsCount: productCount,
      schema: "makerverse",
    },
    version: "0.1.0",
  });
}
