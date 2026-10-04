// supabase/tests/staging_db_integration.test.ts
import { describe, it, expect } from "vitest";
import { getBrand, getAllBrands } from "@/lib/db/brands";
import { getProducts, getProductById } from "@/lib/db/products";
import { getShoppablePosts } from "@/lib/db/posts";
import {
  getAdminTelemetry,
  getAdminInventory,
  getAdminNfcBatchQueue,
  getAdminActiveHolds,
  getAdminPOSTransactions,
  getAdminInstallations,
  getAdminGuestbook,
  getAdminRaffles,
} from "@/lib/db/admin";
import { isSupabaseConfigured } from "@/lib/supabase/client";

describe("Staging Database & Real Datasets Integration Layer", () => {
  describe("Brand Passport & Multi-Brand Lookups", () => {
    it("fetches The Forge Collective brand passport with on-chain ledger specifications", async () => {
      const brand = await getBrand("forge-collective");
      expect(brand).not.toBeNull();
      expect(brand?.name).toBe("The Forge Collective");
      expect(brand?.handle).toBe("forge-collective");
      expect(brand?.isVerified).toBe(true);
      expect(brand?.ledgerAddress).toBe("0x4f3E7a82B9611D9C942e067cFb68EbD7A849aB2");
      expect(brand?.tags).toContain("NFC-provenance");
      expect(brand?.tags).toContain("EIP-2981");
    });

    it("fetches Timber & Stone Guild brand passport", async () => {
      const brand = await getBrand("timber-stone");
      expect(brand).not.toBeNull();
      expect(brand?.name).toBe("Timber & Stone Guild");
      expect(brand?.studioLocation).toContain("Bend, Oregon");
      expect(brand?.tags).toContain("NTAG215");
    });

    it("fetches Solstice Foundry brand passport", async () => {
      const brand = await getBrand("solstice-foundry");
      expect(brand).not.toBeNull();
      expect(brand?.name).toBe("Solstice Foundry");
      expect(brand?.studioLocation).toContain("Seattle, Washington");
      expect(brand?.tags).toContain("QR-registry");
    });

    it("retrieves all verified brands in the ecosystem", async () => {
      const brands = await getAllBrands();
      expect(brands.length).toBeGreaterThanOrEqual(3);
      const handles = brands.map((b) => b.handle);
      expect(handles).toContain("forge-collective");
      expect(handles).toContain("timber-stone");
      expect(handles).toContain("solstice-foundry");
    });
  });

  describe("Product Catalog & Hardware DNA Specs", () => {
    it("retrieves complete product catalog with NTAG424 DNA silicon specs", async () => {
      const products = await getProducts("forge-collective");
      expect(products.length).toBeGreaterThanOrEqual(6);

      const keyring = products.find((p) => p.sku === "FC-BLT-K1-001");
      expect(keyring).toBeDefined();
      expect(keyring?.chipTier).toBe("NTAG424_DNA");
      expect(keyring?.hardwareSpec.chipModel).toBe("NXP NTAG424 DNA");
      expect(keyring?.hardwareSpec.cryptoProtocol).toContain("SUN-CMAC");
      expect(keyring?.materials).toContain("C110 Copper");
      expect(keyring?.stock).toBe(7);
    });

    it("fetches specific product by SKU or ID", async () => {
      const wallet = await getProductById("FC-LTH-WLT-003");
      expect(wallet).not.toBeNull();
      expect(wallet?.title).toContain("Horween");
      expect(wallet?.chipTier).toBe("NTAG215_SERIALIZED");
      expect(wallet?.price).toBe(11500);
    });
  });

  describe("Shoppable Spatial Posts & Coordinates", () => {
    it("retrieves spatial scenes with pinned product coordinates", async () => {
      const posts = await getShoppablePosts("forge-collective");
      expect(posts.length).toBeGreaterThanOrEqual(3);

      const boothPost = posts.find((p) => p.location.includes("Booth 14"));
      expect(boothPost).toBeDefined();
      expect(boothPost?.pins.length).toBeGreaterThanOrEqual(2);
      expect(boothPost?.pins[0].x).toBeGreaterThan(0);
      expect(boothPost?.pins[0].y).toBeGreaterThan(0);
    });
  });

  describe("Admin, Telemetry, Inventory, POS, & Booth Installation Data", () => {
    it("returns real ecosystem telemetry metrics", async () => {
      const telemetry = await getAdminTelemetry();
      expect(telemetry.activeFollowers).toBeGreaterThan(0);
      expect(telemetry.secondaryRoyaltiesTotal).toBeGreaterThan(0);
      expect(telemetry.edgeNodeStatus).toBe("ONLINE");
    });

    it("returns active inventory SKUs and stock levels", async () => {
      const inventory = await getAdminInventory();
      expect(inventory.length).toBeGreaterThanOrEqual(5);
      const inStock = inventory.filter((i) => i.status === "IN_STOCK");
      expect(inStock.length).toBeGreaterThan(0);
    });

    it("returns NFC batch queue entries with lock states", async () => {
      const batch = await getAdminNfcBatchQueue();
      expect(batch.length).toBeGreaterThanOrEqual(5);
      const dnaChip = batch.find((c) => c.tier === "NTAG424_DNA");
      expect(dnaChip).toBeDefined();
      expect(dnaChip?.lockState).toBe("PASSWORD_PROTECTED");
    });

    it("returns active cart holds with countdown timers", async () => {
      const holds = await getAdminActiveHolds();
      expect(holds.length).toBeGreaterThanOrEqual(1);
      const active = holds.find((h) => h.state === "ACTIVE_HOLD");
      expect(active).toBeDefined();
      expect(active?.expiresAt).toBeGreaterThan(Date.now() - 1000000);
    });

    it("returns POS terminal transaction history", async () => {
      const txs = await getAdminPOSTransactions();
      expect(txs.length).toBeGreaterThanOrEqual(4);
      expect(txs[0].status).toBe("MINT_COMPLETE");
    });

    it("returns interactive booth installations, guestbook entries, and raffle logs", async () => {
      const installations = await getAdminInstallations();
      expect(installations.length).toBeGreaterThanOrEqual(3);
      expect(installations[0].status).toBe("ONLINE");

      const guestbook = await getAdminGuestbook();
      expect(guestbook.length).toBeGreaterThanOrEqual(5);
      expect(guestbook[0].comment).toContain("copper keyring");

      const raffles = await getAdminRaffles();
      expect(raffles.length).toBeGreaterThanOrEqual(5);
      const win = raffles.find((r) => r.outcome === "WIN");
      expect(win).toBeDefined();
      expect(win?.rewardCode).toBeDefined();
    });
  });

  describe("Supabase Configuration Detection", () => {
    it("reports environment configuration status properly", () => {
      const configured = isSupabaseConfigured();
      expect(typeof configured).toBe("boolean");
    });
  });
});
