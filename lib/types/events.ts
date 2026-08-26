// lib/types/events.ts
/**
 * Makerverse Redis Stream Event Topics & Schema Definitions
 * 
 * Defines standard topic names, strict Zod validation schemas, and inferred
 * TypeScript interfaces for all event payloads across Makerverse distributed services.
 * 
 * Event Topics:
 *  - `makerverse:events:catalog`  : Inventory replenishment and product metadata mutations.
 *  - `makerverse:events:commerce` : Cart reservation holds, payment retries, releases, and fulfillments.
 *  - `cozy:events:social`         : Social spatial tagging and real-time demand signaling.
 */

import { z } from "zod";

// ─── Stream Topic Constants ───────────────────────────────────────────────────

export const REDIS_STREAMS = {
  /** Catalog updates, restocks, and pricing mutations */
  CATALOG: "makerverse:events:catalog",
  /** Commerce lifecycle: reservation holds, payment states, and order fulfillments */
  COMMERCE: "makerverse:events:commerce",
  /** Social engagement, spatial product tagging, and demand signals */
  SOCIAL: "cozy:events:social",
} as const;

export type RedisStreamTopic = (typeof REDIS_STREAMS)[keyof typeof REDIS_STREAMS];

// ─── Chip Tier & Common Types ─────────────────────────────────────────────────

export const ChipTierSchema = z.enum([
  "QR_REGISTRY",
  "NTAG213_SERIALIZED",
  "NTAG215_SERIALIZED",
  "NTAG424_DNA",
]);
export type ChipTier = z.infer<typeof ChipTierSchema>;

export const StockStatusSchema = z.enum(["IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK"]);
export type StockStatus = z.infer<typeof StockStatusSchema>;

export const HoldReleaseReasonSchema = z.enum([
  "expired",
  "user_cancelled",
  "payment_failed",
  "admin_override",
]);
export type HoldReleaseReason = z.infer<typeof HoldReleaseReasonSchema>;

// ─── 1. Catalog Stream Schemas (`makerverse:events:catalog`) ───────────────────

/**
 * Triggered when a maker or vendor replenishes physical stock for a product SKU.
 */
export const CatalogRestockPayloadSchema = z.object({
  event_id: z.string().min(1, "Event ID is required"),
  event_type: z.literal("catalog.restock"),
  product_id: z.string().min(1, "Product ID is required"),
  sku: z.string().min(1, "SKU is required"),
  quantity_added: z.number().int().positive("Quantity added must be a positive integer"),
  new_total_stock: z.number().int().nonnegative("New total stock must be non-negative"),
  vendor_id: z.string().min(1, "Vendor ID is required"),
  timestamp: z.union([z.string().datetime(), z.number().int().positive()]),
});
export type CatalogRestockPayload = z.infer<typeof CatalogRestockPayloadSchema>;

/**
 * Triggered when product metadata, pricing, royalty basis points, or chip tiers update.
 */
export const CatalogProductUpdatedPayloadSchema = z.object({
  event_id: z.string().min(1, "Event ID is required"),
  event_type: z.literal("catalog.product_updated"),
  product_id: z.string().min(1, "Product ID is required"),
  sku: z.string().min(1, "SKU is required"),
  title: z.string().min(1, "Title cannot be empty"),
  price_cents: z.number().int().nonnegative("Price in cents must be non-negative"),
  royalty_bps: z.number().int().min(0).max(10000, "Royalty basis points must be 0-10000"),
  chip_tier: ChipTierSchema,
  status: StockStatusSchema,
  updated_at: z.union([z.string().datetime(), z.number().int().positive()]),
});
export type CatalogProductUpdatedPayload = z.infer<typeof CatalogProductUpdatedPayloadSchema>;

export const CatalogEventPayloadSchema = z.discriminatedUnion("event_type", [
  CatalogRestockPayloadSchema,
  CatalogProductUpdatedPayloadSchema,
]);
export type CatalogEventPayload = z.infer<typeof CatalogEventPayloadSchema>;

// ─── 2. Commerce Stream Schemas (`makerverse:events:commerce`) ────────────────

/**
 * Triggered when a shopper places an item in cart and reserves stock with a 600s TTL.
 */
export const CommerceHoldCreatedPayloadSchema = z.object({
  event_id: z.string().min(1, "Event ID is required"),
  event_type: z.literal("commerce.hold_created"),
  hold_id: z.string().min(1, "Hold ID is required"),
  product_id: z.string().min(1, "Product ID is required"),
  sku: z.string().optional(),
  user_id: z.string().min(1, "User ID is required"),
  qty: z.number().int().positive("Hold quantity must be a positive integer").default(1),
  expires_at: z.number().int().positive("Expires at must be a valid Unix timestamp in milliseconds"),
  created_at: z.number().int().positive("Created at must be a valid Unix timestamp in milliseconds"),
});
export type CommerceHoldCreatedPayload = z.infer<typeof CommerceHoldCreatedPayloadSchema>;

/**
 * Triggered when a payment attempt fails during checkout, entering a retry window.
 */
export const CommercePaymentFailedPayloadSchema = z.object({
  event_id: z.string().min(1, "Event ID is required"),
  event_type: z.literal("commerce.payment_failed"),
  hold_id: z.string().min(1, "Hold ID is required"),
  product_id: z.string().min(1, "Product ID is required"),
  user_id: z.string().min(1, "User ID is required"),
  reason: z.string().min(1, "Failure reason is required"),
  retry_count: z.number().int().nonnegative("Retry count must be non-negative").default(0),
  timestamp: z.number().int().positive("Timestamp must be a Unix timestamp in milliseconds"),
});
export type CommercePaymentFailedPayload = z.infer<typeof CommercePaymentFailedPayloadSchema>;

/**
 * Triggered when a hold expires or is cancelled, returning locked quantity to the pool.
 */
export const CommerceReservationReleasedPayloadSchema = z.object({
  event_id: z.string().min(1, "Event ID is required"),
  event_type: z.literal("commerce.reservation_released"),
  hold_id: z.string().min(1, "Hold ID is required"),
  product_id: z.string().min(1, "Product ID is required"),
  user_id: z.string().min(1, "User ID is required"),
  qty: z.number().int().positive("Released quantity must be positive"),
  reason: HoldReleaseReasonSchema,
  released_at: z.number().int().positive("Released at must be a Unix timestamp in milliseconds"),
});
export type CommerceReservationReleasedPayload = z.infer<
  typeof CommerceReservationReleasedPayloadSchema
>;

/**
 * Triggered when payment succeeds and physical ownership / chip provenance is minted.
 */
export const CommerceFulfilledPayloadSchema = z.object({
  event_id: z.string().min(1, "Event ID is required"),
  event_type: z.literal("commerce.fulfilled"),
  hold_id: z.string().min(1, "Hold ID is required"),
  order_id: z.string().min(1, "Order ID is required"),
  product_id: z.string().min(1, "Product ID is required"),
  sku: z.string().min(1, "SKU is required"),
  user_id: z.string().min(1, "User ID is required"),
  qty: z.number().int().positive("Fulfilled quantity must be positive"),
  total_cents: z.number().int().nonnegative("Total cents must be non-negative"),
  tx_hash: z.string().optional(),
  chip_uid: z.string().optional(),
  timestamp: z.number().int().positive("Timestamp must be a Unix timestamp in milliseconds"),
});
export type CommerceFulfilledPayload = z.infer<typeof CommerceFulfilledPayloadSchema>;

export const CommerceEventPayloadSchema = z.discriminatedUnion("event_type", [
  CommerceHoldCreatedPayloadSchema,
  CommercePaymentFailedPayloadSchema,
  CommerceReservationReleasedPayloadSchema,
  CommerceFulfilledPayloadSchema,
]);
export type CommerceEventPayload = z.infer<typeof CommerceEventPayloadSchema>;

// ─── 3. Social Stream Schemas (`cozy:events:social`) ──────────────────────────

/**
 * Triggered when a maker or curator tags a physical product inside a spatial post.
 */
export const CozyProductTaggedPayloadSchema = z.object({
  event_id: z.string().min(1, "Event ID is required"),
  event_type: z.literal("cozy.product_tagged"),
  post_id: z.string().min(1, "Post ID is required"),
  product_id: z.string().min(1, "Product ID is required"),
  tagger_user_id: z.string().min(1, "Tagger User ID is required"),
  coordinate_x: z.number().min(0).max(100, "X coordinate must be a percentage between 0 and 100"),
  coordinate_y: z.number().min(0).max(100, "Y coordinate must be a percentage between 0 and 100"),
  timestamp: z.union([z.string().datetime(), z.number().int().positive()]),
});
export type CozyProductTaggedPayload = z.infer<typeof CozyProductTaggedPayloadSchema>;

/**
 * Triggered when shoppers click "Signal Interest" or tap physical chips to back a run.
 */
export const CozyDemandSignaledPayloadSchema = z.object({
  event_id: z.string().min(1, "Event ID is required"),
  event_type: z.literal("cozy.demand_signaled"),
  product_id: z.string().min(1, "Product ID is required"),
  user_id: z.string().min(1, "User ID is required"),
  signal_strength: z.number().int().min(1).max(5).default(1),
  total_demand_count: z.number().int().nonnegative("Total demand count must be non-negative"),
  timestamp: z.union([z.string().datetime(), z.number().int().positive()]),
});
export type CozyDemandSignaledPayload = z.infer<typeof CozyDemandSignaledPayloadSchema>;

export const SocialEventPayloadSchema = z.discriminatedUnion("event_type", [
  CozyProductTaggedPayloadSchema,
  CozyDemandSignaledPayloadSchema,
]);
export type SocialEventPayload = z.infer<typeof SocialEventPayloadSchema>;

// ─── Master Event Union ───────────────────────────────────────────────────────

export const MakerverseStreamEventSchema = z.discriminatedUnion("event_type", [
  CatalogRestockPayloadSchema,
  CatalogProductUpdatedPayloadSchema,
  CommerceHoldCreatedPayloadSchema,
  CommercePaymentFailedPayloadSchema,
  CommerceReservationReleasedPayloadSchema,
  CommerceFulfilledPayloadSchema,
  CozyProductTaggedPayloadSchema,
  CozyDemandSignaledPayloadSchema,
]);
export type MakerverseStreamEvent = z.infer<typeof MakerverseStreamEventSchema>;

// ─── Stream Serialization & Deserialization Helpers ───────────────────────────

/**
 * Map connecting each stream topic to its corresponding Zod schema validator.
 */
export const STREAM_TOPIC_VALIDATORS = {
  [REDIS_STREAMS.CATALOG]: CatalogEventPayloadSchema,
  [REDIS_STREAMS.COMMERCE]: CommerceEventPayloadSchema,
  [REDIS_STREAMS.SOCIAL]: SocialEventPayloadSchema,
} as const;

/**
 * Flattens an event payload into key-value string pairs required by Redis `XADD`.
 * Non-string fields (numbers, booleans, objects) are serialized to JSON strings.
 */
export function serializeStreamEvent(event: MakerverseStreamEvent): Record<string, string> {
  const parsed = MakerverseStreamEventSchema.parse(event);
  const serialized: Record<string, string> = {};

  for (const [key, value] of Object.entries(parsed)) {
    if (value !== undefined && value !== null) {
      if (typeof value === "string") {
        serialized[key] = value;
      } else {
        serialized[key] = JSON.stringify(value);
      }
    }
  }

  return serialized;
}

/**
 * Parses raw Redis Stream entries (from XREAD, XREVRANGE, or key-value arrays)
 * into strictly typed and validated Makerverse event payloads.
 *
 * @param topic The Redis stream topic name
 * @param rawFields Key-value dictionary or array of alternating [key, value] pairs from Redis
 * @returns Validated typed stream event
 */
export function parseStreamEvent<T extends MakerverseStreamEvent = MakerverseStreamEvent>(
  topic: RedisStreamTopic | string,
  rawFields: Record<string, string> | string[]
): T {
  // Normalize array [k1, v1, k2, v2] to dictionary if needed
  const fieldsDict: Record<string, unknown> = {};

  if (Array.isArray(rawFields)) {
    for (let i = 0; i < rawFields.length; i += 2) {
      const key = rawFields[i];
      const val = rawFields[i + 1];
      fieldsDict[key] = val;
    }
  } else {
    Object.assign(fieldsDict, rawFields);
  }

  // Attempt to parse any stringified numbers/objects
  const unflattened: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fieldsDict)) {
    if (typeof v === "string") {
      try {
        // Attempt JSON parse for numbers, booleans, and serialized objects
        unflattened[k] = JSON.parse(v);
      } catch {
        // Retain as raw string if not JSON parsable
        unflattened[k] = v;
      }
    } else {
      unflattened[k] = v;
    }
  }

  // Pick validator based on topic if known, otherwise use master union
  if (topic === REDIS_STREAMS.CATALOG) {
    return CatalogEventPayloadSchema.parse(unflattened) as T;
  }
  if (topic === REDIS_STREAMS.COMMERCE) {
    return CommerceEventPayloadSchema.parse(unflattened) as T;
  }
  if (topic === REDIS_STREAMS.SOCIAL) {
    return SocialEventPayloadSchema.parse(unflattened) as T;
  }

  return MakerverseStreamEventSchema.parse(unflattened) as T;
}
