// lib/redis/holdScripts.ts

/**
 * Atomic Cart Hold Creation Lua Script
 *
 * Keys:
 *  1: `makerverse:hold:{holdId}`
 *  2: `makerverse:stock_lock:{productId}`
 *  3: `makerverse:product_stock:{productId}`
 *  4: `makerverse:events:commerce`
 *  5: `makerverse:active_holds:{productId}`
 */
export const CREATE_HOLD_LUA = `
local holdKey = KEYS[1]
local lockKey = KEYS[2]
local stockKey = KEYS[3]
local streamKey = KEYS[4]
local activeHoldsKey = KEYS[5]

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

-- 0. Reclaim expired holds before checking availability
if activeHoldsKey then
  local expired = redis.call('ZRANGEBYSCORE', activeHoldsKey, '-inf', nowMs)
  for _, item in ipairs(expired) do
    local colonIdx = string.find(item, ":")
    if colonIdx then
      local expQty = tonumber(string.sub(item, colonIdx + 1)) or 0
      local currentLocked = tonumber(redis.call('GET', lockKey) or "0")
      local newLocked = math.max(0, currentLocked - expQty)
      redis.call('SET', lockKey, tostring(newLocked))
    end
  end
  if #expired > 0 then
    redis.call('ZREMRANGEBYSCORE', activeHoldsKey, '-inf', nowMs)
  end
end

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

-- 4. Atomically increment lock pool and track active hold
redis.call('INCRBY', lockKey, qty)
if activeHoldsKey then
  redis.call('ZADD', activeHoldsKey, expiresAtMs, holdId .. ':' .. tostring(qty))
end

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
 *  3: `makerverse:active_holds:{productId}`
 */
export const REFRESH_HOLD_LUA = `
local holdKey = KEYS[1]
local streamKey = KEYS[2]
local activeHoldsKey = KEYS[3]

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

if activeHoldsKey then
  redis.call('ZREM', activeHoldsKey, hold.holdId .. ':' .. tostring(hold.qty or 1))
  redis.call('ZADD', activeHoldsKey, hold.expiresAt, hold.holdId .. ':' .. tostring(hold.qty or 1))
end

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
 *  4: `makerverse:active_holds:{productId}`
 */
export const RELEASE_HOLD_LUA = `
local holdKey = KEYS[1]
local lockKey = KEYS[2]
local streamKey = KEYS[3]
local activeHoldsKey = KEYS[4]

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

if activeHoldsKey then
  redis.call('ZREM', activeHoldsKey, hold.holdId .. ':' .. tostring(qty))
end

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
 *  5: `makerverse:active_holds:{productId}`
 */
export const FULFILL_HOLD_LUA = `
local holdKey = KEYS[1]
local lockKey = KEYS[2]
local stockKey = KEYS[3]
local streamKey = KEYS[4]
local activeHoldsKey = KEYS[5]

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

if activeHoldsKey then
  redis.call('ZREM', activeHoldsKey, hold.holdId .. ':' .. tostring(qty))
end

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
