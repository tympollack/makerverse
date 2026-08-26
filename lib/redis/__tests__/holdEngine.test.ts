// lib/redis/__tests__/holdEngine.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import {
  InMemoryRedisClient,
  createCartHold,
  refreshCartHold,
  releaseCartHold,
  fulfillCartHold,
  getCartHold,
  seedProductStock,
  setHoldEngineRedisClient,
  getHoldEngineRedisClient,
  REDIS_KEYS,
  type RedisClientInterface,
} from "@/lib/redis/holdEngine";
import {
  parseStreamEvent,
  serializeStreamEvent,
  REDIS_STREAMS,
  CommerceHoldCreatedPayloadSchema,
  CommercePaymentFailedPayloadSchema,
  CommerceReservationReleasedPayloadSchema,
  CommerceFulfilledPayloadSchema,
} from "@/lib/types/events";

describe("Makerverse Redis Reservation & Cart Hold Engine", () => {
  let redis: InMemoryRedisClient;

  beforeEach(() => {
    redis = new InMemoryRedisClient();
    setHoldEngineRedisClient(redis);
  });

  describe("createCartHold", () => {
    it("creates an atomic cart hold with 600s TTL and increments locked units", async () => {
      const result = await createCartHold(
        {
          productId: "prod_001",
          userId: "@shopper_1",
          sku: "FC-BLT-K1-001",
          qty: 1,
          ttlSeconds: 600,
          initialStockIfUnset: 5,
        },
        redis
      );

      expect(result.success).toBe(true);
      expect(result.hold).toBeDefined();
      expect(result.hold?.productId).toBe("prod_001");
      expect(result.hold?.userId).toBe("@shopper_1");
      expect(result.hold?.qty).toBe(1);
      expect(result.hold?.state).toBe("ACTIVE_HOLD");
      expect(result.hold?.ttlSeconds).toBe(600);
      expect(result.hold?.expiresAt).toBeGreaterThan(Date.now());

      // Verify lock counter in Redis
      const lockVal = await redis.get(REDIS_KEYS.stockLock("prod_001"));
      expect(Number(lockVal)).toBe(1);

      // Verify hold record saved in Redis
      const rawHold = await redis.get(REDIS_KEYS.hold(result.hold!.holdId));
      expect(rawHold).not.toBeNull();
      const savedHold = JSON.parse(rawHold!);
      expect(savedHold.holdId).toBe(result.hold!.holdId);
      expect(savedHold.sku).toBe("FC-BLT-K1-001");

      // Verify stream event in makerverse:events:commerce
      const streamEntries = redis.getStreamEntries(REDIS_STREAMS.COMMERCE);
      expect(streamEntries.length).toBe(1);
      const entry = streamEntries[0];
      expect(entry.fields.event_type).toBe("commerce.hold_created");
      expect(entry.fields.hold_id).toBe(result.hold!.holdId);

      // Validate stream event against strict Zod schema
      const parsedEvent = parseStreamEvent(REDIS_STREAMS.COMMERCE, entry.fields);
      expect(parsedEvent.event_type).toBe("commerce.hold_created");
      expect(CommerceHoldCreatedPayloadSchema.safeParse(parsedEvent).success).toBe(true);
    });

    it("rejects invalid quantity parameters", async () => {
      const result = await createCartHold(
        {
          productId: "prod_001",
          userId: "@shopper_1",
          qty: 0,
        },
        redis
      );

      expect(result.success).toBe(false);
      expect(result.code).toBe("INVALID_PARAMS");
      expect(result.error).toContain("Quantity must be at least 1");
    });

    it("rejects hold when stock is insufficient", async () => {
      await seedProductStock("prod_001", 2, redis);

      // Hold 2 units
      await createCartHold(
        { productId: "prod_001", userId: "@shopper_1", qty: 2 },
        redis
      );

      // Attempt to hold 1 more unit
      const result = await createCartHold(
        { productId: "prod_001", userId: "@shopper_2", qty: 1 },
        redis
      );

      expect(result.success).toBe(false);
      expect(result.code).toBe("INSUFFICIENT_STOCK");
      expect(result.availableStock).toBe(0);
      expect(result.lockedStock).toBe(2);
      expect(result.error).toContain("Insufficient stock: only 0 unit(s) available");
    });

    it("concurrency stress test: handles 10 simultaneous cart holds for 1 stock unit with exactly 1 success", async () => {
      await seedProductStock("prod_limited_drop", 1, redis);

      const attempts = Array.from({ length: 10 }, (_, i) =>
        createCartHold(
          {
            productId: "prod_limited_drop",
            userId: `@shopper_${i}`,
            qty: 1,
            ttlSeconds: 600,
          },
          redis
        )
      );

      const results = await Promise.all(attempts);

      const successes = results.filter((r) => r.success);
      const failures = results.filter((r) => !r.success);

      expect(successes.length).toBe(1);
      expect(failures.length).toBe(9);

      failures.forEach((f) => {
        expect(f.code).toBe("INSUFFICIENT_STOCK");
      });

      // Total lock must remain exactly 1
      const finalLocked = await redis.get(REDIS_KEYS.stockLock("prod_limited_drop"));
      expect(Number(finalLocked)).toBe(1);
    });

    it("handles Redis client exceptions gracefully", async () => {
      const brokenClient: RedisClientInterface = {
        eval: async () => {
          throw new Error("Redis cluster disconnected");
        },
        get: async () => null,
        set: async () => "OK",
        del: async () => 0,
        pttl: async () => -2,
        xadd: async () => "0-0",
      };

      const result = await createCartHold(
        { productId: "prod_001", userId: "@shopper_err", qty: 1 },
        brokenClient
      );

      expect(result.success).toBe(false);
      expect(result.code).toBe("LOCK_FAILED");
      expect(result.error).toContain("Redis Cart Hold Exception: Redis cluster disconnected");
    });
  });

  describe("refreshCartHold", () => {
    it("extends TTL, increments retry count, updates state to PAYMENT_RETRYING, and emits event", async () => {
      const holdRes = await createCartHold(
        {
          productId: "prod_002",
          userId: "@shopper_retry",
          sku: "FC-LTH-WLT-003",
          initialStockIfUnset: 10,
        },
        redis
      );
      const holdId = holdRes.hold!.holdId;

      const refreshRes = await refreshCartHold(
        holdId,
        120,
        "card_declined_insufficient_funds",
        redis
      );

      expect(refreshRes.success).toBe(true);
      expect(refreshRes.hold?.state).toBe("PAYMENT_RETRYING");
      expect(refreshRes.hold?.retryCount).toBe(1);
      expect(refreshRes.hold?.ttlSeconds).toBe(120);

      // Verify stream emitted payment failed retry event
      const streamEntries = redis.getStreamEntries(REDIS_STREAMS.COMMERCE);
      const retryEventEntry = streamEntries.find(
        (e) => e.fields.event_type === "commerce.payment_failed"
      );
      expect(retryEventEntry).toBeDefined();
      expect(retryEventEntry?.fields.hold_id).toBe(holdId);
      expect(retryEventEntry?.fields.reason).toBe("card_declined_insufficient_funds");

      const parsed = parseStreamEvent(REDIS_STREAMS.COMMERCE, retryEventEntry!.fields);
      expect(CommercePaymentFailedPayloadSchema.safeParse(parsed).success).toBe(true);
    });

    it("returns HOLD_NOT_FOUND if hold key does not exist", async () => {
      const result = await refreshCartHold("non_existent_hold", 120, "test", redis);
      expect(result.success).toBe(false);
      expect(result.code).toBe("HOLD_NOT_FOUND");
    });

    it("handles Redis client exceptions gracefully in refreshCartHold", async () => {
      const brokenClient: RedisClientInterface = {
        eval: async () => {
          throw new Error("Evaluation timeout");
        },
        get: async () => null,
        set: async () => "OK",
        del: async () => 0,
        pttl: async () => -2,
        xadd: async () => "0-0",
      };

      const result = await refreshCartHold("hold_1", 120, "retry", brokenClient);
      expect(result.success).toBe(false);
      expect(result.code).toBe("REFRESH_FAILED");
      expect(result.error).toContain("Redis Refresh Hold Exception: Evaluation timeout");
    });
  });

  describe("releaseCartHold", () => {
    it("releases locked stock back to available pool and emits reservation_released", async () => {
      await seedProductStock("prod_003", 5, redis);

      const holdRes = await createCartHold(
        {
          productId: "prod_003",
          userId: "@shopper_cancel",
          qty: 2,
        },
        redis
      );
      const holdId = holdRes.hold!.holdId;

      // Lock is 2
      expect(Number(await redis.get(REDIS_KEYS.stockLock("prod_003")))).toBe(2);

      const releaseRes = await releaseCartHold(holdId, "user_cancelled", redis);
      expect(releaseRes.success).toBe(true);
      expect(releaseRes.releasedHold?.state).toBe("EXPIRED_RELEASE");

      // Lock should now be restored to 0
      expect(Number(await redis.get(REDIS_KEYS.stockLock("prod_003")))).toBe(0);

      // Hold key deleted
      const holdKeyVal = await redis.get(REDIS_KEYS.hold(holdId));
      expect(holdKeyVal).toBeNull();

      // Verify stream event
      const streamEntries = redis.getStreamEntries(REDIS_STREAMS.COMMERCE);
      const releaseEntry = streamEntries.find(
        (e) => e.fields.event_type === "commerce.reservation_released"
      );
      expect(releaseEntry).toBeDefined();
      expect(releaseEntry?.fields.reason).toBe("user_cancelled");
      expect(releaseEntry?.fields.qty).toBe("2");

      const parsed = parseStreamEvent(REDIS_STREAMS.COMMERCE, releaseEntry!.fields);
      expect(CommerceReservationReleasedPayloadSchema.safeParse(parsed).success).toBe(true);

      // Stock is now fully available again for another hold
      const reHoldRes = await createCartHold(
        { productId: "prod_003", userId: "@shopper_next", qty: 5 },
        redis
      );
      expect(reHoldRes.success).toBe(true);
    });

    it("returns HOLD_NOT_FOUND if hold already released or expired", async () => {
      const result = await releaseCartHold("non_existent_hold_id", "expired", redis);
      expect(result.success).toBe(false);
      expect(result.code).toBe("HOLD_NOT_FOUND");
    });

    it("handles Redis client exceptions gracefully in releaseCartHold", async () => {
      const brokenClient: RedisClientInterface = {
        eval: async () => {
          throw new Error("Connection reset");
        },
        get: async () => JSON.stringify({ productId: "prod_001" }),
        set: async () => "OK",
        del: async () => 0,
        pttl: async () => -2,
        xadd: async () => "0-0",
      };

      const result = await releaseCartHold("hold_test", "user_cancelled", brokenClient);
      expect(result.success).toBe(false);
      expect(result.code).toBe("RELEASE_FAILED");
      expect(result.error).toContain("Redis Release Hold Exception: Connection reset");
    });
  });

  describe("fulfillCartHold", () => {
    it("atomically decrements lock, decrements physical stock pool, removes hold, and emits fulfilled event", async () => {
      await seedProductStock("prod_004", 10, redis);

      const holdRes = await createCartHold(
        {
          productId: "prod_004",
          userId: "@shopper_buyer",
          sku: "FC-LTH-KEY-FOB-019",
          qty: 2,
        },
        redis
      );
      const holdId = holdRes.hold!.holdId;

      const fulfillRes = await fulfillCartHold(
        {
          holdId,
          orderId: "ord_999888",
          totalCents: 5600,
          txHash: "0x8f39...abcd",
          chipUid: "04:B7:E1:22:3D:4A:91",
        },
        redis
      );

      expect(fulfillRes.success).toBe(true);
      expect(fulfillRes.hold?.state).toBe("FULFILLED");
      expect(fulfillRes.fulfillment?.orderId).toBe("ord_999888");
      expect(fulfillRes.fulfillment?.totalCents).toBe(5600);

      // Lock should be decremented back to 0
      expect(Number(await redis.get(REDIS_KEYS.stockLock("prod_004")))).toBe(0);

      // Physical product stock permanently decremented: 10 - 2 = 8
      expect(Number(await redis.get(REDIS_KEYS.productStock("prod_004")))).toBe(8);

      // Hold key deleted
      expect(await redis.get(REDIS_KEYS.hold(holdId))).toBeNull();

      // Verify fulfilled stream event
      const streamEntries = redis.getStreamEntries(REDIS_STREAMS.COMMERCE);
      const fulfillEntry = streamEntries.find(
        (e) => e.fields.event_type === "commerce.fulfilled"
      );
      expect(fulfillEntry).toBeDefined();
      expect(fulfillEntry?.fields.order_id).toBe("ord_999888");
      expect(fulfillEntry?.fields.tx_hash).toBe("0x8f39...abcd");

      const parsed = parseStreamEvent(REDIS_STREAMS.COMMERCE, fulfillEntry!.fields);
      expect(CommerceFulfilledPayloadSchema.safeParse(parsed).success).toBe(true);
    });

    it("returns HOLD_NOT_FOUND when attempting to fulfill a missing or expired hold", async () => {
      const result = await fulfillCartHold(
        {
          holdId: "missing_hold",
          orderId: "ord_111",
          totalCents: 1000,
        },
        redis
      );

      expect(result.success).toBe(false);
      expect(result.code).toBe("HOLD_NOT_FOUND");
    });

    it("handles Redis client exceptions gracefully in fulfillCartHold", async () => {
      const brokenClient: RedisClientInterface = {
        eval: async () => {
          throw new Error("Script error");
        },
        get: async () => JSON.stringify({ productId: "prod_004" }),
        set: async () => "OK",
        del: async () => 0,
        pttl: async () => -2,
        xadd: async () => "0-0",
      };

      const result = await fulfillCartHold(
        { holdId: "hold_err", orderId: "ord_1", totalCents: 100 },
        brokenClient
      );
      expect(result.success).toBe(false);
      expect(result.code).toBe("FULFILL_FAILED");
      expect(result.error).toContain("Redis Fulfill Hold Exception: Script error");
    });
  });

  describe("getCartHold, seedProductStock, and Client Configuration", () => {
    it("returns null and -2 for non-existent hold", async () => {
      const res = await getCartHold("invalid_id", redis);
      expect(res.hold).toBeNull();
      expect(res.remainingTtlMs).toBe(-2);
    });

    it("returns active hold and positive remaining TTL for active hold", async () => {
      const holdRes = await createCartHold(
        {
          productId: "prod_005",
          userId: "@shopper_ttl",
          initialStockIfUnset: 1,
          ttlSeconds: 600,
        },
        redis
      );

      const res = await getCartHold(holdRes.hold!.holdId, redis);
      expect(res.hold).not.toBeNull();
      expect(res.hold?.holdId).toBe(holdRes.hold!.holdId);
      expect(res.remainingTtlMs).toBeGreaterThan(0);
    });

    it("handles corrupted JSON stored at hold key in getCartHold", async () => {
      await redis.set(REDIS_KEYS.hold("corrupt_hold"), "NOT_VALID_JSON{{{");
      const res = await getCartHold("corrupt_hold", redis);
      expect(res.hold).toBeNull();
    });

    it("allows configuring and retrieving the default Redis client singleton", () => {
      const customClient = new InMemoryRedisClient();
      setHoldEngineRedisClient(customClient);
      expect(getHoldEngineRedisClient()).toBe(customClient);
    });

    it("InMemoryRedisClient handles pttl, PX, del, and unsupported eval scripts properly", async () => {
      const client = new InMemoryRedisClient();

      // Set with PX
      await client.set("key_px", "val_px", "PX", 5000);
      expect(await client.get("key_px")).toBe("val_px");
      expect(await client.pttl("key_px")).toBeGreaterThan(0);

      // Key with no expiry
      await client.set("key_no_exp", "val");
      expect(await client.pttl("key_no_exp")).toBe(-1);

      // Delete key
      expect(await client.del("key_no_exp")).toBe(1);
      expect(await client.del("key_no_exp")).toBe(0);

      // Custom stream ID
      await client.xadd("custom_stream", "12345-0", "k1", "v1");
      expect(client.getStreamEntries("custom_stream").length).toBe(1);
      expect(client.getStreamEntries("unknown_stream")).toEqual([]);

      // Unsupported script
      await expect(client.eval("UNSUPPORTED_SCRIPT", 0)).rejects.toThrowError(
        /Unsupported Lua script/
      );
    });
  });

  describe("Stream Event Serializer & Parser helpers", () => {
    it("serializes and deserializes catalog events accurately", () => {
      const event = {
        event_id: "evt_cat_01",
        event_type: "catalog.restock" as const,
        product_id: "prod_001",
        sku: "FC-BLT-K1-001",
        quantity_added: 10,
        new_total_stock: 24,
        vendor_id: "vendor_forge",
        timestamp: Date.now(),
      };

      const serialized = serializeStreamEvent(event);
      expect(serialized.event_id).toBe("evt_cat_01");
      expect(serialized.quantity_added).toBe("10");

      const parsed = parseStreamEvent(REDIS_STREAMS.CATALOG, serialized);
      expect(parsed).toEqual(event);
    });

    it("serializes and deserializes social demand signals", () => {
      const event = {
        event_id: "evt_soc_01",
        event_type: "cozy.demand_signaled" as const,
        product_id: "prod_001",
        user_id: "@shopper_backer",
        signal_strength: 3,
        total_demand_count: 88,
        timestamp: Date.now(),
      };

      const serialized = serializeStreamEvent(event);
      const parsed = parseStreamEvent(REDIS_STREAMS.SOCIAL, serialized);
      expect(parsed).toEqual(event);
    });
  });
});
