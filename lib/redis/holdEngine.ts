// lib/redis/holdEngine.ts
/**
 * Makerverse Redis Reservation & Cart Hold Engine
 *
 * High-performance, distributed concurrency engine managing stock reservations,
 * TTL countdowns, active payment retry extensions, and inventory lifecycle events.
 */

import crypto from "crypto";
import Redis from "ioredis";
import { type HoldReleaseReason } from "@/lib/types/events";
import {
  CREATE_HOLD_LUA,
  FULFILL_HOLD_LUA,
  REFRESH_HOLD_LUA,
  RELEASE_HOLD_LUA,
} from "./holdScripts";
import {
  REDIS_KEYS,
  type CreateHoldParams,
  type CreateHoldResult,
  type FulfillHoldParams,
  type FulfillHoldResult,
  type HoldRecord,
  type HoldState,
  type RedisClientInterface,
  type RefreshHoldResult,
  type ReleaseHoldResult,
} from "./holdTypes";
import { InMemoryRedisClient } from "./inMemoryRedis";

export {
  REDIS_KEYS,
  InMemoryRedisClient,
  type HoldState,
  type HoldRecord,
  type CreateHoldParams,
  type CreateHoldResult,
  type RefreshHoldResult,
  type ReleaseHoldResult,
  type FulfillHoldParams,
  type FulfillHoldResult,
  type RedisClientInterface,
};

// ─── Default Redis / In-Memory Singleton ──────────────────────────────────────

let defaultClient: RedisClientInterface | null = null;

/**
 * Configures the active Redis client (e.g., standard ioredis client or Upstash adapter).
 */
export function setHoldEngineRedisClient(client: RedisClientInterface) {
  defaultClient = client;
}

export function getHoldEngineRedisClient(): RedisClientInterface {
  if (defaultClient) {
    return defaultClient;
  }

  const redisUrl = process.env.REDIS_URL?.trim();
  if (redisUrl && process.env.NODE_ENV !== "test") {
    defaultClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 2,
      enableReadyCheck: false,
    }) as unknown as RedisClientInterface;
    return defaultClient;
  }

  defaultClient = new InMemoryRedisClient();
  return defaultClient;
}

// ─── Core Hold Engine Methods ──────────────────────────────────────────────────

/**
 * Creates an atomic stock reservation hold for a buyer with a 600s TTL.
 */
export async function createCartHold(
  params: CreateHoldParams,
  client: RedisClientInterface = getHoldEngineRedisClient()
): Promise<CreateHoldResult> {
  const {
    productId,
    userId,
    qty = 1,
    ttlSeconds = 600,
    sku = "",
    holdId = crypto.randomUUID(),
    initialStockIfUnset,
  } = params;

  if (qty <= 0) {
    return { success: false, code: "INVALID_PARAMS", error: "Quantity must be at least 1" };
  }

  const nowMs = Date.now();
  const expiresAtMs = nowMs + ttlSeconds * 1000;
  const eventId = crypto.randomUUID();

  const keys = [
    REDIS_KEYS.hold(holdId),
    REDIS_KEYS.stockLock(productId),
    REDIS_KEYS.productStock(productId),
    REDIS_KEYS.COMMERCE_STREAM,
    REDIS_KEYS.activeHolds(productId),
  ];

  const args = [
    holdId,
    productId,
    userId,
    qty,
    ttlSeconds,
    nowMs,
    expiresAtMs,
    sku,
    initialStockIfUnset !== undefined ? initialStockIfUnset : "",
    eventId,
  ];

  try {
    const rawResult = (await client.eval(
      CREATE_HOLD_LUA,
      keys.length,
      ...keys,
      ...args
    )) as string;

    const result = typeof rawResult === "string" ? JSON.parse(rawResult) : rawResult;

    if (!result.success) {
      return {
        success: false,
        code: result.code,
        error: `Insufficient stock: only ${result.available} unit(s) available (${result.locked} currently held, ${result.total} total)`,
        availableStock: result.available,
        lockedStock: result.locked,
      };
    }

    return {
      success: true,
      hold: result.hold,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      code: "LOCK_FAILED",
      error: `Redis Cart Hold Exception: ${msg}`,
    };
  }
}

/**
 * Refreshes an existing hold for active payment retry windows (e.g., wallet signing, 3D Secure).
 */
export async function refreshCartHold(
  holdId: string,
  extensionSeconds = 300,
  reason = "payment_retry_extension",
  client: RedisClientInterface = getHoldEngineRedisClient()
): Promise<RefreshHoldResult> {
  try {
    const existingRaw = await client.get(REDIS_KEYS.hold(holdId));
    let productId = "";
    if (existingRaw) {
      try {
        const parsed = JSON.parse(existingRaw);
        productId = parsed.productId || "";
      } catch {
        // noop
      }
    }

    const nowMs = Date.now();
    const eventId = crypto.randomUUID();

    const keys = [
      REDIS_KEYS.hold(holdId),
      REDIS_KEYS.COMMERCE_STREAM,
      REDIS_KEYS.activeHolds(productId),
    ];
    const args = [extensionSeconds, nowMs, reason, eventId];

    const rawResult = (await client.eval(
      REFRESH_HOLD_LUA,
      keys.length,
      ...keys,
      ...args
    )) as string;

    const result = typeof rawResult === "string" ? JSON.parse(rawResult) : rawResult;

    if (!result.success) {
      return {
        success: false,
        code: result.code,
        error: `Cart hold ${holdId} not found or already expired`,
      };
    }

    return {
      success: true,
      hold: result.hold,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      code: "REFRESH_FAILED",
      error: `Redis Refresh Hold Exception: ${msg}`,
    };
  }
}

/**
 * Releases a cart reservation hold, returning the locked quantity back to the inventory pool.
 */
export async function releaseCartHold(
  holdId: string,
  reason: HoldReleaseReason = "user_cancelled",
  client: RedisClientInterface = getHoldEngineRedisClient()
): Promise<ReleaseHoldResult> {
  try {
    const existingRaw = await client.get(REDIS_KEYS.hold(holdId));
    let productId = "";
    if (existingRaw) {
      try {
        const parsed = JSON.parse(existingRaw);
        productId = parsed.productId || "";
      } catch {
        // noop
      }
    }

    const nowMs = Date.now();
    const eventId = crypto.randomUUID();

    const keys = [
      REDIS_KEYS.hold(holdId),
      REDIS_KEYS.stockLock(productId),
      REDIS_KEYS.COMMERCE_STREAM,
      REDIS_KEYS.activeHolds(productId),
    ];
    const args = [reason, nowMs, eventId];

    const rawResult = (await client.eval(
      RELEASE_HOLD_LUA,
      keys.length,
      ...keys,
      ...args
    )) as string;

    const result = typeof rawResult === "string" ? JSON.parse(rawResult) : rawResult;

    if (!result.success) {
      return {
        success: false,
        code: result.code,
        error: `Cart hold ${holdId} not found or already released`,
      };
    }

    return {
      success: true,
      releasedHold: result.releasedHold,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      code: "RELEASE_FAILED",
      error: `Redis Release Hold Exception: ${msg}`,
    };
  }
}

/**
 * Fulfills an active hold upon successful checkout payment.
 */
export async function fulfillCartHold(
  params: FulfillHoldParams,
  client: RedisClientInterface = getHoldEngineRedisClient()
): Promise<FulfillHoldResult> {
  try {
    const { holdId, orderId, totalCents, txHash = "", chipUid = "" } = params;

    const existingRaw = await client.get(REDIS_KEYS.hold(holdId));
    if (!existingRaw) {
      return {
        success: false,
        code: "HOLD_NOT_FOUND",
        error: `Cart hold ${holdId} not found or already expired/fulfilled`,
      };
    }

    let productId = "";
    try {
      const parsed = JSON.parse(existingRaw);
      productId = parsed.productId || "";
    } catch {
      // noop
    }

    const nowMs = Date.now();
    const eventId = crypto.randomUUID();

    const keys = [
      REDIS_KEYS.hold(holdId),
      REDIS_KEYS.stockLock(productId),
      REDIS_KEYS.productStock(productId),
      REDIS_KEYS.COMMERCE_STREAM,
      REDIS_KEYS.activeHolds(productId),
    ];

    const args = [orderId, totalCents, txHash, chipUid, nowMs, eventId];

    const rawResult = (await client.eval(
      FULFILL_HOLD_LUA,
      keys.length,
      ...keys,
      ...args
    )) as string;

    const result = typeof rawResult === "string" ? JSON.parse(rawResult) : rawResult;

    if (!result.success) {
      return {
        success: false,
        code: result.code,
        error: `Fulfillment failed: ${result.code}`,
      };
    }

    return {
      success: true,
      hold: result.hold,
      fulfillment: result.fulfillment,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      code: "FULFILL_FAILED",
      error: `Redis Fulfill Hold Exception: ${msg}`,
    };
  }
}

/**
 * Retrieves an active cart hold with current remaining TTL.
 */
export async function getCartHold(
  holdId: string,
  client: RedisClientInterface = getHoldEngineRedisClient()
): Promise<{ hold: HoldRecord | null; remainingTtlMs: number }> {
  const raw = await client.get(REDIS_KEYS.hold(holdId));
  if (!raw) {
    return { hold: null, remainingTtlMs: -2 };
  }

  const pttl = await client.pttl(REDIS_KEYS.hold(holdId));
  try {
    const hold = JSON.parse(raw) as HoldRecord;
    return { hold, remainingTtlMs: pttl };
  } catch {
    return { hold: null, remainingTtlMs: pttl };
  }
}

/**
 * Initializes or updates physical stock pool for a product in Redis.
 */
export async function seedProductStock(
  productId: string,
  totalStock: number,
  client: RedisClientInterface = getHoldEngineRedisClient()
): Promise<void> {
  await client.set(REDIS_KEYS.productStock(productId), String(totalStock));
}

/**
 * Reconciles expired holds for a product, ensuring no units remain locked after expiration.
 */
export async function reconcileProductStockLocks(
  productId: string,
  client: RedisClientInterface = getHoldEngineRedisClient()
): Promise<number> {
  if (client instanceof InMemoryRedisClient) {
    return client.reconcileExpired(productId);
  }
  return 0;
}
