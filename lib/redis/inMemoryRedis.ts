// lib/redis/inMemoryRedis.ts
import {
  CREATE_HOLD_LUA,
  FULFILL_HOLD_LUA,
  REFRESH_HOLD_LUA,
  RELEASE_HOLD_LUA,
} from "./holdScripts";
import {
  REDIS_KEYS,
  type HoldRecord,
  type RedisClientInterface,
} from "./holdTypes";

/**
 * In-Memory Redis Mock Adapter for test and standalone environments.
 */
export class InMemoryRedisClient implements RedisClientInterface {
  private store = new Map<string, { val: string; expiresAt?: number }>();
  private streams = new Map<string, Array<{ id: string; fields: Record<string, string> }>>();
  private activeHolds = new Map<string, Array<{ holdId: string; qty: number; expiresAt: number }>>();

  reconcileExpired(productId: string, nowMs = Date.now()): number {
    const lockKey = REDIS_KEYS.stockLock(productId);
    const productHolds = this.activeHolds.get(productId) || [];
    const validHolds: Array<{ holdId: string; qty: number; expiresAt: number }> = [];
    let reclaimedQty = 0;
    for (const h of productHolds) {
      if (h.expiresAt <= nowMs) {
        reclaimedQty += h.qty;
      } else {
        validHolds.push(h);
      }
    }
    this.activeHolds.set(productId, validHolds);
    if (reclaimedQty > 0) {
      const currentLocked = Number(this.getSync(lockKey) ?? 0);
      const newLocked = Math.max(0, currentLocked - reclaimedQty);
      this.setSync(lockKey, String(newLocked));
    }
    return reclaimedQty;
  }

  private isExpired(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return true;
    if (entry.expiresAt && entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return true;
    }
    return false;
  }

  private getSync(key: string): string | null {
    if (this.isExpired(key)) return null;
    return this.store.get(key)?.val ?? null;
  }

  private setSync(key: string, value: string, ...args: (string | number)[]): void {
    let expiresAt: number | undefined = undefined;
    if (args[0] === "EX" && typeof args[1] === "number") {
      expiresAt = Date.now() + args[1] * 1000;
    } else if (args[0] === "PX" && typeof args[1] === "number") {
      expiresAt = Date.now() + args[1];
    }
    this.store.set(key, { val: value, expiresAt });
  }

  private delSync(key: string): number {
    const existed = this.store.delete(key);
    return existed ? 1 : 0;
  }

  private xaddSync(stream: string, id: string, ...args: string[]): string {
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

  async get(key: string): Promise<string | null> {
    return this.getSync(key);
  }

  async set(key: string, value: string, ...args: (string | number)[]): Promise<unknown> {
    this.setSync(key, value, ...args);
    return "OK";
  }

  async del(key: string): Promise<number> {
    return this.delSync(key);
  }

  async pttl(key: string): Promise<number> {
    if (this.isExpired(key)) return -2;
    const entry = this.store.get(key);
    if (!entry || !entry.expiresAt) return -1;
    return Math.max(0, entry.expiresAt - Date.now());
  }

  async xadd(stream: string, id: string, ...args: string[]): Promise<string> {
    return this.xaddSync(stream, id, ...args);
  }

  getStreamEntries(stream: string) {
    return this.streams.get(stream) ?? [];
  }

  async eval(script: string, numkeys: number, ...args: (string | number)[]): Promise<unknown> {
    const keys = args.slice(0, numkeys).map(String);
    const argv = args.slice(numkeys);

    if (script === CREATE_HOLD_LUA) {
      return this.evalCreateHold(keys, argv);
    }
    if (script === REFRESH_HOLD_LUA) {
      return this.evalRefreshHold(keys, argv);
    }
    if (script === RELEASE_HOLD_LUA) {
      return this.evalReleaseHold(keys, argv);
    }
    if (script === FULFILL_HOLD_LUA) {
      return this.evalFulfillHold(keys, argv);
    }

    throw new Error("Unsupported Lua script in mock client");
  }

  private evalCreateHold(keys: string[], argv: (string | number)[]): string {
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

    // Reclaim expired holds before availability check
    this.reconcileExpired(String(productId), nowMs);

    const currentLocked = Number(this.getSync(lockKey) ?? 0);
    let currentStock = this.getSync(stockKey);
    if (currentStock === null && initialStockStr !== undefined && initialStockStr !== "") {
      currentStock = String(initialStockStr);
      this.setSync(stockKey, currentStock);
    }
    const totalStock = Number(currentStock ?? 0);

    if (currentLocked + qty > totalStock) {
      return JSON.stringify({
        success: false,
        code: "INSUFFICIENT_STOCK",
        available: Math.max(0, totalStock - currentLocked),
        locked: currentLocked,
        total: totalStock,
      });
    }

    this.setSync(lockKey, String(currentLocked + qty));
    const validHolds = this.activeHolds.get(String(productId)) || [];
    validHolds.push({ holdId: String(holdId), qty, expiresAt: expiresAtMs });
    this.activeHolds.set(String(productId), validHolds);

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

    this.setSync(holdKey, JSON.stringify(holdData), "EX", ttlSec);
    this.xaddSync(
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
      String(nowMs),
    );

    return JSON.stringify({ success: true, hold: holdData });
  }

  private evalRefreshHold(keys: string[], argv: (string | number)[]): string {
    const [holdKey, streamKey] = keys;
    const [extensionSecStr, nowMsStr, reason, eventId] = argv;

    const rawHold = this.getSync(holdKey);
    if (!rawHold) return JSON.stringify({ success: false, code: "HOLD_NOT_FOUND" });

    const hold: HoldRecord = JSON.parse(rawHold);
    const extSec = Number(extensionSecStr);
    const nowMs = Number(nowMsStr);

    hold.state = "PAYMENT_RETRYING";
    hold.retryCount = (hold.retryCount || 0) + 1;
    hold.expiresAt = nowMs + extSec * 1000;
    hold.ttlSeconds = extSec;

    this.setSync(holdKey, JSON.stringify(hold), "EX", extSec);

    const productHolds = this.activeHolds.get(hold.productId) || [];
    const target = productHolds.find((h) => h.holdId === hold.holdId);
    if (target) {
      target.expiresAt = hold.expiresAt;
    }

    this.xaddSync(
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
      String(nowMs),
    );

    return JSON.stringify({ success: true, hold });
  }

  private evalReleaseHold(keys: string[], argv: (string | number)[]): string {
    const [holdKey, lockKey, streamKey] = keys;
    const [reason, nowMsStr, eventId] = argv;

    const rawHold = this.getSync(holdKey);
    if (!rawHold) return JSON.stringify({ success: false, code: "HOLD_NOT_FOUND" });

    const hold: HoldRecord = JSON.parse(rawHold);
    const qty = hold.qty || 1;
    const nowMs = Number(nowMsStr);

    const currentLocked = Number(this.getSync(lockKey) ?? 0);
    const newLocked = Math.max(0, currentLocked - qty);
    this.setSync(lockKey, String(newLocked));
    this.delSync(holdKey);

    const productHolds = this.activeHolds.get(hold.productId) || [];
    this.activeHolds.set(
      hold.productId,
      productHolds.filter((h) => h.holdId !== hold.holdId),
    );

    this.xaddSync(
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
      String(nowMs),
    );

    hold.state = "EXPIRED_RELEASE";
    return JSON.stringify({ success: true, releasedHold: hold });
  }

  private evalFulfillHold(keys: string[], argv: (string | number)[]): string {
    const [holdKey, lockKey, stockKey, streamKey] = keys;
    const [orderId, totalCentsStr, txHash, chipUid, nowMsStr, eventId] = argv;

    const rawHold = this.getSync(holdKey);
    if (!rawHold) return JSON.stringify({ success: false, code: "HOLD_NOT_FOUND" });

    const hold: HoldRecord = JSON.parse(rawHold);
    const qty = hold.qty || 1;
    const nowMs = Number(nowMsStr);
    const totalCents = Number(totalCentsStr);

    const currentLocked = Number(this.getSync(lockKey) ?? 0);
    const newLocked = Math.max(0, currentLocked - qty);
    this.setSync(lockKey, String(newLocked));

    const currentStock = Number(this.getSync(stockKey) ?? 0);
    const newStock = Math.max(0, currentStock - qty);
    this.setSync(stockKey, String(newStock));

    this.delSync(holdKey);

    const productHolds = this.activeHolds.get(hold.productId) || [];
    this.activeHolds.set(
      hold.productId,
      productHolds.filter((h) => h.holdId !== hold.holdId),
    );

    this.xaddSync(
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
      String(nowMs),
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
}
