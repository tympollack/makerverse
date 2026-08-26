// lib/redis/holdEngine.ts
/**
 * Makerverse Redis Reservation & Cart Hold Engine
 * 
 * High-performance, distributed concurrency engine managing stock reservations,
 * TTL countdowns, active payment retry extensions, and inventory lifecycle events.
 * 
 * Redis Key Standards:
 *  - Hold Record       : `makerverse:hold:{holdId}` (Default TTL: 600s / 10m)
 *  - Product Stock Lock: `makerverse:stock_lock:{productId}` (Active reserved units)
 *  - Product Stock Pool: `makerverse:product_stock:{productId}` (Total physical units available)
 *  - Commerce Stream   : `makerverse:events:commerce` (Redis Stream event bus)
 * 
 * Concurrency Guarantees:
 *  - Atomic Lua scripts prevent overselling under high concurrent load.
 *  - Automatic TTL expiration and manual release restore units to the available pool.
 */

import crypto from "crypto";
import {
  REDIS_STREAMS,
  type HoldReleaseReason,
} from "@/lib/types/events";

// ─── Key Format Generators ────────────────────────────────────────────────────

export const REDIS_KEYS = {
  /** Hold record hash key */
  hold: (holdId: string) => `makerverse:hold:${holdId}`,
  /** Active stock lock counter (sum of all currently held units) */
  stockLock: (productId: string) => `makerverse:stock_lock:${productId}`,
  /** Total physical stock pool */
  productStock: (productId: string) => `makerverse:product_stock:${productId}`,
  /** User active holds set */
  userHolds: (userId: string) => `makerverse:user_holds:${userId}`,
  /** Stream topic */
  COMMERCE_STREAM: REDIS_STREAMS.COMMERCE,
} as const;

// ─── Types & States ───────────────────────────────────────────────────────────

export type HoldState = "ACTIVE_HOLD" | "PAYMENT_RETRYING" | "EXPIRED_RELEASE" | "FULFILLED";

export interface HoldRecord {
  holdId: string;
  productId: string;
  sku?: string;
  userId: string;
  qty: number;
  createdAt: number; // Unix timestamp ms
  expiresAt: number; // Unix timestamp ms
  ttlSeconds: number; // Initial TTL in seconds
  state: HoldState;
  retryCount: number;
  metadata?: Record<string, unknown>;
}

export interface CreateHoldParams {
  productId: string;
  userId: string;
  qty?: number;
  ttlSeconds?: number;
  sku?: string;
  holdId?: string;
  metadata?: Record<string, unknown>;
  /** Optional initial stock override if not already seeded in Redis */
  initialStockIfUnset?: number;
}

export interface CreateHoldResult {
  success: boolean;
  hold?: HoldRecord;
  error?: string;
  code?: "INSUFFICIENT_STOCK" | "LOCK_FAILED" | "INVALID_PARAMS";
  availableStock?: number;
  lockedStock?: number;
}

export interface RefreshHoldResult {
  success: boolean;
  hold?: HoldRecord;
  error?: string;
  code?: "HOLD_NOT_FOUND" | "HOLD_EXPIRED" | "REFRESH_FAILED";
}

export interface ReleaseHoldResult {
  success: boolean;
  releasedHold?: HoldRecord;
  error?: string;
  code?: "HOLD_NOT_FOUND" | "RELEASE_FAILED";
}

export interface FulfillHoldParams {
  holdId: string;
  orderId: string;
  totalCents: number;
  sku?: string;
  txHash?: string;
  chipUid?: string;
}

export interface FulfillHoldResult {
  success: boolean;
  hold?: HoldRecord;
  fulfillment?: {
    orderId: string;
    totalCents: number;
    fulfilledAt: number;
  };
  error?: string;
  code?: "HOLD_NOT_FOUND" | "HOLD_EXPIRED" | "FULFILL_FAILED";
}

// ─── Minimal Redis Client Interface ───────────────────────────────────────────

/**
 * Compatible with `ioredis`, `@upstash/redis`, `node-redis`, or custom connection adapters.
 */
export interface RedisClientInterface {
  eval(script: string, numkeys: number, ...args: (string | number)[]): Promise<unknown>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ...args: (string | number)[]): Promise<unknown>;
  del(key: string): Promise<number>;
  pttl(key: string): Promise<number>;
  xadd(stream: string, id: string, ...args: string[]): Promise<string>;
}

// ─── Concurrency-Safe Lua Scripts ─────────────────────────────────────────────

/**
 * Atomic Cart Hold Creation Lua Script
 * 
 * Keys:
 *  1: `makerverse:hold:{holdId}`
 *  2: `makerverse:stock_lock:{productId}`
 *  3: `makerverse:product_stock:{productId}`
 *  4: `makerverse:events:commerce`
 * 
 * Args:
 *  1: holdId
 *  2: productId
 *  3: userId
 *  4: qty
 *  5: ttlSeconds
 *  6: nowMs
 *  7: expiresAtMs
 *  8: sku
 *  9: initialStockFallback
 * 10: eventId
 */
const CREATE_HOLD_LUA = `
local holdKey = KEYS[1]
local lockKey = KEYS[2]
local stockKey = KEYS[3]
local streamKey = KEYS[4]

local holdId = ARGV[1]
local productId = ARGV[2]
local userId = ARGV[3]
local qty = tonumber(ARGV[4])
local ttlSeconds = tonumber(ARGV[5])
local nowMs = tonumber(ARGV[6])
local expiresAtMs = tonumber(ARGV[7])
local sku = ARGV[8]
local initialStockFallback = tonumber(ARGV[9])
local eventId = ARGV[10]

-- 1. Check if total stock is configured, seed if fallback provided
local currentStock = redis.call('GET', stockKey)
if not currentStock then
  if initialStockFallback and initialStockFallback >= 0 then
    redis.call('SET', stockKey, tostring(initialStockFallback))
    currentStock = tostring(initialStockFallback)
  else
    currentStock = "0"
  end
end
local totalStock = tonumber(currentStock)

-- 2. Check current locked units
local currentLocked = tonumber(redis.call('GET', lockKey) or "0")

-- 3. Verify stock availability
if (currentLocked + qty) > totalStock then
  return cjson.encode({
    success = false,
    code = "INSUFFICIENT_STOCK",
    available = math.max(0, totalStock - currentLocked),
    locked = currentLocked,
    total = totalStock
  })
end

-- 4. Atomically increment lock pool
redis.call('INCRBY', lockKey, qty)

-- 5. Store hold record with TTL
local holdData = {
  holdId = holdId,
  productId = productId,
  userId = userId,
  qty = qty,
  sku = sku,
  createdAt = nowMs,
  expiresAt = expiresAtMs,
  ttlSeconds = ttlSeconds,
  state = "ACTIVE_HOLD",
  retryCount = 0
}
redis.call('SET', holdKey, cjson.encode(holdData), 'EX', ttlSeconds)

-- 6. Emit commerce.hold_created to Redis Stream
redis.call('XADD', streamKey, '*',
  'event_id', eventId,
  'event_type', 'commerce.hold_created',
  'hold_id', holdId,
  'product_id', productId,
  'sku', sku,
  'user_id', userId,
  'qty', tostring(qty),
  'expires_at', tostring(expiresAtMs),
  'created_at', tostring(nowMs)
)

return cjson.encode({
  success = true,
  hold = holdData
})
`;

/**
 * Atomic Cart Hold Refresh Lua Script
 * 
 * Keys:
 *  1: `makerverse:hold:{holdId}`
 *  2: `makerverse:events:commerce`
 * 
 * Args:
 *  1: extensionSeconds
 *  2: nowMs
 *  3: reason
 *  4: eventId
 */
const REFRESH_HOLD_LUA = `
local holdKey = KEYS[1]
local streamKey = KEYS[2]

local extensionSeconds = tonumber(ARGV[1])
local nowMs = tonumber(ARGV[2])
local reason = ARGV[3]
local eventId = ARGV[4]

local rawHold = redis.call('GET', holdKey)
if not rawHold then
  return cjson.encode({ success = false, code = "HOLD_NOT_FOUND" })
end

local hold = cjson.decode(rawHold)
hold.state = "PAYMENT_RETRYING"
hold.retryCount = (hold.retryCount or 0) + 1
hold.expiresAt = nowMs + (extensionSeconds * 1000)
hold.ttlSeconds = extensionSeconds

redis.call('SET', holdKey, cjson.encode(hold), 'EX', extensionSeconds)

-- Emit commerce.payment_failed (triggering retry flow)
redis.call('XADD', streamKey, '*',
  'event_id', eventId,
  'event_type', 'commerce.payment_failed',
  'hold_id', hold.holdId,
  'product_id', hold.productId,
  'user_id', hold.userId,
  'reason', reason or "payment_retry_extension",
  'retry_count', tostring(hold.retryCount),
  'timestamp', tostring(nowMs)
)

return cjson.encode({ success = true, hold = hold })
`;

/**
 * Atomic Cart Hold Release Lua Script
 * 
 * Keys:
 *  1: `makerverse:hold:{holdId}`
 *  2: `makerverse:stock_lock:{productId}`
 *  3: `makerverse:events:commerce`
 * 
 * Args:
 *  1: reason ('expired' | 'user_cancelled' | 'payment_failed' | 'admin_override')
 *  2: nowMs
 *  3: eventId
 */
const RELEASE_HOLD_LUA = `
local holdKey = KEYS[1]
local lockKey = KEYS[2]
local streamKey = KEYS[3]

local reason = ARGV[1]
local nowMs = tonumber(ARGV[2])
local eventId = ARGV[3]

local rawHold = redis.call('GET', holdKey)
if not rawHold then
  return cjson.encode({ success = false, code = "HOLD_NOT_FOUND" })
end

local hold = cjson.decode(rawHold)
local qty = tonumber(hold.qty) or 1

-- Decrement lock pool (ensure does not drop below 0)
local currentLocked = tonumber(redis.call('GET', lockKey) or "0")
local newLocked = math.max(0, currentLocked - qty)
redis.call('SET', lockKey, tostring(newLocked))

-- Delete hold key
redis.call('DEL', holdKey)

-- Emit commerce.reservation_released
redis.call('XADD', streamKey, '*',
  'event_id', eventId,
  'event_type', 'commerce.reservation_released',
  'hold_id', hold.holdId,
  'product_id', hold.productId,
  'user_id', hold.userId,
  'qty', tostring(qty),
  'reason', reason or "user_cancelled",
  'released_at', tostring(nowMs)
)

hold.state = "EXPIRED_RELEASE"
return cjson.encode({ success = true, releasedHold = hold })
`;

/**
 * Atomic Cart Hold Fulfillment Lua Script
 * 
 * Keys:
 *  1: `makerverse:hold:{holdId}`
 *  2: `makerverse:stock_lock:{productId}`
 *  3: `makerverse:product_stock:{productId}`
 *  4: `makerverse:events:commerce`
 * 
 * Args:
 *  1: orderId
 *  2: totalCents
 *  3: txHash
 *  4: chipUid
 *  5: nowMs
 *  6: eventId
 */
const FULFILL_HOLD_LUA = `
local holdKey = KEYS[1]
local lockKey = KEYS[2]
local stockKey = KEYS[3]
local streamKey = KEYS[4]

local orderId = ARGV[1]
local totalCents = tonumber(ARGV[2])
local txHash = ARGV[3]
local chipUid = ARGV[4]
local nowMs = tonumber(ARGV[5])
local eventId = ARGV[6]

local rawHold = redis.call('GET', holdKey)
if not rawHold then
  return cjson.encode({ success = false, code = "HOLD_NOT_FOUND" })
end

local hold = cjson.decode(rawHold)
local qty = tonumber(hold.qty) or 1

-- 1. Decrement lock pool
local currentLocked = tonumber(redis.call('GET', lockKey) or "0")
local newLocked = math.max(0, currentLocked - qty)
redis.call('SET', lockKey, tostring(newLocked))

-- 2. Permanently decrement physical product stock
local currentStock = tonumber(redis.call('GET', stockKey) or "0")
local newStock = math.max(0, currentStock - qty)
redis.call('SET', stockKey, tostring(newStock))

-- 3. Delete hold key
redis.call('DEL', holdKey)

-- 4. Emit commerce.fulfilled
redis.call('XADD', streamKey, '*',
  'event_id', eventId,
  'event_type', 'commerce.fulfilled',
  'hold_id', hold.holdId,
  'order_id', orderId,
  'product_id', hold.productId,
  'sku', hold.sku or "",
  'user_id', hold.userId,
  'qty', tostring(qty),
  'total_cents', tostring(totalCents),
  'tx_hash', txHash or "",
  'chip_uid', chipUid or "",
  'timestamp', tostring(nowMs)
)

hold.state = "FULFILLED"
return cjson.encode({
  success = true,
  hold = hold,
  fulfillment = {
    orderId = orderId,
    totalCents = totalCents,
    fulfilledAt = nowMs
  }
})
`;

// ─── In-Memory Redis Mock Adapter (For Test / Standalone Environments) ─────────

export class InMemoryRedisClient implements RedisClientInterface {
  private store = new Map<string, { val: string; expiresAt?: number }>();
  private streams = new Map<string, Array<{ id: string; fields: Record<string, string> }>>();

  private isExpired(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return true;
    if (entry.expiresAt && entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return true;
    }
    return false;
  }

  async get(key: string): Promise<string | null> {
    if (this.isExpired(key)) return null;
    return this.store.get(key)?.val ?? null;
  }

  async set(key: string, value: string, ...args: (string | number)[]): Promise<unknown> {
    let expiresAt: number | undefined = undefined;
    if (args[0] === "EX" && typeof args[1] === "number") {
      expiresAt = Date.now() + args[1] * 1000;
    } else if (args[0] === "PX" && typeof args[1] === "number") {
      expiresAt = Date.now() + args[1];
    }
    this.store.set(key, { val: value, expiresAt });
    return "OK";
  }

  async del(key: string): Promise<number> {
    const existed = this.store.delete(key);
    return existed ? 1 : 0;
  }

  async pttl(key: string): Promise<number> {
    if (this.isExpired(key)) return -2;
    const entry = this.store.get(key);
    if (!entry || !entry.expiresAt) return -1;
    return Math.max(0, entry.expiresAt - Date.now());
  }

  async xadd(stream: string, id: string, ...args: string[]): Promise<string> {
    const streamId = id === "*" ? `${Date.now()}-0` : id;
    const fields: Record<string, string> = {};
    for (let i = 0; i < args.length; i += 2) {
      fields[args[i]] = args[i + 1];
    }
    if (!this.streams.has(stream)) {
      this.streams.set(stream, []);
    }
    this.streams.get(stream)!.push({ id: streamId, fields });
    return streamId;
  }

  getStreamEntries(stream: string) {
    return this.streams.get(stream) ?? [];
  }

  async eval(script: string, numkeys: number, ...args: (string | number)[]): Promise<unknown> {
    const keys = args.slice(0, numkeys).map(String);
    const argv = args.slice(numkeys);

    // Emulate CREATE_HOLD_LUA
    if (script === CREATE_HOLD_LUA) {
      const [holdKey, lockKey, stockKey, streamKey] = keys;
      const [
        holdId,
        productId,
        userId,
        qtyStr,
        ttlSecStr,
        nowMsStr,
        expiresAtMsStr,
        sku,
        initialStockStr,
        eventId,
      ] = argv;

      const qty = Number(qtyStr);
      const ttlSec = Number(ttlSecStr);
      const nowMs = Number(nowMsStr);
      const expiresAtMs = Number(expiresAtMsStr);

      let currentStock = await this.get(stockKey);
      if (currentStock === null && initialStockStr !== undefined && initialStockStr !== "") {
        currentStock = String(initialStockStr);
        await this.set(stockKey, currentStock);
      }
      const totalStock = Number(currentStock ?? 0);
      const currentLocked = Number((await this.get(lockKey)) ?? 0);

      if (currentLocked + qty > totalStock) {
        return JSON.stringify({
          success: false,
          code: "INSUFFICIENT_STOCK",
          available: Math.max(0, totalStock - currentLocked),
          locked: currentLocked,
          total: totalStock,
        });
      }

      await this.set(lockKey, String(currentLocked + qty));
      const holdData: HoldRecord = {
        holdId: String(holdId),
        productId: String(productId),
        userId: String(userId),
        qty,
        sku: String(sku || ""),
        createdAt: nowMs,
        expiresAt: expiresAtMs,
        ttlSeconds: ttlSec,
        state: "ACTIVE_HOLD",
        retryCount: 0,
      };

      await this.set(holdKey, JSON.stringify(holdData), "EX", ttlSec);
      await this.xadd(
        streamKey,
        "*",
        "event_id",
        String(eventId),
        "event_type",
        "commerce.hold_created",
        "hold_id",
        String(holdId),
        "product_id",
        String(productId),
        "sku",
        String(sku || ""),
        "user_id",
        String(userId),
        "qty",
        String(qty),
        "expires_at",
        String(expiresAtMs),
        "created_at",
        String(nowMs)
      );

      return JSON.stringify({ success: true, hold: holdData });
    }

    // Emulate REFRESH_HOLD_LUA
    if (script === REFRESH_HOLD_LUA) {
      const [holdKey, streamKey] = keys;
      const [extensionSecStr, nowMsStr, reason, eventId] = argv;

      const rawHold = await this.get(holdKey);
      if (!rawHold) return JSON.stringify({ success: false, code: "HOLD_NOT_FOUND" });

      const hold: HoldRecord = JSON.parse(rawHold);
      const extSec = Number(extensionSecStr);
      const nowMs = Number(nowMsStr);

      hold.state = "PAYMENT_RETRYING";
      hold.retryCount = (hold.retryCount || 0) + 1;
      hold.expiresAt = nowMs + extSec * 1000;
      hold.ttlSeconds = extSec;

      await this.set(holdKey, JSON.stringify(hold), "EX", extSec);
      await this.xadd(
        streamKey,
        "*",
        "event_id",
        String(eventId),
        "event_type",
        "commerce.payment_failed",
        "hold_id",
        hold.holdId,
        "product_id",
        hold.productId,
        "user_id",
        hold.userId,
        "reason",
        String(reason || "payment_retry_extension"),
        "retry_count",
        String(hold.retryCount),
        "timestamp",
        String(nowMs)
      );

      return JSON.stringify({ success: true, hold });
    }

    // Emulate RELEASE_HOLD_LUA
    if (script === RELEASE_HOLD_LUA) {
      const [holdKey, lockKey, streamKey] = keys;
      const [reason, nowMsStr, eventId] = argv;

      const rawHold = await this.get(holdKey);
      if (!rawHold) return JSON.stringify({ success: false, code: "HOLD_NOT_FOUND" });

      const hold: HoldRecord = JSON.parse(rawHold);
      const qty = hold.qty || 1;
      const nowMs = Number(nowMsStr);

      const currentLocked = Number((await this.get(lockKey)) ?? 0);
      const newLocked = Math.max(0, currentLocked - qty);
      await this.set(lockKey, String(newLocked));
      await this.del(holdKey);

      await this.xadd(
        streamKey,
        "*",
        "event_id",
        String(eventId),
        "event_type",
        "commerce.reservation_released",
        "hold_id",
        hold.holdId,
        "product_id",
        hold.productId,
        "user_id",
        hold.userId,
        "qty",
        String(qty),
        "reason",
        String(reason || "user_cancelled"),
        "released_at",
        String(nowMs)
      );

      hold.state = "EXPIRED_RELEASE";
      return JSON.stringify({ success: true, releasedHold: hold });
    }

    // Emulate FULFILL_HOLD_LUA
    if (script === FULFILL_HOLD_LUA) {
      const [holdKey, lockKey, stockKey, streamKey] = keys;
      const [orderId, totalCentsStr, txHash, chipUid, nowMsStr, eventId] = argv;

      const rawHold = await this.get(holdKey);
      if (!rawHold) return JSON.stringify({ success: false, code: "HOLD_NOT_FOUND" });

      const hold: HoldRecord = JSON.parse(rawHold);
      const qty = hold.qty || 1;
      const nowMs = Number(nowMsStr);
      const totalCents = Number(totalCentsStr);

      const currentLocked = Number((await this.get(lockKey)) ?? 0);
      const newLocked = Math.max(0, currentLocked - qty);
      await this.set(lockKey, String(newLocked));

      const currentStock = Number((await this.get(stockKey)) ?? 0);
      const newStock = Math.max(0, currentStock - qty);
      await this.set(stockKey, String(newStock));

      await this.del(holdKey);

      await this.xadd(
        streamKey,
        "*",
        "event_id",
        String(eventId),
        "event_type",
        "commerce.fulfilled",
        "hold_id",
        hold.holdId,
        "order_id",
        String(orderId),
        "product_id",
        hold.productId,
        "sku",
        hold.sku || "",
        "user_id",
        hold.userId,
        "qty",
        String(qty),
        "total_cents",
        String(totalCents),
        "tx_hash",
        String(txHash || ""),
        "chip_uid",
        String(chipUid || ""),
        "timestamp",
        String(nowMs)
      );

      hold.state = "FULFILLED";
      return JSON.stringify({
        success: true,
        hold,
        fulfillment: {
          orderId: String(orderId),
          totalCents,
          fulfilledAt: nowMs,
        },
      });
    }

    throw new Error("Unsupported Lua script in mock client");
  }
}

// ─── Default In-Memory Singleton ──────────────────────────────────────────────

let defaultClient: RedisClientInterface = new InMemoryRedisClient();

/**
 * Configures the active Redis client (e.g., standard ioredis client or Upstash adapter).
 */
export function setHoldEngineRedisClient(client: RedisClientInterface) {
  defaultClient = client;
}

export function getHoldEngineRedisClient(): RedisClientInterface {
  return defaultClient;
}

// ─── Core Hold Engine Methods ──────────────────────────────────────────────────

/**
 * Creates an atomic stock reservation hold for a buyer with a 600s TTL.
 * 
 * Ensures available inventory is not oversold and publishes `commerce.hold_created`
 * to the `makerverse:events:commerce` Redis stream.
 *
 * @param params Parameters for hold creation
 * @param client Optional Redis client override
 */
export async function createCartHold(
  params: CreateHoldParams,
  client: RedisClientInterface = defaultClient
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
 * 
 * Extends the TTL by `extensionSeconds` (default: 300s / 5m), increments the retry counter,
 * updates the hold state to `PAYMENT_RETRYING`, and publishes a retry event.
 *
 * @param holdId Unique ID of the hold to extend
 * @param extensionSeconds Number of seconds to extend TTL (default: 300)
 * @param reason Diagnostic reason for payment retry
 * @param client Optional Redis client override
 */
export async function refreshCartHold(
  holdId: string,
  extensionSeconds = 300,
  reason = "payment_retry_extension",
  client: RedisClientInterface = defaultClient
): Promise<RefreshHoldResult> {
  const nowMs = Date.now();
  const eventId = crypto.randomUUID();

  const keys = [REDIS_KEYS.hold(holdId), REDIS_KEYS.COMMERCE_STREAM];
  const args = [extensionSeconds, nowMs, reason, eventId];

  try {
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
 * Publishes `commerce.reservation_released` to the `makerverse:events:commerce` Redis stream.
 *
 * @param holdId Unique ID of the hold
 * @param reason Reason for release ('expired' | 'user_cancelled' | 'payment_failed' | 'admin_override')
 * @param client Optional Redis client override
 */
export async function releaseCartHold(
  holdId: string,
  reason: HoldReleaseReason = "user_cancelled",
  client: RedisClientInterface = defaultClient
): Promise<ReleaseHoldResult> {
  // First read hold to know productId if needed for keys
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
  ];
  const args = [reason, nowMs, eventId];

  try {
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
 * 
 * Atomically decrements the stock lock, permanently decrements the physical stock pool,
 * removes the hold key, and emits `commerce.fulfilled` with order metadata.
 *
 * @param params Fulfillment parameters
 * @param client Optional Redis client override
 */
export async function fulfillCartHold(
  params: FulfillHoldParams,
  client: RedisClientInterface = defaultClient
): Promise<FulfillHoldResult> {
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
  ];

  const args = [orderId, totalCents, txHash, chipUid, nowMs, eventId];

  try {
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
  client: RedisClientInterface = defaultClient
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
  client: RedisClientInterface = defaultClient
): Promise<void> {
  await client.set(REDIS_KEYS.productStock(productId), String(totalStock));
}
