// lib/nfc/__tests__/cmac.test.ts
import { describe, it, expect } from "vitest";
import crypto from "crypto";
import {
  deriveAES128CMACSubkeys,
  computeAES128CMAC,
  decryptPICCData,
  deriveNTAG424SessionMACKey,
  normalizeUID,
  verifyNFCSignature,
  verifyStaticNFCTag,
  verifyQRToken,
  generateDynamicTapPayload,
} from "@/lib/nfc/cmac";

describe("NFC Cryptographic Verification Engine", () => {
  const TEST_MASTER_KEY_HEX = "00112233445566778899AABBCCDDEEFF";
  const TEST_MASTER_KEY_BUF = Buffer.from(TEST_MASTER_KEY_HEX, "hex");
  const TEST_UID = "04:A3:F2:11:8E:2C:80";
  const TEST_UID_RAW = "04A3F2118E2C80";

  describe("NIST SP 800-38B & RFC 4493 AES-128 CMAC Primitives", () => {
    it("derives valid 16-byte K1 and K2 subkeys for AES-128", () => {
      const { k1, k2 } = deriveAES128CMACSubkeys(TEST_MASTER_KEY_BUF);

      expect(k1).toBeInstanceOf(Buffer);
      expect(k2).toBeInstanceOf(Buffer);
      expect(k1.length).toBe(16);
      expect(k2.length).toBe(16);
      expect(k1.equals(k2)).toBe(false);
    });

    it("throws an error when subkey derivation key length is not 16 bytes", () => {
      const invalidKey = Buffer.alloc(10);
      expect(() => deriveAES128CMACSubkeys(invalidKey)).toThrowError(
        /AES-128 key must be exactly 16 bytes/
      );
    });

    it("computes CMAC on empty, single-block, and multi-block buffers deterministically", () => {
      const emptyBuf = Buffer.alloc(0);
      const cmacEmpty = computeAES128CMAC(TEST_MASTER_KEY_BUF, emptyBuf);
      expect(cmacEmpty.length).toBe(16);

      const exact16Buf = Buffer.from("1234567890123456", "utf-8");
      const cmacExact16 = computeAES128CMAC(TEST_MASTER_KEY_BUF, exact16Buf);
      expect(cmacExact16.length).toBe(16);

      const partialBuf = Buffer.from("short payload", "utf-8");
      const cmacPartial = computeAES128CMAC(TEST_MASTER_KEY_BUF, partialBuf);
      expect(cmacPartial.length).toBe(16);

      const multiBlockBuf = Buffer.from(
        "A long payload that clearly spans across multiple 16-byte cipher blocks for verification",
        "utf-8"
      );
      const cmacMulti = computeAES128CMAC(TEST_MASTER_KEY_BUF, multiBlockBuf);
      expect(cmacMulti.length).toBe(16);

      // Determinism
      const cmacMulti2 = computeAES128CMAC(TEST_MASTER_KEY_BUF, multiBlockBuf);
      expect(cmacMulti.equals(cmacMulti2)).toBe(true);
    });

    it("throws error when computeAES128CMAC receives non-16-byte key", () => {
      expect(() => computeAES128CMAC(Buffer.alloc(8), Buffer.alloc(4))).toThrowError(
        /CMAC key must be 16 bytes/
      );
    });
  });

  describe("NXP AN12196 PICC Decryption & Session Key Derivation", () => {
    it("decrypts encrypted PICCData and extracts 7-byte UID and 24-bit counter", () => {
      const tapCounter = 42;
      const { piccData } = generateDynamicTapPayload({
        uid: TEST_UID_RAW,
        tapCounter,
        secretKey: TEST_MASTER_KEY_HEX,
        header: 0xc7,
      });

      const decrypted = decryptPICCData(piccData, TEST_MASTER_KEY_HEX);
      expect(decrypted.header).toBe(0xc7);
      expect(decrypted.uid).toBe(TEST_UID);
      expect(decrypted.tapCounter).toBe(42);
      expect(decrypted.rawUid.length).toBe(7);
      expect(decrypted.decryptedBuffer.length).toBe(16);
    });

    it("throws when PICC data or key buffer is too short", () => {
      expect(() => decryptPICCData("010203", TEST_MASTER_KEY_HEX)).toThrowError(
        /PICCData must be at least 16 bytes/
      );
      expect(() =>
        decryptPICCData(Buffer.alloc(16), Buffer.alloc(10))
      ).toThrowError(/PICC decryption key must be 16 bytes/);
    });

    it("derives dynamic session MAC key using SV2 vector", () => {
      const rawUid = Buffer.from(TEST_UID_RAW, "hex");
      const sessionKey = deriveNTAG424SessionMACKey(TEST_MASTER_KEY_BUF, rawUid, 100);

      expect(sessionKey).toBeInstanceOf(Buffer);
      expect(sessionKey.length).toBe(16);
      expect(sessionKey.equals(TEST_MASTER_KEY_BUF)).toBe(false);

      // Changing counter produces different session key
      const sessionKey2 = deriveNTAG424SessionMACKey(TEST_MASTER_KEY_BUF, rawUid, 101);
      expect(sessionKey.equals(sessionKey2)).toBe(false);
    });
  });

  describe("UID Normalization", () => {
    it("normalizes diverse UID string formats into standard colon-separated uppercase", () => {
      expect(normalizeUID("04a3f2118e2c80")).toBe("04:A3:F2:11:8E:2C:80");
      expect(normalizeUID("04-A3-F2-11-8E-2C-80")).toBe("04:A3:F2:11:8E:2C:80");
      expect(normalizeUID("04:A3:F2:11:8E:2C:80")).toBe("04:A3:F2:11:8E:2C:80");
    });
  });

  describe("NTAG424 DNA Dynamic Tap Verification (verifyNFCSignature)", () => {
    it("successfully verifies valid dynamic tap with 8-byte truncated CMAC", () => {
      const tapCounter = 15;
      const { piccData, cmacTruncated8 } = generateDynamicTapPayload({
        uid: TEST_UID_RAW,
        tapCounter,
        secretKey: TEST_MASTER_KEY_HEX,
      });

      const result = verifyNFCSignature({
        piccData,
        cmac: cmacTruncated8,
        secretKey: TEST_MASTER_KEY_HEX,
        expectedCounter: 10,
      });

      expect(result.valid).toBe(true);
      expect(result.tier).toBe("NTAG424_DNA");
      expect(result.uid).toBe(TEST_UID);
      expect(result.tapCounter).toBe(15);
      expect(result.metadata?.cmacMatch).toBe(true);
      expect(result.metadata?.counterValid).toBe(true);
      expect(result.metadata?.uidMatch).toBe(true);
      expect(result.metadata?.decryptedHeader).toBe(0xc7);
    });

    it("successfully verifies valid dynamic tap with 16-byte full CMAC", () => {
      const tapCounter = 200;
      const { piccData, cmac } = generateDynamicTapPayload({
        uid: TEST_UID_RAW,
        tapCounter,
        secretKey: TEST_MASTER_KEY_HEX,
      });

      const result = verifyNFCSignature({
        uid: TEST_UID,
        piccData,
        cmac,
        secretKey: TEST_MASTER_KEY_HEX,
        expectedCounter: 199,
      });

      expect(result.valid).toBe(true);
      expect(result.uid).toBe(TEST_UID);
      expect(result.tapCounter).toBe(200);
    });

    it("rejects altered signatures with invalid CMAC", () => {
      const tapCounter = 50;
      const { piccData } = generateDynamicTapPayload({
        uid: TEST_UID_RAW,
        tapCounter,
        secretKey: TEST_MASTER_KEY_HEX,
      });

      const corruptedCmac = "DEADBEEFCAFE0011";

      const result = verifyNFCSignature({
        piccData,
        cmac: corruptedCmac,
        secretKey: TEST_MASTER_KEY_HEX,
        expectedCounter: 40,
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Cryptographic signature validation failed: invalid CMAC");
      expect(result.metadata?.cmacMatch).toBe(false);
    });

    it("rejects replay attacks when tap counter is not strictly greater than expectedCounter", () => {
      const tapCounter = 10;
      const { piccData, cmacTruncated8 } = generateDynamicTapPayload({
        uid: TEST_UID_RAW,
        tapCounter,
        secretKey: TEST_MASTER_KEY_HEX,
      });

      // Case 1: Exact duplicate counter (replay)
      const duplicateResult = verifyNFCSignature({
        piccData,
        cmac: cmacTruncated8,
        secretKey: TEST_MASTER_KEY_HEX,
        expectedCounter: 10,
      });

      expect(duplicateResult.valid).toBe(false);
      expect(duplicateResult.error).toContain("Replay attack detected: tap counter 10 is not greater than recorded counter 10");
      expect(duplicateResult.metadata?.counterValid).toBe(false);

      // Case 2: Decremented / older counter
      const decrementedResult = verifyNFCSignature({
        piccData,
        cmac: cmacTruncated8,
        secretKey: TEST_MASTER_KEY_HEX,
        expectedCounter: 15,
      });

      expect(decrementedResult.valid).toBe(false);
      expect(decrementedResult.error).toContain("Replay attack detected: tap counter 10 is not greater than recorded counter 15");
    });

    it("rejects when decrypted UID does not match expected UID parameter", () => {
      const tapCounter = 5;
      const { piccData, cmacTruncated8 } = generateDynamicTapPayload({
        uid: TEST_UID_RAW,
        tapCounter,
        secretKey: TEST_MASTER_KEY_HEX,
      });

      const mismatchResult = verifyNFCSignature({
        uid: "04:FF:EE:DD:CC:BB:AA",
        piccData,
        cmac: cmacTruncated8,
        secretKey: TEST_MASTER_KEY_HEX,
        expectedCounter: 0,
      });

      expect(mismatchResult.valid).toBe(false);
      expect(mismatchResult.error).toContain("UID mismatch");
      expect(mismatchResult.metadata?.uidMatch).toBe(false);
    });

    it("rejects invalid secret key lengths and invalid CMAC lengths", () => {
      const keyResult = verifyNFCSignature({
        piccData: Buffer.alloc(16),
        cmac: Buffer.alloc(8),
        secretKey: "001122", // only 3 bytes
      });
      expect(keyResult.valid).toBe(false);
      expect(keyResult.error).toContain("Invalid secret key length");

      const cmacResult = verifyNFCSignature({
        piccData: Buffer.alloc(16),
        cmac: Buffer.alloc(5), // invalid length
        secretKey: TEST_MASTER_KEY_HEX,
      });
      expect(cmacResult.valid).toBe(false);
      expect(cmacResult.error).toContain("Invalid CMAC length");
    });

    it("handles corrupted PICC vectors and unexpected exceptions cleanly", () => {
      const corruptResult = verifyNFCSignature({
        piccData: "NOT_HEX_DATA_AT_ALL_ZZZZZ",
        cmac: "0011223344556677",
        secretKey: TEST_MASTER_KEY_HEX,
      });
      expect(corruptResult.valid).toBe(false);
      expect(corruptResult.error).toBeDefined();
    });
  });

  describe("Static NFC Fallbacks (NTAG213 / NTAG215)", () => {
    it("validates legitimate NXP static tags with 04 prefix and locked bits", () => {
      const result = verifyStaticNFCTag({
        uid: "04:C9:D0:33:1F:5B:A2",
        tier: "NTAG215_SERIALIZED",
        lockBitsVerified: true,
        expectedSku: "FC-LTH-WLT-003",
        registeredSku: "FC-LTH-WLT-003",
      });

      expect(result.valid).toBe(true);
      expect(result.tier).toBe("NTAG215_SERIALIZED");
      expect(result.metadata?.manufacturerPrefixValid).toBe(true);
      expect(result.metadata?.lockBitsVerified).toBe(true);
      expect(result.metadata?.skuMatch).toBe(true);
    });

    it("rejects non-7-byte static UIDs", () => {
      const result = verifyStaticNFCTag({
        uid: "04:C9:D0:33:1F",
        tier: "NTAG213_SERIALIZED",
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid static NFC UID: expected 7 bytes");
    });

    it("rejects static tags from untrusted non-NXP manufacturers", () => {
      const result = verifyStaticNFCTag({
        uid: "E0:C9:D0:33:1F:5B:A2",
        tier: "NTAG213_SERIALIZED",
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Untrusted manufacturer");
      expect(result.metadata?.manufacturerPrefixValid).toBe(false);
    });

    it("rejects static chips with unlocked bits", () => {
      const result = verifyStaticNFCTag({
        uid: "04:C9:D0:33:1F:5B:A2",
        tier: "NTAG213_SERIALIZED",
        lockBitsVerified: false,
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Chip is unlocked");
      expect(result.metadata?.lockBitsVerified).toBe(false);
    });

    it("rejects static chips with SKU registry mismatch", () => {
      const result = verifyStaticNFCTag({
        uid: "04:C9:D0:33:1F:5B:A2",
        tier: "NTAG215_SERIALIZED",
        lockBitsVerified: true,
        expectedSku: "FC-BLT-K1-001",
        registeredSku: "FC-LTH-WLT-003",
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain("SKU mismatch");
      expect(result.metadata?.skuMatch).toBe(false);
    });
  });

  describe("QR Registry Token Verification (verifyQRToken)", () => {
    const QR_SECRET = "makerverse_qr_hmac_secret_key_123";

    function createTestQRToken(payloadObj: Record<string, unknown>, secret = QR_SECRET): string {
      const b64 = Buffer.from(JSON.stringify(payloadObj), "utf-8").toString("base64url");
      const sig = crypto.createHmac("sha256", secret).update(b64).digest("hex");
      return `mv_qr_${b64}.${sig}`;
    }

    it("validates valid signed QR tokens and parses payload", () => {
      const payload = {
        productId: "prod_001",
        sku: "FC-BLT-K1-001",
        nonce: "nonce_abc123",
        issuedAt: Date.now(),
      };

      const token = createTestQRToken(payload);
      const result = verifyQRToken({ token, secretKey: QR_SECRET });

      expect(result.valid).toBe(true);
      expect(result.tier).toBe("QR_REGISTRY");
      expect(result.payload?.sku).toBe("FC-BLT-K1-001");
      expect(result.payload?.nonce).toBe("nonce_abc123");
    });

    it("rejects tokens missing mv_qr_ prefix or separator", () => {
      expect(verifyQRToken({ token: "invalid_prefix", secretKey: QR_SECRET }).valid).toBe(false);
      expect(verifyQRToken({ token: "mv_qr_payloadWithoutDot", secretKey: QR_SECRET }).valid).toBe(false);
    });

    it("rejects tampered QR payloads or signatures", () => {
      const token = createTestQRToken({ productId: "prod_001", sku: "FC-BLT-K1-001" });
      const tampered = token.slice(0, -4) + "0000";

      const result = verifyQRToken({ token: tampered, secretKey: QR_SECRET });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid QR cryptographic signature");
    });

    it("rejects expired dynamic QR tokens", () => {
      const expiredPayload = {
        productId: "prod_001",
        sku: "FC-BLT-K1-001",
        nonce: "nonce_exp",
        issuedAt: Date.now() - 5000 * 1000, // 5000s ago
      };

      const token = createTestQRToken(expiredPayload);
      const result = verifyQRToken({ token, secretKey: QR_SECRET, maxAgeSeconds: 3600 });

      expect(result.valid).toBe(false);
      expect(result.error).toContain("QR token has expired");
    });

    it("prevents replay attacks via consumed usedNonces set", () => {
      const usedNonces = new Set<string>(["consumed_nonce_1"]);
      const token = createTestQRToken({
        productId: "prod_001",
        sku: "FC-BLT-K1-001",
        nonce: "consumed_nonce_1",
        issuedAt: Date.now(),
      });

      const result = verifyQRToken({ token, secretKey: QR_SECRET, usedNonces });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("QR token replay detected");
    });
  });
});
