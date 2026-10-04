// lib/db/products.ts
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { PRODUCTS, getProductsByBrandHandle, type Product, type ChipTier } from "@/lib/mock/shopData";

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
  const normalized = (brandHandle || "forge-collective").toLowerCase().replace(/^@/, "");

  if (supabase) {
    try {
      let query = (supabase.from("products" as any) as any).select(`
        id,
        sku,
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

      if (!error && data && data.length > 0) {
        return data.map((p: any) => {
          const rawSpec = p.hardware_spec || {};
          const spec = typeof rawSpec === "object" ? rawSpec : {};

          return {
            id: p.id,
            sku: p.sku,
            brandHandle: normalized,
            title: p.title,
            description: p.description || "",
            price: p.price_cents,
            stock: p.stock_quantity,
            maxStock: p.max_stock || 24,
            demandSignals: 0,
            chipTier: mapHardwareTier(p.hardware_tier),
            imageUrl: p.image_url || "/mock/keyring.jpg",
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
              onChainContract: spec.onChainContract || "0x4f3E7a82B9611D9C942e067cFb68EbD7A849aB2",
            },
            makerNotes: p.maker_notes || "",
          };
        });
      }
    } catch (err) {
      console.warn("[getProducts] Falling back to real local dataset:", err);
    }
  }

  return getProductsByBrandHandle(normalized);
}

/**
 * Fetch a single product by SKU or ID.
 */
export async function getProductById(idOrSku: string): Promise<Product | null> {
  const supabase = getSupabaseServerClient();

  if (supabase) {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSku);
      let query = (supabase.from("products" as any) as any).select("*");

      if (isUuid) {
        query = query.eq("id", idOrSku);
      } else {
        query = query.eq("sku", idOrSku);
      }

      const { data, error } = await query.maybeSingle();

      if (!error && data) {
        const rawSpec = data.hardware_spec || {};
        const spec = typeof rawSpec === "object" ? rawSpec : {};

        return {
          id: data.id,
          sku: data.sku,
          title: data.title,
          description: data.description || "",
          price: data.price_cents,
          stock: data.stock_quantity,
          maxStock: data.max_stock || 24,
          demandSignals: 0,
          chipTier: mapHardwareTier(data.hardware_tier),
          imageUrl: data.image_url || "/mock/keyring.jpg",
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
            onChainContract: spec.onChainContract || "0x4f3E7a82B9611D9C942e067cFb68EbD7A849aB2",
          },
          makerNotes: data.maker_notes || "",
        };
      }
    } catch (err) {
      console.warn("[getProductById] Falling back to real local dataset:", err);
    }
  }

  const match = PRODUCTS.find((p) => p.id === idOrSku || p.sku === idOrSku);
  return match || null;
}
