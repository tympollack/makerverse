// supabase/tests/makerverse_rls.test.ts
import { describe, it, expect, beforeEach } from "vitest";

/**
 * Mock Supabase Database Schema & RLS Policy Contract Engine
 * 
 * Simulates PostgreSQL Row-Level Security (RLS) enforcement and Atomic Stored Procedures (RPCs)
 * for the `makerverse` database schema.
 */

export interface DbBrand {
  id: string;
  handle: string;
  name: string;
  is_verified: boolean;
  is_public: boolean;
  owner_id: string;
}

export interface DbProduct {
  id: string;
  vendor_id: string;
  sku: string;
  title: string;
  price_cents: number;
  stock: number;
  is_active: boolean;
}

export interface DbCartHold {
  id: string;
  product_id: string;
  user_id: string;
  qty: number;
  state: "ACTIVE_HOLD" | "EXPIRED_RELEASE" | "FULFILLED";
  expires_at: number;
}

export interface DbDemandSignal {
  id: string;
  product_id: string;
  user_id: string;
  strength: number;
  created_at: number;
}

export type UserRole = "anon" | "authenticated" | "service_role";

export interface AuthContext {
  role: UserRole;
  userId?: string;
}

export class MockMakerverseDatabase {
  public brands: DbBrand[] = [];
  public products: DbProduct[] = [];
  public cartHolds: DbCartHold[] = [];
  public demandSignals: DbDemandSignal[] = [];

  constructor() {
    this.seed();
  }

  seed() {
    this.brands = [
      {
        id: "brand_001",
        handle: "forge-collective",
        name: "The Forge Collective",
        is_verified: true,
        is_public: true,
        owner_id: "vendor_user_1",
      },
      {
        id: "brand_002",
        handle: "stealth-maker",
        name: "Stealth Studio",
        is_verified: false,
        is_public: false,
        owner_id: "vendor_user_2",
      },
    ];

    this.products = [
      {
        id: "prod_001",
        vendor_id: "vendor_user_1",
        sku: "FC-BLT-K1-001",
        title: "Blackened Copper Keyring — Gen 1",
        price_cents: 14800,
        stock: 7,
        is_active: true,
      },
      {
        id: "prod_002",
        vendor_id: "vendor_user_1",
        sku: "FC-LTH-WLT-003",
        title: "Bridle Leather Bifold — Horween #003",
        price_cents: 21000,
        stock: 3,
        is_active: true,
      },
      {
        id: "prod_draft",
        vendor_id: "vendor_user_1",
        sku: "FC-DRAFT-000",
        title: "Draft Unreleased Item",
        price_cents: 9900,
        stock: 0,
        is_active: false,
      },
    ];

    this.cartHolds = [
      {
        id: "hold_100",
        product_id: "prod_001",
        user_id: "shopper_alice",
        qty: 1,
        state: "ACTIVE_HOLD",
        expires_at: Date.now() + 600_000,
      },
    ];

    this.demandSignals = [
      {
        id: "sig_01",
        product_id: "prod_001",
        user_id: "shopper_bob",
        strength: 2,
        created_at: Date.now() - 50_000,
      },
    ];
  }

  // ─── Table Queries with RLS Enforcement ─────────────────────────────────────

  selectBrands(auth: AuthContext): { data: DbBrand[] | null; error: Error | null } {
    if (auth.role === "service_role") {
      return { data: [...this.brands], error: null };
    }
    // RLS Policy: Public brands viewable by all, private brands only by owner
    const visible = this.brands.filter(
      (b) => b.is_public || (auth.userId && b.owner_id === auth.userId)
    );
    return { data: visible, error: null };
  }

  selectProducts(auth: AuthContext): { data: DbProduct[] | null; error: Error | null } {
    if (auth.role === "service_role") {
      return { data: [...this.products], error: null };
    }
    // RLS Policy: Active products visible to all; inactive only by vendor owner
    const visible = this.products.filter(
      (p) => p.is_active || (auth.userId && p.vendor_id === auth.userId)
    );
    return { data: visible, error: null };
  }

  updateProduct(
    auth: AuthContext,
    productId: string,
    updates: Partial<DbProduct>
  ): { data: DbProduct | null; error: { code: string; message: string } | null } {
    if (auth.role === "anon") {
      return {
        data: null,
        error: { code: "42501", message: "new row violates row-level security policy for table 'products'" },
      };
    }

    const prod = this.products.find((p) => p.id === productId);
    if (!prod) {
      return { data: null, error: { code: "PGRST116", message: "Product not found" } };
    }

    // RLS Policy: Only product owner or service role can update
    if (auth.role !== "service_role" && prod.vendor_id !== auth.userId) {
      return {
        data: null,
        error: { code: "42501", message: "permission denied for table 'products'" },
      };
    }

    Object.assign(prod, updates);
    return { data: { ...prod }, error: null };
  }

  insertCartHold(
    auth: AuthContext,
    hold: DbCartHold
  ): { data: DbCartHold | null; error: { code: string; message: string } | null } {
    // RLS Policy: Direct client inserts on cart_holds table are denied; must use backend Redis engine / service role
    if (auth.role !== "service_role") {
      return {
        data: null,
        error: {
          code: "42501",
          message: "permission denied for table 'cart_holds': client mutations disallowed. Use Redis hold engine.",
        },
      };
    }

    this.cartHolds.push(hold);
    return { data: hold, error: null };
  }

  updateCartHold(
    auth: AuthContext,
    holdId: string,
    updates: Partial<DbCartHold>
  ): { data: DbCartHold | null; error: { code: string; message: string } | null } {
    if (auth.role !== "service_role") {
      return {
        data: null,
        error: {
          code: "42501",
          message: "permission denied for table 'cart_holds': direct client mutations disallowed.",
        },
      };
    }

    const target = this.cartHolds.find((h) => h.id === holdId);
    if (!target) return { data: null, error: { code: "PGRST116", message: "Hold not found" } };

    Object.assign(target, updates);
    return { data: { ...target }, error: null };
  }

  // ─── Atomic Stored Procedures (RPCs) ─────────────────────────────────────────

  /**
   * RPC: makerverse.signal_product_interest
   * Atomically registers a demand signal and returns aggregate count.
   */
  rpcSignalProductInterest(
    auth: AuthContext,
    params: { productId: string; strength?: number }
  ): { data: { success: boolean; product_id: string; total_demand_count: number } | null; error: Error | null } {
    if (auth.role === "anon" || !auth.userId) {
      return { data: null, error: new Error("Authentication required to signal product interest") };
    }

    const product = this.products.find((p) => p.id === params.productId && p.is_active);
    if (!product) {
      return { data: null, error: new Error(`Active product ${params.productId} not found`) };
    }

    const strength = Math.max(1, Math.min(5, params.strength ?? 1));

    // Upsert signal
    const existing = this.demandSignals.find(
      (s) => s.product_id === params.productId && s.user_id === auth.userId
    );

    if (existing) {
      existing.strength = strength;
    } else {
      this.demandSignals.push({
        id: `sig_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        product_id: params.productId,
        user_id: auth.userId,
        strength,
        created_at: Date.now(),
      });
    }

    const totalCount = this.demandSignals.filter((s) => s.product_id === params.productId).length;

    return {
      data: {
        success: true,
        product_id: params.productId,
        total_demand_count: totalCount,
      },
      error: null,
    };
  }

  /**
   * RPC: makerverse.execute_hold_release
   * Restores uncommitted hold stock atomically.
   */
  rpcExecuteHoldRelease(
    auth: AuthContext,
    params: { holdId: string; reason: string }
  ): { data: { success: boolean; hold_id: string; released_qty: number; restored_stock: number } | null; error: Error | null } {
    // Can be called by the hold owner or backend engine
    const hold = this.cartHolds.find((h) => h.id === params.holdId);
    if (!hold) {
      return { data: null, error: new Error(`Hold ${params.holdId} not found`) };
    }

    if (hold.state !== "ACTIVE_HOLD") {
      return { data: null, error: new Error(`Hold ${params.holdId} is already ${hold.state}`) };
    }

    const product = this.products.find((p) => p.id === hold.product_id);
    if (!product) {
      return { data: null, error: new Error(`Product ${hold.product_id} not found`) };
    }

    // Atomically release
    hold.state = "EXPIRED_RELEASE";
    product.stock += hold.qty;

    return {
      data: {
        success: true,
        hold_id: hold.id,
        released_qty: hold.qty,
        restored_stock: product.stock,
      },
      error: null,
    };
  }
}

describe("Supabase Database RLS & Atomic Stored Procedure Contracts", () => {
  let db: MockMakerverseDatabase;

  beforeEach(() => {
    db = new MockMakerverseDatabase();
  });

  describe("Row-Level Security (RLS) Policy Contracts", () => {
    it("allows anonymous unauthenticated users to SELECT public brands and active products", () => {
      const anonAuth: AuthContext = { role: "anon" };

      // 1. SELECT brands
      const brandsRes = db.selectBrands(anonAuth);
      expect(brandsRes.error).toBeNull();
      expect(brandsRes.data?.length).toBe(1);
      expect(brandsRes.data?.[0].handle).toBe("forge-collective");
      // Private brand 'stealth-maker' should be excluded by RLS
      expect(brandsRes.data?.find((b) => b.handle === "stealth-maker")).toBeUndefined();

      // 2. SELECT products
      const productsRes = db.selectProducts(anonAuth);
      expect(productsRes.error).toBeNull();
      expect(productsRes.data?.length).toBe(2);
      // Inactive draft product should be excluded by RLS
      expect(productsRes.data?.find((p) => p.id === "prod_draft")).toBeUndefined();
    });

    it("denies unauthenticated / shopper users from modifying vendor products", () => {
      const anonAuth: AuthContext = { role: "anon" };
      const shopperAuth: AuthContext = { role: "authenticated", userId: "shopper_alice" };

      // Anon update attempt
      const anonUpdate = db.updateProduct(anonAuth, "prod_001", { price_cents: 100 });
      expect(anonUpdate.data).toBeNull();
      expect(anonUpdate.error?.code).toBe("42501");

      // Shopper update attempt on vendor's product
      const shopperUpdate = db.updateProduct(shopperAuth, "prod_001", { price_cents: 100 });
      expect(shopperUpdate.data).toBeNull();
      expect(shopperUpdate.error?.code).toBe("42501");
      expect(shopperUpdate.error?.message).toContain("permission denied for table 'products'");
    });

    it("allows product vendor owner to update their own product catalog details", () => {
      const vendorAuth: AuthContext = { role: "authenticated", userId: "vendor_user_1" };

      const updateRes = db.updateProduct(vendorAuth, "prod_001", {
        price_cents: 15500,
        title: "Blackened Copper Keyring — Updated",
      });

      expect(updateRes.error).toBeNull();
      expect(updateRes.data?.price_cents).toBe(15500);
      expect(updateRes.data?.title).toBe("Blackened Copper Keyring — Updated");
    });

    it("prevents direct client mutations on cart_holds table", () => {
      const shopperAuth: AuthContext = { role: "authenticated", userId: "shopper_alice" };

      const directInsert = db.insertCartHold(shopperAuth, {
        id: "hold_fake",
        product_id: "prod_001",
        user_id: "shopper_alice",
        qty: 1,
        state: "ACTIVE_HOLD",
        expires_at: Date.now() + 600_000,
      });

      expect(directInsert.data).toBeNull();
      expect(directInsert.error?.code).toBe("42501");
      expect(directInsert.error?.message).toContain("permission denied for table 'cart_holds'");

      const directUpdate = db.updateCartHold(shopperAuth, "hold_100", {
        qty: 99,
      });
      expect(directUpdate.data).toBeNull();
      expect(directUpdate.error?.code).toBe("42501");
    });
  });

  describe("Atomic Stored Procedure (RPC) Contracts", () => {
    it("RPC signal_product_interest: atomically inserts demand signal and returns updated counts", () => {
      const shopperAuth: AuthContext = { role: "authenticated", userId: "shopper_charlie" };

      const result = db.rpcSignalProductInterest(shopperAuth, {
        productId: "prod_001",
        strength: 4,
      });

      expect(result.error).toBeNull();
      expect(result.data?.success).toBe(true);
      expect(result.data?.product_id).toBe("prod_001");
      // Initial was 1 (bob), now 2 (bob + charlie)
      expect(result.data?.total_demand_count).toBe(2);

      // Re-signaling updates strength without duplicating count
      const updateSignal = db.rpcSignalProductInterest(shopperAuth, {
        productId: "prod_001",
        strength: 5,
      });
      expect(updateSignal.data?.total_demand_count).toBe(2);
    });

    it("RPC signal_product_interest: rejects unauthenticated calls or non-existent products", () => {
      const anonAuth: AuthContext = { role: "anon" };
      const shopperAuth: AuthContext = { role: "authenticated", userId: "shopper_1" };

      // Anon rejection
      const anonRes = db.rpcSignalProductInterest(anonAuth, { productId: "prod_001" });
      expect(anonRes.data).toBeNull();
      expect(anonRes.error?.message).toContain("Authentication required");

      // Non-existent product
      const notFoundRes = db.rpcSignalProductInterest(shopperAuth, { productId: "prod_9999" });
      expect(notFoundRes.data).toBeNull();
      expect(notFoundRes.error?.message).toContain("not found");
    });

    it("RPC execute_hold_release: atomically restores uncommitted hold stock and transitions state", () => {
      const auth: AuthContext = { role: "service_role" };

      // Product 1 initially has 7 stock, hold_100 has 1 unit held
      const releaseRes = db.rpcExecuteHoldRelease(auth, {
        holdId: "hold_100",
        reason: "user_cancelled",
      });

      expect(releaseRes.error).toBeNull();
      expect(releaseRes.data?.success).toBe(true);
      expect(releaseRes.data?.released_qty).toBe(1);
      expect(releaseRes.data?.restored_stock).toBe(8); // 7 + 1 = 8

      // Second attempt to release the same hold should fail (prevent double release)
      const doubleRelease = db.rpcExecuteHoldRelease(auth, {
        holdId: "hold_100",
        reason: "user_cancelled",
      });
      expect(doubleRelease.data).toBeNull();
      expect(doubleRelease.error?.message).toContain("already EXPIRED_RELEASE");
    });
  });
});
