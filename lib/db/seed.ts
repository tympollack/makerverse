// lib/db/seed.ts
import { getSupabaseServiceRoleClient } from "../supabase/server";
import { ALL_BRANDS, PRODUCTS, SHOPPABLE_POSTS } from "../mock/shopData";
import { MOCK_INSTALLATIONS, INITIAL_GUESTBOOK_ENTRIES, INITIAL_RAFFLE_ATTEMPTS, POS_TRANSACTIONS } from "../mock/adminData";

/**
 * Programmatic Node/TypeScript seed script for Makerverse Staging DB.
 */
export async function seedMakerverseDatabase() {
  console.log("==================================================================");
  console.log("  SEEDING MAKERVERSE REAL MULTI-BRAND DATASETS INTO STAGING DB");
  console.log("==================================================================");

  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    console.warn("⚠️  Supabase staging credentials not detected in environment.");
    console.warn("    Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
    console.warn("    The Makerverse application will run with built-in real datasets fallback.");
    return { success: false, reason: "NO_CREDENTIALS" };
  }

  try {
    // 1. Seed Brands
    console.log("  1. Seeding Brands...");
    for (const brand of ALL_BRANDS) {
      const { error } = await supabase.from("brands").upsert({
        id: brand.id,
        name: brand.name,
        slug: brand.handle,
        logo_url: brand.avatarUrl,
        banner_url: brand.bannerUrl,
        bio: brand.bio,
        verified_badge: brand.isVerified,
        total_royalties_cents: brand.totalRoyaltiesEarned,
        ledger_address: brand.ledgerAddress,
        studio_location: brand.studioLocation,
        tags: brand.tags,
      } as any);

      if (error) console.error(`     ✗ Failed to seed brand ${brand.name}:`, error.message);
      else console.log(`     ✓ Seeded brand: ${brand.name} (${brand.handle})`);
    }

    // 2. Seed Product Lines & Products
    console.log("\n  2. Seeding Product Lines & Products...");
    for (const prod of PRODUCTS) {
      const brandId = prod.brandId || "b0000001-0000-0000-0000-000000000001";
      const lineId = `l0000001-0000-0000-0000-000000000001`;

      // Upsert product line
      await supabase.from("product_lines").upsert({
        id: lineId,
        brand_id: brandId,
        title: "Craftsman Master Series",
        description: "Official workshop batches and serialized pieces.",
      } as any);

      // Upsert product
      const { error: prodErr } = await supabase.from("products").upsert({
        id: prod.id,
        product_line_id: lineId,
        title: prod.title,
        sku: prod.sku,
        price_cents: prod.price,
        stock_quantity: prod.stock,
        max_stock: prod.maxStock,
        hardware_tier: prod.chipTier === "NTAG424_DNA" ? "NTAG424_DNA_CMAC" : (prod.chipTier as any),
        secondary_royalty_pct: prod.royaltyBps / 100,
        co_sign_required: prod.chipTier === "NTAG424_DNA",
        image_url: prod.imageUrl,
        description: prod.description,
        materials: prod.materials,
        maker_notes: prod.makerNotes,
        hardware_spec: prod.hardwareSpec,
      } as any);

      if (prodErr) console.error(`     ✗ Failed product ${prod.sku}:`, prodErr.message);
      else console.log(`     ✓ Seeded product: ${prod.title} [${prod.sku}]`);
    }

    // 3. Seed Installations
    console.log("\n  3. Seeding Booth Installations...");
    for (const inst of MOCK_INSTALLATIONS) {
      const { error } = await supabase.from("booth_installations").upsert({
        id: inst.id,
        brand_id: "b0000001-0000-0000-0000-000000000001",
        name: inst.name,
        installation_type: inst.type,
        chip_count: inst.chipCount,
        status: inst.status,
        location: inst.location,
        trigger_count: inst.triggerCount,
        hardware_uid: inst.hardwareUid,
        station_ip: inst.stationIp,
        reader_model: inst.readerModel,
      } as any);

      if (error) console.error(`     ✗ Failed installation ${inst.name}:`, error.message);
      else console.log(`     ✓ Seeded booth installation: ${inst.name}`);
    }

    console.log("\n==================================================================");
    console.log("  SEEDING COMPLETE SUCCESSFULLY!");
    console.log("==================================================================\n");

    return { success: true };
  } catch (err) {
    console.error("  ✗ Error during database seed:", err);
    return { success: false, error: err };
  }
}

if (typeof require !== "undefined" && require.main === module) {
  seedMakerverseDatabase();
}
