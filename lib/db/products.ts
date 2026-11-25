// lib/db/products.ts
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  PRODUCTS,
  IS_MOCK_ENABLED,
  getProductsByBrandHandle,
  type Product,
  type ChipTier,
} from "@/lib/mock/shopData";

function mapHardwareTier(tier: string): ChipTier {
  if (tier === "NTAG424_DNA_CMAC" || tier === "NTAG424_DNA") return "NTAG424_DNA";
  if (tier === "NTAG215_SERIALIZED") return "NTAG215_SERIALIZED";
  if (tier === "NTAG213_SERIALIZED") return "NTAG213_SERIALIZED";
  return "QR_REGISTRY";
}

/**
 * Fetch all products for a specific brand handle.
 */
export async function getProducts(brandHandle?: string): Promise<Product[]> {
  const supabase = getSupabaseServerClient();
  const normalized = (brandHandle || "")
    .toLowerCase()
    .replace(/^@/, "");

  if (supabase) {
    try {
      let query = (supabase.from("products" as any) as any).select(`
        id,
        sku,
        product_line_id,
        title,
        description,
        price_cents,
        stock_quantity,
        max_stock,
        hardware_tier,
        secondary_royalty_pct,
        co_sign_required,
        image_url,
        materials,
        maker_notes,
        hardware_spec,
        created_at,
        product_lines!inner (
          id,
          brand_id,
          brands!inner (
            id,
            slug
          )
        )
      `);

      if (normalized) {
        query = query.eq("product_lines.brands.slug", normalized);
      }

      const { data, error } = await query;

      if (!error && data) {
        return data.map((p: any) => {
          const rawSpec = p.hardware_spec || {};
          const spec = typeof rawSpec === "object" ? rawSpec : {};
          const joinedBrands = p.product_lines?.brands;
          const brandSlug = Array.isArray(joinedBrands)
            ? joinedBrands[0]?.slug
            : joinedBrands?.slug;

          return {
            id: p.id,
            sku: p.sku,
            brandHandle: brandSlug || normalized,
            productLineId: p.product_line_id || p.product_lines?.id || undefined,
            title: p.title,
            description: p.description || "",
            price: p.price_cents,
            stock: p.stock_quantity,
            maxStock: p.max_stock || 24,
            demandSignals: 0,
            chipTier: mapHardwareTier(p.hardware_tier),
            imageUrl: p.image_url || "",
            tags: ["craft", "staging"],
            materials: p.materials || [],
            isFollowed: false,
            royaltyBps: Math.round((p.secondary_royalty_pct || 7.5) * 100),
            hardwareSpec: {
              chipModel: spec.chipModel || "NXP NTAG424 DNA",
              cryptoProtocol: spec.cryptoProtocol || "AES-128 SUN-CMAC Mirror",
              uid: spec.chipUid || "04:8F:3A:2B:1C:99:01",
              frequency: spec.frequency || "13.56 MHz (ISO 14443-A)",
              memoryCapacity: spec.memoryCapacity || "416 Bytes",
              tamperDetection: Boolean(spec.tamperDetection ?? true),
              onChainContract: spec.onChainContract || "",
            },
            makerNotes: p.maker_notes || "",
          };
        });
      }

      if (error) {
        console.warn("[getProducts] Database query error, falling back to real local dataset:", error.message);
      }
    } catch (err) {
      console.warn("[getProducts] Database query error:", err);
    }
  }

  return IS_MOCK_ENABLED ? getProductsByBrandHandle(normalized) : [];
}

/**
 * Fetch a single product by SKU or ID.
 */
export async function getProductById(idOrSku: string): Promise<Product | null> {
  const supabase = getSupabaseServerClient();

  if (supabase) {
    try {
      // 1. Query by product ID first when input is UUID-compatible or in mock/test lookups
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSku);
      let data: any = null;
      let error: any = null;

      if (isUuid || idOrSku.startsWith("prod_")) {
        const idRes = await (supabase.from("products" as any) as any)
          .select("*")
          .eq("id", idOrSku)
          .maybeSingle();
        data = idRes.data;
        error = idRes.error;
      }

      // 2. Fallback to SKU query if no product matches by ID (or ID was a SKU string)
      if (!data) {
        const skuRes = await (supabase.from("products" as any) as any)
          .select("*")
          .eq("sku", idOrSku)
          .maybeSingle();
        if (!skuRes.error || skuRes.data) {
          data = skuRes.data;
          error = skuRes.error;
        }
      }

      if (!error) {
        if (data) {
          const rawSpec = data.hardware_spec || {};
          const spec = typeof rawSpec === "object" ? rawSpec : {};

          return {
            id: data.id,
            sku: data.sku,
            productLineId: data.product_line_id || undefined,
            title: data.title,
            description: data.description || "",
            price: data.price_cents,
            stock: data.stock_quantity,
            maxStock: data.max_stock || 24,
            demandSignals: 0,
            chipTier: mapHardwareTier(data.hardware_tier),
            imageUrl: data.image_url || "",
            tags: ["craft", "staging"],
            materials: data.materials || [],
            isFollowed: false,
            royaltyBps: Math.round((data.secondary_royalty_pct || 7.5) * 100),
            hardwareSpec: {
              chipModel: spec.chipModel || "NXP NTAG424 DNA",
              cryptoProtocol: spec.cryptoProtocol || "AES-128 SUN-CMAC Mirror",
              uid: spec.chipUid || "04:8F:3A:2B:1C:99:01",
              frequency: spec.frequency || "13.56 MHz (ISO 14443-A)",
              memoryCapacity: spec.memoryCapacity || "416 Bytes",
              tamperDetection: Boolean(spec.tamperDetection ?? true),
              onChainContract: spec.onChainContract || "",
            },
            makerNotes: data.maker_notes || "",
          };
        }
        // Authoritative database returned empty result for this ID/SKU
        return null;
      }
    } catch (err) {
      console.warn("[getProductById] Database lookup error:", err);
    }
  }

  if (!IS_MOCK_ENABLED) return null;
  const match = PRODUCTS.find((p) => p.id === idOrSku || p.sku === idOrSku);
  return match || null;
}
