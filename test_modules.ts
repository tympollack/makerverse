// test_modules.ts
/**
 * Comprehensive Test & Verification Suite for Makerverse Modules:
 *  1. lib/nfc/cmac.ts
 *  2. lib/redis/holdEngine.ts
 *  3. lib/types/events.ts
 *  4. lib/version (EcosystemVersion, FeatureGateEngine, Middleware, Handshake)
 */

import assert from "assert";
import crypto from "crypto";
import {
  EcosystemVersion,
  SemVerRange,
  FeatureGateEngine,
  createVersionedPayload,
  parseVersionedPayload,
  createStreamVersionInterceptor,
  createApiVersionInterceptor,
  IncompatibleVersionError,
  validateClientVersion,
  VersionLifecycleEventEmitter,
  VERSION_LIFECYCLE_EVENTS,
  MakerverseSDK,
  createMakerverseSDK,
} from "./lib/version";
import {
  REDIS_STREAMS,
  CatalogRestockPayloadSchema,
  CatalogProductUpdatedPayloadSchema,
  CommerceHoldCreatedPayloadSchema,
  CommercePaymentFailedPayloadSchema,
  CommerceReservationReleasedPayloadSchema,
  CommerceFulfilledPayloadSchema,
  CozyProductTaggedPayloadSchema,
  CozyDemandSignaledPayloadSchema,
  parseStreamEvent,
  serializeStreamEvent,
  type MakerverseStreamEvent,
} from "./lib/types/events";

import {
  computeAES128CMAC,
  deriveAES128CMACSubkeys,
  decryptPICCData,
  deriveNTAG424SessionMACKey,
  verifyNFCSignature,
  verifyStaticNFCTag,
  verifyQRToken,
  generateDynamicTapPayload,
  normalizeUID,
} from "./lib/nfc/cmac";

import {
  createCartHold,
  refreshCartHold,
  releaseCartHold,
  fulfillCartHold,
  getCartHold,
  seedProductStock,
  InMemoryRedisClient,
  REDIS_KEYS,
} from "./lib/redis/holdEngine";

console.log("==================================================================");
console.log("  RUNNING MAKERVERSE BACKEND & DISTRIBUTED SYSTEMS TEST SUITE");
console.log("==================================================================");

let testsPassed = 0;
async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    testsPassed++;
  } catch (err: unknown) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

async function runAllTests() {
  console.log("\n─── 1. NFC Cryptographic CMAC Verification Engine ───────────────");

  await test("NIST SP 800-38B RFC 4493 CMAC Subkey Derivation & Computation", () => {
    // RFC 4493 Test Vector 1: Key = 2b7e151628aed2a6abf7158809cf4f3c
    const key = Buffer.from("2b7e151628aed2a6abf7158809cf4f3c", "hex");
    const { k1, k2 } = deriveAES128CMACSubkeys(key);
    assert.strictEqual(k1.toString("hex").toLowerCase(), "fbeed618357133667c85e08f7236a8de");
    assert.strictEqual(k2.toString("hex").toLowerCase(), "f7ddac306ae266ccf90bc11ee46d513b");

    // RFC 4493 Test Vector: Empty message
    const emptyMsg = Buffer.alloc(0);
    const cmacEmpty = computeAES128CMAC(key, emptyMsg);
    assert.strictEqual(cmacEmpty.toString("hex").toLowerCase(), "bb1d6929e95937287fa37d129b756746");

    // RFC 4493 Test Vector: 16-byte message (6bc1bee22e409f96e93d7e117393172a)
    const msg16 = Buffer.from("6bc1bee22e409f96e93d7e117393172a", "hex");
    const cmac16 = computeAES128CMAC(key, msg16);
    assert.strictEqual(cmac16.toString("hex").toLowerCase(), "070a16b46b4d4144f79bdd9dd04a287c");
  });

  await test("NTAG424 DNA Dynamic Tap Decryption & CMAC Verification", () => {
    const secretKey = "00112233445566778899AABBCCDDEEFF";
    const uid = "04:A3:F2:11:8E:2C:80";
    const tapCounter = 42;

    // Simulate tag dynamic payload generation
    const tapPayload = generateDynamicTapPayload({
      uid,
      tapCounter,
      secretKey,
    });

    assert.ok(tapPayload.piccData);
    assert.ok(tapPayload.cmac);

    // Verify dynamic tap
    const verification = verifyNFCSignature({
      uid,
      piccData: tapPayload.piccData,
      cmac: tapPayload.cmac,
      secretKey,
      expectedCounter: 40,
    });

    assert.strictEqual(verification.valid, true);
    assert.strictEqual(verification.tapCounter, 42);
    assert.strictEqual(verification.uid, "04:A3:F2:11:8E:2C:80");
    assert.strictEqual(verification.tier, "NTAG424_DNA");
  });

  await test("NTAG424 DNA 8-byte Truncated CMAC Verification", () => {
    const secretKey = "A1B2C3D4E5F60718293A4B5C6D7E8F90";
    const uid = "04:B7:E1:22:3D:4A:91";
    const tapCounter = 105;

    const tapPayload = generateDynamicTapPayload({
      uid,
      tapCounter,
      secretKey,
    });

    // Verify with truncated 8-byte CMAC (16 hex chars)
    const verification = verifyNFCSignature({
      uid,
      piccData: tapPayload.piccData,
      cmac: tapPayload.cmacTruncated8,
      secretKey,
      expectedCounter: 100,
    });

    assert.strictEqual(verification.valid, true);
    assert.strictEqual(verification.tapCounter, 105);
  });

  await test("NTAG424 DNA Replay Attack Detection (Counter <= Expected)", () => {
    const secretKey = "00112233445566778899AABBCCDDEEFF";
    const uid = "04:A3:F2:11:8E:2C:80";
    const tapCounter = 42;

    const tapPayload = generateDynamicTapPayload({
      uid,
      tapCounter,
      secretKey,
    });

    // Replay tap with expectedCounter = 42 (same) or 50 (higher)
    const replayAttempt1 = verifyNFCSignature({
      uid,
      piccData: tapPayload.piccData,
      cmac: tapPayload.cmac,
      secretKey,
      expectedCounter: 42,
    });
    assert.strictEqual(replayAttempt1.valid, false);
    assert.ok(replayAttempt1.error?.includes("Replay attack detected"));

    const replayAttempt2 = verifyNFCSignature({
      uid,
      piccData: tapPayload.piccData,
      cmac: tapPayload.cmac,
      secretKey,
      expectedCounter: 50,
    });
    assert.strictEqual(replayAttempt2.valid, false);
  });

  await test("NTAG424 DNA Tampered PICC / Key Mismatch Detection", () => {
    const secretKey = "00112233445566778899AABBCCDDEEFF";
    const wrongKey = "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF";
    const uid = "04:A3:F2:11:8E:2C:80";

    const tapPayload = generateDynamicTapPayload({
      uid,
      tapCounter: 12,
      secretKey,
    });

    // Attempt verify with wrong key
    const verificationWrongKey = verifyNFCSignature({
      uid,
      piccData: tapPayload.piccData,
      cmac: tapPayload.cmac,
      secretKey: wrongKey,
      expectedCounter: 10,
    });
    assert.strictEqual(verificationWrongKey.valid, false);

    // Attempt verify with UID mismatch
    const verificationWrongUid = verifyNFCSignature({
      uid: "04:FF:FF:FF:FF:FF:FF",
      piccData: tapPayload.piccData,
      cmac: tapPayload.cmac,
      secretKey,
      expectedCounter: 10,
    });
    assert.strictEqual(verificationWrongUid.valid, false);
    assert.ok(verificationWrongUid.error?.includes("UID mismatch"));
  });

  await test("PICCData Decryption, Session Key Derivation & UID Normalization", () => {
    const key = Buffer.from("00112233445566778899aabbccddeeff", "hex");
    const rawUid = Buffer.from("04a3f2118e2c80", "hex");
    const counter = 123;

    const normalized = normalizeUID("04a3f2118e2c80");
    assert.strictEqual(normalized, "04:A3:F2:11:8E:2C:80");

    const sessionKey = deriveNTAG424SessionMACKey(key, rawUid, counter);
    assert.strictEqual(sessionKey.length, 16);

    const generated = generateDynamicTapPayload({
      uid: normalized,
      tapCounter: counter,
      secretKey: key,
    });

    const decrypted = decryptPICCData(generated.piccData, key);
    assert.strictEqual(decrypted.uid, "04:A3:F2:11:8E:2C:80");
    assert.strictEqual(decrypted.tapCounter, 123);
    assert.strictEqual(decrypted.header, 0xc7);
  });

  await test("Static NTAG213 / NTAG215 Serialization & Lock Bits Verification", () => {
    const validResult = verifyStaticNFCTag({
      uid: "04:C9:D0:33:1F:5B:A2",
      tier: "NTAG215_SERIALIZED",
      lockBitsVerified: true,
      expectedSku: "FC-LTH-WLT-003",
      registeredSku: "FC-LTH-WLT-003",
    });
    assert.strictEqual(validResult.valid, true);
    assert.strictEqual(validResult.tier, "NTAG215_SERIALIZED");

    // Invalid non-NXP prefix
    const invalidManufacturer = verifyStaticNFCTag({
      uid: "08:C9:D0:33:1F:5B:A2",
      tier: "NTAG213_SERIALIZED",
      lockBitsVerified: true,
    });
    assert.strictEqual(invalidManufacturer.valid, false);
    assert.ok(invalidManufacturer.error?.includes("Untrusted manufacturer"));

    // Unlocked chip
    const unlockedResult = verifyStaticNFCTag({
      uid: "04:C9:D0:33:1F:5B:A2",
      tier: "NTAG215_SERIALIZED",
      lockBitsVerified: false,
    });
    assert.strictEqual(unlockedResult.valid, false);
    assert.ok(unlockedResult.error?.includes("Lock bits must be configured"));
  });

  await test("QR Token Registry HMAC Signature & Nonce Validation", () => {
    const qrSecret = "super-secret-hmac-key";
    const payload = {
      productId: "prod_003",
      sku: "FC-MTL-PNT-007",
      nonce: "nonce_123456",
      issuedAt: Date.now(),
    };
    const b64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const sig = crypto.createHmac("sha256", qrSecret).update(b64).digest("hex");
    const token = `mv_qr_${b64}.${sig}`;

    // Valid token
    const validQr = verifyQRToken({
      token,
      secretKey: qrSecret,
      maxAgeSeconds: 3600,
    });
    assert.strictEqual(validQr.valid, true);
    assert.strictEqual(validQr.payload?.productId, "prod_003");

    // Replay consumed nonce
    const usedNonces = new Set(["nonce_123456"]);
    const replayedQr = verifyQRToken({
      token,
      secretKey: qrSecret,
      usedNonces,
    });
    assert.strictEqual(replayedQr.valid, false);
    assert.ok(replayedQr.error?.includes("replay detected"));

    // Expired token
    const oldPayload = { ...payload, issuedAt: Date.now() - 5000 * 1000 };
    const oldB64 = Buffer.from(JSON.stringify(oldPayload)).toString("base64url");
    const oldSig = crypto.createHmac("sha256", qrSecret).update(oldB64).digest("hex");
    const expiredToken = `mv_qr_${oldB64}.${oldSig}`;

    const expiredQr = verifyQRToken({
      token: expiredToken,
      secretKey: qrSecret,
      maxAgeSeconds: 3600,
    });
    assert.strictEqual(expiredQr.valid, false);
    assert.ok(expiredQr.error?.includes("expired"));
  });

  console.log("\n─── 2. Redis Reservation & Cart Hold Engine ────────────────────");

  const redis = new InMemoryRedisClient();

  await test("Seed Product Stock & Create Cart Hold with 600s TTL", async () => {
    const productId = "prod_001";
    await seedProductStock(productId, 5, redis);

    const holdResult = await createCartHold(
      {
        productId,
        userId: "user_alice",
        qty: 2,
        sku: "FC-BLT-K1-001",
        ttlSeconds: 600,
      },
      redis
    );

    assert.strictEqual(holdResult.success, true);
    assert.ok(holdResult.hold?.holdId);
    assert.strictEqual(holdResult.hold?.qty, 2);
    assert.strictEqual(holdResult.hold?.state, "ACTIVE_HOLD");

    // Verify Redis key
    const rawHold = await redis.get(REDIS_KEYS.hold(holdResult.hold!.holdId));
    assert.ok(rawHold);
    const parsed = JSON.parse(rawHold!);
    assert.strictEqual(parsed.userId, "user_alice");

    // Verify stock lock
    const locked = await redis.get(REDIS_KEYS.stockLock(productId));
    assert.strictEqual(locked, "2");

    // Verify Stream Event
    const entries = redis.getStreamEntries(REDIS_KEYS.COMMERCE_STREAM);
    assert.ok(entries.length >= 1);
    const last = entries[entries.length - 1];
    assert.strictEqual(last.fields.event_type, "commerce.hold_created");
    assert.strictEqual(last.fields.product_id, "prod_001");
  });

  await test("Reject Hold when Stock Exceeded (Insufficient Stock)", async () => {
    const productId = "prod_001"; // Total 5, 2 already held
    const failResult = await createCartHold(
      {
        productId,
        userId: "user_bob",
        qty: 4, // 2 + 4 = 6 > 5
        sku: "FC-BLT-K1-001",
      },
      redis
    );

    assert.strictEqual(failResult.success, false);
    assert.strictEqual(failResult.code, "INSUFFICIENT_STOCK");
    assert.strictEqual(failResult.availableStock, 3);
  });

  await test("Refresh Cart Hold on Payment Retry (+300s TTL)", async () => {
    const productId = "prod_002";
    await seedProductStock(productId, 3, redis);

    const hold = await createCartHold(
      {
        productId,
        userId: "user_charlie",
        qty: 1,
      },
      redis
    );
    assert.strictEqual(hold.success, true);
    const holdId = hold.hold!.holdId;

    const refreshResult = await refreshCartHold(holdId, 300, "card_declined_retry", redis);
    assert.strictEqual(refreshResult.success, true);
    assert.strictEqual(refreshResult.hold?.state, "PAYMENT_RETRYING");
    assert.strictEqual(refreshResult.hold?.retryCount, 1);

    // Verify stream event
    const entries = redis.getStreamEntries(REDIS_KEYS.COMMERCE_STREAM);
    const last = entries[entries.length - 1];
    assert.strictEqual(last.fields.event_type, "commerce.payment_failed");
    assert.strictEqual(last.fields.retry_count, "1");
  });

  await test("Release Cart Hold & Return Units to Pool", async () => {
    const productId = "prod_005";
    await seedProductStock(productId, 10, redis);

    const hold = await createCartHold(
      {
        productId,
        userId: "user_david",
        qty: 3,
      },
      redis
    );
    const holdId = hold.hold!.holdId;

    // Check locked units = 3
    assert.strictEqual(await redis.get(REDIS_KEYS.stockLock(productId)), "3");

    // Release hold
    const release = await releaseCartHold(holdId, "user_cancelled", redis);
    assert.strictEqual(release.success, true);
    assert.strictEqual(release.releasedHold?.state, "EXPIRED_RELEASE");

    // Locked units should now be 0
    assert.strictEqual(await redis.get(REDIS_KEYS.stockLock(productId)), "0");

    // Hold key should be deleted
    assert.strictEqual(await redis.get(REDIS_KEYS.hold(holdId)), null);

    // Verify release stream event
    const entries = redis.getStreamEntries(REDIS_KEYS.COMMERCE_STREAM);
    const last = entries[entries.length - 1];
    assert.strictEqual(last.fields.event_type, "commerce.reservation_released");
    assert.strictEqual(last.fields.reason, "user_cancelled");
  });

  await test("Fulfill Cart Hold (Permanent Stock Deduction)", async () => {
    const productId = "prod_006";
    await seedProductStock(productId, 10, redis);

    const hold = await createCartHold(
      {
        productId,
        userId: "user_eve",
        qty: 2,
        sku: "FC-MTL-BKL-RNCH-022",
      },
      redis
    );
    const holdId = hold.hold!.holdId;

    const fulfillment = await fulfillCartHold(
      {
        holdId,
        orderId: "ord_9999",
        totalCents: 19000,
        txHash: "0xabc123456789",
        chipUid: "04:A3:F2:11:8E:2C:80",
      },
      redis
    );

    assert.strictEqual(fulfillment.success, true);
    assert.strictEqual(fulfillment.hold?.state, "FULFILLED");
    assert.strictEqual(fulfillment.fulfillment?.orderId, "ord_9999");

    // Total stock should now be decremented from 10 -> 8
    assert.strictEqual(await redis.get(REDIS_KEYS.productStock(productId)), "8");
    // Lock pool should now be 0
    assert.strictEqual(await redis.get(REDIS_KEYS.stockLock(productId)), "0");

    // Stream event commerce.fulfilled
    const entries = redis.getStreamEntries(REDIS_KEYS.COMMERCE_STREAM);
    const last = entries[entries.length - 1];
    assert.strictEqual(last.fields.event_type, "commerce.fulfilled");
    assert.strictEqual(last.fields.order_id, "ord_9999");

    // Test getCartHold inspection
    const inspectHold = await getCartHold(holdId, redis);
    assert.strictEqual(inspectHold.hold, null); // was deleted on fulfillment
  });

  console.log("\n─── 3. Redis Stream Event Topics Schema Definitions ─────────────");

  await test("Validate Catalog Stream Events (Restock & Product Updated)", () => {
    const restockEvent: MakerverseStreamEvent = {
      event_id: "evt_001",
      event_type: "catalog.restock",
      product_id: "prod_001",
      sku: "FC-BLT-K1-001",
      quantity_added: 12,
      new_total_stock: 24,
      vendor_id: "vendor_forge_01",
      timestamp: new Date().toISOString(),
    };

    const parsed = CatalogRestockPayloadSchema.parse(restockEvent);
    assert.strictEqual(parsed.event_type, "catalog.restock");

    const updatedEvent: MakerverseStreamEvent = {
      event_id: "evt_001b",
      event_type: "catalog.product_updated",
      product_id: "prod_001",
      sku: "FC-BLT-K1-001",
      title: "Blackened Copper Keyring — Gen 2",
      price_cents: 5200,
      royalty_bps: 750,
      chip_tier: "NTAG424_DNA",
      status: "IN_STOCK",
      updated_at: new Date().toISOString(),
    };
    const parsedUpdated = CatalogProductUpdatedPayloadSchema.parse(updatedEvent);
    assert.strictEqual(parsedUpdated.event_type, "catalog.product_updated");

    const serialized = serializeStreamEvent(restockEvent);
    assert.strictEqual(serialized.event_type, "catalog.restock");
    assert.strictEqual(serialized.quantity_added, "12");

    const deserialized = parseStreamEvent(REDIS_STREAMS.CATALOG, serialized);
    assert.strictEqual(deserialized.event_type, "catalog.restock");
  });

  await test("Validate Commerce Stream Events (Hold Created, Payment Failed, Released, Fulfilled)", () => {
    const holdEvent: MakerverseStreamEvent = {
      event_id: "evt_002",
      event_type: "commerce.hold_created",
      hold_id: "hold_1234",
      product_id: "prod_002",
      user_id: "user_888",
      qty: 1,
      expires_at: Date.now() + 600000,
      created_at: Date.now(),
    };
    const parsedHold = CommerceHoldCreatedPayloadSchema.parse(holdEvent);
    assert.strictEqual(parsedHold.event_type, "commerce.hold_created");

    const paymentFailedEvent: MakerverseStreamEvent = {
      event_id: "evt_002b",
      event_type: "commerce.payment_failed",
      hold_id: "hold_1234",
      product_id: "prod_002",
      user_id: "user_888",
      reason: "insufficient_funds",
      retry_count: 2,
      timestamp: Date.now(),
    };
    const parsedPaymentFailed = CommercePaymentFailedPayloadSchema.parse(paymentFailedEvent);
    assert.strictEqual(parsedPaymentFailed.event_type, "commerce.payment_failed");

    const releasedEvent: MakerverseStreamEvent = {
      event_id: "evt_002c",
      event_type: "commerce.reservation_released",
      hold_id: "hold_1234",
      product_id: "prod_002",
      user_id: "user_888",
      qty: 1,
      reason: "user_cancelled",
      released_at: Date.now(),
    };
    const parsedReleased = CommerceReservationReleasedPayloadSchema.parse(releasedEvent);
    assert.strictEqual(parsedReleased.event_type, "commerce.reservation_released");

    const fulfilledEvent: MakerverseStreamEvent = {
      event_id: "evt_002d",
      event_type: "commerce.fulfilled",
      hold_id: "hold_1234",
      order_id: "ord_5555",
      product_id: "prod_002",
      sku: "FC-LTH-WLT-003",
      user_id: "user_888",
      qty: 1,
      total_cents: 11500,
      timestamp: Date.now(),
    };
    const parsedFulfilled = CommerceFulfilledPayloadSchema.parse(fulfilledEvent);
    assert.strictEqual(parsedFulfilled.event_type, "commerce.fulfilled");

    const serialized = serializeStreamEvent(holdEvent);
    const deserialized = parseStreamEvent(REDIS_STREAMS.COMMERCE, serialized);
    assert.strictEqual(deserialized.event_type, "commerce.hold_created");
  });

  await test("Validate Social Stream Events (Tagged & Demand Signaled)", () => {
    const taggedEvent: MakerverseStreamEvent = {
      event_id: "evt_003",
      event_type: "cozy.product_tagged",
      post_id: "post_001",
      product_id: "prod_001",
      tagger_user_id: "user_maker_01",
      coordinate_x: 45.5,
      coordinate_y: 60.2,
      timestamp: new Date().toISOString(),
    };
    const parsedTagged = CozyProductTaggedPayloadSchema.parse(taggedEvent);
    assert.strictEqual(parsedTagged.event_type, "cozy.product_tagged");

    const demandEvent: MakerverseStreamEvent = {
      event_id: "evt_003b",
      event_type: "cozy.demand_signaled",
      product_id: "prod_001",
      user_id: "user_buyer_02",
      signal_strength: 3,
      total_demand_count: 45,
      timestamp: new Date().toISOString(),
    };
    const parsedDemand = CozyDemandSignaledPayloadSchema.parse(demandEvent);
    assert.strictEqual(parsedDemand.event_type, "cozy.demand_signaled");

    const serialized = serializeStreamEvent(taggedEvent);
    const deserialized = parseStreamEvent(REDIS_STREAMS.SOCIAL, serialized);
    assert.strictEqual(deserialized.event_type, "cozy.product_tagged");
  });

  console.log("\n─── 4. Shared SDK Semantic Versioning & Governance Engine ─────────");

  await test("EcosystemVersion Parsing, Comparison Operators & Range Checks", () => {
    const v120 = EcosystemVersion.parse("v1.2.0");
    assert.strictEqual(v120.major, 1);
    assert.strictEqual(v120.minor, 2);
    assert.strictEqual(v120.revision, 0);
    assert.strictEqual(v120.toString(), "v1.2.0");
    assert.strictEqual(v120.format(false), "1.2.0");

    const v110 = EcosystemVersion.parse("1.1.0");
    const v200 = EcosystemVersion.parse("v2.0.0");

    // Precedence and comparison operators
    assert.ok(v120.greaterThan(v110));
    assert.ok(v110.lessThan(v120));
    assert.ok(v120.greaterThanOrEqual(v120));
    assert.ok(v200.greaterThan(v120));
    assert.ok(v120.equals(EcosystemVersion.parse("1.2.0")));

    // Range checks
    assert.ok(v120.satisfies("^1.0.0"));
    assert.ok(v120.satisfies("~1.2.0"));
    assert.ok(v120.satisfies(">=1.0.0 <2.0.0"));
    assert.ok(!v120.satisfies("^2.0.0"));
    assert.ok(!v120.satisfies("~1.1.0"));

    // Backward compatibility rules
    assert.ok(v120.isCompatibleWith("1.0.0"));
    assert.ok(v120.isCompatibleWith("1.2.0"));
    assert.ok(!v120.isCompatibleWith("1.3.0"));
    assert.ok(!v120.isCompatibleWith("2.0.0"));
  });

  await test("FeatureGateEngine SemVer Threshold & Constraint Evaluation", () => {
    const engine = new FeatureGateEngine("1.2.0");

    assert.ok(engine.supportsFeature("REDIS_STREAM_V2_ENVELOPE")); // min 1.0.0
    assert.ok(engine.supportsFeature("CART_EXPIRY_RECOVERY")); // min 1.1.0
    assert.ok(engine.supportsFeature("NFC_DYNAMIC_TAP_V2")); // min 1.2.0
    assert.ok(!engine.supportsFeature("SPATIAL_AR_TAGGING")); // min 1.3.0
    assert.ok(!engine.supportsFeature("BIOMETRIC_CHECKOUT")); // min 2.0.0

    // Dynamic client version update
    engine.setClientVersion("1.3.0");
    assert.ok(engine.supportsFeature("SPATIAL_AR_TAGGING"));
  });

  await test("Versioned Payload Guardrails & Stream Interceptor Rejection", () => {
    const payload = createVersionedPayload({ message: "hello" }, "1.2.0", { node: "edge-1" });
    assert.strictEqual(payload.version, "1.2.0");
    assert.strictEqual(payload.data.message, "hello");

    const parsed = parseVersionedPayload(payload);
    assert.strictEqual(parsed.version.toString(), "v1.2.0");

    const interceptor = createStreamVersionInterceptor({ sdkVersion: "1.2.0" });
    const passed = interceptor.intercept(payload);
    assert.strictEqual((passed.data as any).message, "hello");

    // Major breaking version jump rejection
    const breakingPayload = { version: "2.0.0", data: { breaking: true } };
    assert.throws(() => interceptor.intercept(breakingPayload), IncompatibleVersionError);
  });

  await test("Minimum Supported Version Handshake & Lifecycle Events", () => {
    const gatewayConfig = {
      gatewayVersion: "1.5.0",
      minSupportedVersion: "1.1.0",
      recommendedVersion: "1.4.0",
      deprecatedVersions: ["1.1.0"],
    };

    const resCompatible = validateClientVersion("1.4.0", gatewayConfig);
    assert.strictEqual(resCompatible.status, "compatible");

    const resRec = validateClientVersion("1.2.0", gatewayConfig);
    assert.strictEqual(resRec.status, "update_recommended");

    const resDep = validateClientVersion("1.1.0", gatewayConfig);
    assert.strictEqual(resDep.status, "deprecated");

    const resForce = validateClientVersion("1.0.0", gatewayConfig);
    assert.strictEqual(resForce.status, "force_update_required");
    assert.strictEqual(resForce.actionRequired, true);

    const emitter = new VersionLifecycleEventEmitter();
    let eventReceived = "";
    emitter.on(VERSION_LIFECYCLE_EVENTS.ON_FORCE_UPDATE_REQUIRED, (r) => {
      eventReceived = r.status;
    });
    emitter.executeHandshake("1.0.0", gatewayConfig);
    assert.strictEqual(eventReceived, "force_update_required");
  });

  console.log("\n==================================================================");
  console.log(`  ALL ${testsPassed} TESTS PASSED SUCCESSFULLY!`);
  console.log("==================================================================\n");
}

runAllTests();
