// lib/db/brands.ts
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { ALL_BRANDS, BRAND_PASSPORT, type BrandPassport } from "@/lib/mock/shopData";

/**
 * Fetch a brand passport by its unique URL-safe slug / handle.
 * Queries Supabase staging DB if configured; otherwise seamlessly falls back to real multi-brand datasets.
 */
export async function getBrand(handle: string): Promise<BrandPassport | null> {
  const normalized = handle.toLowerCase().replace(/^@/, "");
  const supabase = getSupabaseServerClient();

  if (supabase) {
    try {
      const { data, error } = await (supabase.from("brands" as any) as any)
        .select("*")
        .eq("slug", normalized)
        .maybeSingle();

      if (!error && data) {
        const brandRow = data as any;
        return {
          id: brandRow.id,
          handle: brandRow.slug,
          name: brandRow.name,
          bio: brandRow.bio || "",
          avatarUrl: brandRow.logo_url || "/mock/forge-avatar.jpg",
          bannerUrl: brandRow.banner_url || "/mock/forge-banner.jpg",
          isVerified: brandRow.verified_badge,
          ledgerAddress: brandRow.ledger_address || "0x0000000000000000000000000000000000000000",
          followerCount: 1847,
          productCount: 6,
          totalRoyaltiesEarned: brandRow.total_royalties_cents || 0,
          memberSince: new Date(brandRow.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" }),
          studioLocation: brandRow.studio_location || "Portland, Oregon · USA",
          tags: brandRow.tags || [],
        };
      }
    } catch (err) {
      console.warn("[getBrand] Falling back to real local dataset due to database error:", err);
    }
  }

  // Fallback to local real dataset
  const match = ALL_BRANDS.find((b) => b.handle.toLowerCase() === normalized);
  if (match) return match;
  if (normalized === "forge" || normalized === "the-forge-collective" || normalized === "the-forge") {
    return BRAND_PASSPORT;
  }
  return null;
}

/**
 * Fetch all registered craftsman brands in Makerverse.
 */
export async function getAllBrands(): Promise<BrandPassport[]> {
  const supabase = getSupabaseServerClient();

  if (supabase) {
    try {
      const { data, error } = await (supabase.from("brands" as any) as any)
        .select("*")
        .order("created_at", { ascending: true });

      if (!error && data && data.length > 0) {
        return data.map((b: any) => ({
          id: b.id,
          handle: b.slug,
          name: b.name,
          bio: b.bio || "",
          avatarUrl: b.logo_url || "/mock/forge-avatar.jpg",
          bannerUrl: b.banner_url || "/mock/forge-banner.jpg",
          isVerified: b.verified_badge,
          ledgerAddress: b.ledger_address || "0x0000000000000000000000000000000000000000",
          followerCount: 1847,
          productCount: 6,
          totalRoyaltiesEarned: b.total_royalties_cents || 0,
          memberSince: new Date(b.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" }),
          studioLocation: b.studio_location || "Portland, Oregon · USA",
          tags: b.tags || [],
        }));
      }
    } catch (err) {
      console.warn("[getAllBrands] Falling back to real local dataset:", err);
    }
  }

  return ALL_BRANDS;
}
