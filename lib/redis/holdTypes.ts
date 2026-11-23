// lib/redis/holdTypes.ts
import { REDIS_STREAMS } from "@/lib/types/events";

// ─── Key Format Generators ────────────────────────────────────────────────────

export const REDIS_KEYS = {
  /** Hold record hash key */
  hold: (holdId: string) => `makerverse:hold:${holdId}`,
  /** Active stock lock counter (sum of all currently held units) */
  stockLock: (productId: string) => `makerverse:stock_lock:${productId}`,
  /** Total physical stock pool */
  productStock: (productId: string) => `makerverse:product_stock:${productId}`,
  /** Active holds sorted set per product (score: expiresAtMs, member: holdId:qty) */
  activeHolds: (productId: string) => `makerverse:active_holds:${productId}`,
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
