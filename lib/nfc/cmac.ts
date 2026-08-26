// lib/nfc/cmac.ts
/**
 * Makerverse NFC Cryptographic CMAC Verification Engine
 * 
 * Implements cryptographic authentication for physical-to-digital provenance:
 * 1. NTAG424 DNA: Dynamic Secure Unique NFC (SUN) / Secure Dynamic Messaging (SDM)
 *    - NIST SP 800-38B / RFC 4493 AES-128-CMAC verification
 *    - AES-128 PICCData decryption (UID + 24-bit SDM Read Counter)
 *    - Session Key Derivation (NXP AN12196 / EV2 standard)
 *    - Replay-attack prevention via strictly monotonic tap counter validation
 *    - Constant-time MAC comparison (timing-attack protection)
 * 2. Static Fallbacks:
 *    - NTAG213 / NTAG215 serialization, NXP manufacturer prefix checks & lock-bits verification
 *    - QR Registry HMAC-SHA256 signed token validation with nonce tracking
 */

import crypto from "crypto";
import { type ChipTier } from "@/lib/types/events";

// ─── NIST SP 800-38B AES-128 CMAC Primitives ───────────────────────────────────

const CONSTANT_RB = 0x87; // Constant for 128-bit block size in NIST SP 800-38B

/**
 * Performs a 128-bit left shift by 1 bit on a 16-byte Buffer.
 * Returns the carry bit of the most significant bit (0 or 1).
 */
function leftShift128(input: Buffer): { shifted: Buffer; msb: number } {
  const output = Buffer.alloc(16);
  let carry = 0;

  for (let i = 15; i >= 0; i--) {
    const byte = input[i];
    output[i] = ((byte << 1) & 0xff) | carry;
    carry = (byte & 0x80) !== 0 ? 1 : 0;
  }

  return { shifted: output, msb: (input[0] & 0x80) !== 0 ? 1 : 0 };
}

/**
 * Derives subkeys K1 and K2 from an AES-128 master key according to RFC 4493.
 * 
 * Algorithm:
 *  1. L = AES-128(K, 0^128)
 *  2. If MSB(L) == 0 then K1 = (L << 1) else K1 = (L << 1) XOR Rb
 *  3. If MSB(K1) == 0 then K2 = (K1 << 1) else K2 = (K1 << 1) XOR Rb
 */
export function deriveAES128CMACSubkeys(key: Buffer): { k1: Buffer; k2: Buffer } {
  if (key.length !== 16) {
    throw new Error(`AES-128 key must be exactly 16 bytes (received ${key.length} bytes)`);
  }

  // L = AES-128(key, 0^128)
  const cipher = crypto.createCipheriv("aes-128-ecb", key, null);
  cipher.setAutoPadding(false);
  const zeroBlock = Buffer.alloc(16, 0);
  const L = cipher.update(zeroBlock);
  cipher.final();

  // Derive K1
  const { shifted: shiftedL, msb: msbL } = leftShift128(L);
  const k1 = Buffer.from(shiftedL);
  if (msbL === 1) {
    k1[15] ^= CONSTANT_RB;
  }

  // Derive K2
  const { shifted: shiftedK1, msb: msbK1 } = leftShift128(k1);
  const k2 = Buffer.from(shiftedK1);
  if (msbK1 === 1) {
    k2[15] ^= CONSTANT_RB;
  }

  return { k1, k2 };
}

/**
 * Computes a 16-byte AES-128 CMAC over arbitrary input data using NIST SP 800-38B.
 *
 * @param key 16-byte AES-128 key Buffer
 * @param data Input payload Buffer
 * @returns 16-byte Buffer containing the full CMAC
 */
export function computeAES128CMAC(key: Buffer, data: Buffer): Buffer {
  if (key.length !== 16) {
    throw new Error(`CMAC key must be 16 bytes (got ${key.length})`);
  }

  const { k1, k2 } = deriveAES128CMACSubkeys(key);
  const blockSize = 16;
  const n = data.length === 0 ? 1 : Math.ceil(data.length / blockSize);
  const isComplete = data.length > 0 && data.length % blockSize === 0;

  // Format last block with appropriate subkey and padding
  const lastBlock = Buffer.alloc(blockSize);
  if (isComplete) {
    const start = (n - 1) * blockSize;
    const slice = data.subarray(start, start + blockSize);
    for (let i = 0; i < blockSize; i++) {
      lastBlock[i] = slice[i] ^ k1[i];
    }
  } else {
    const start = (n - 1) * blockSize;
    const slice = data.subarray(start);
    slice.copy(lastBlock, 0);
    // 10* padding: append 0x80 followed by 0x00s
    lastBlock[slice.length] = 0x80;
    for (let i = slice.length + 1; i < blockSize; i++) {
      lastBlock[i] = 0x00;
    }
    for (let i = 0; i < blockSize; i++) {
      lastBlock[i] ^= k2[i];
    }
  }

  // CBC-MAC chain
  let state = Buffer.alloc(blockSize, 0);
  for (let i = 0; i < n - 1; i++) {
    const block = data.subarray(i * blockSize, (i + 1) * blockSize);
    for (let j = 0; j < blockSize; j++) {
      state[j] ^= block[j];
    }
    const cipher = crypto.createCipheriv("aes-128-ecb", key, null);
    cipher.setAutoPadding(false);
    state = cipher.update(state);
    cipher.final();
  }

  // Process last block
  for (let j = 0; j < blockSize; j++) {
    state[j] ^= lastBlock[j];
  }
  const finalCipher = crypto.createCipheriv("aes-128-ecb", key, null);
  finalCipher.setAutoPadding(false);
  const cmac = finalCipher.update(state);
  finalCipher.final();

  return cmac;
}

// ─── NTAG424 DNA Session Key & PICC Data Decryption (NXP AN12196) ──────────────

/**
 * Decrypts 16-byte encrypted PICCData block from NTAG424 DNA dynamic tap.
 * 
 * NXP AN12196 Specification:
 * - Cipher: AES-128-CBC with IV = 0^128 (or AES-128-ECB for 1 block)
 * - Decrypted Structure (16 bytes):
 *   - Byte 0      : Header / Mirror Flag (e.g., 0xC7 indicates UID + Read Counter mirrored)
 *   - Bytes 1..7  : 7-byte Chip UID (e.g. 04:A3:F2:11:8E:2C:80)
 *   - Bytes 8..10 : 3-byte SDM Read Counter (24-bit little endian)
 *   - Bytes 11..15: 5 bytes padding (0x00s)
 */
export function decryptPICCData(
  piccData: Buffer | string,
  key: Buffer | string
): {
  header: number;
  uid: string;
  rawUid: Buffer;
  tapCounter: number;
  decryptedBuffer: Buffer;
} {
  const piccBuf = typeof piccData === "string" ? Buffer.from(piccData, "hex") : piccData;
  const keyBuf = typeof key === "string" ? Buffer.from(key, "hex") : key;

  if (piccBuf.length < 16) {
    throw new Error(`PICCData must be at least 16 bytes (received ${piccBuf.length} bytes)`);
  }
  if (keyBuf.length !== 16) {
    throw new Error(`PICC decryption key must be 16 bytes (received ${keyBuf.length} bytes)`);
  }

  // Decrypt first 16-byte block with AES-128-ECB / CBC IV=0
  const decipher = crypto.createDecipheriv("aes-128-ecb", keyBuf, null);
  decipher.setAutoPadding(false);
  const decrypted = decipher.update(piccBuf.subarray(0, 16));
  decipher.final();

  const header = decrypted[0];
  const rawUid = decrypted.subarray(1, 8);
  const uid = Array.from(rawUid)
    .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
    .join(":");

  // Read counter is 3 bytes, little-endian (24-bit unsigned integer)
  const tapCounter = decrypted[8] | (decrypted[9] << 8) | (decrypted[10] << 16);

  return {
    header,
    uid,
    rawUid,
    tapCounter,
    decryptedBuffer: decrypted,
  };
}

/**
 * Derives the NTAG424 DNA Session MAC Key (K_SesSDMMAC) according to NXP AN12196.
 * 
 * Derivation Vector SV2 (16 bytes):
 *   SV2 = [0x3C, 0xC3, 0x00, 0x01, 0x00, 0x80, UID[0..6], SDMReadCtr[0..2], 0x00, 0x00]
 *   K_SesSDMMAC = AES-128-ECB(SecretKey, SV2)
 */
export function deriveNTAG424SessionMACKey(
  secretKey: Buffer,
  rawUid: Buffer,
  tapCounter: number
): Buffer {
  const sv2 = Buffer.alloc(16, 0);
  sv2[0] = 0x3c;
  sv2[1] = 0xc3;
  sv2[2] = 0x00;
  sv2[3] = 0x01;
  sv2[4] = 0x00;
  sv2[5] = 0x80;

  // Copy 7-byte UID
  rawUid.copy(sv2, 6, 0, Math.min(7, rawUid.length));

  // Copy 3-byte SDM Read Counter (little-endian)
  sv2[13] = tapCounter & 0xff;
  sv2[14] = (tapCounter >> 8) & 0xff;
  sv2[15] = (tapCounter >> 16) & 0xff;

  // Encrypt SV2 with SecretKey to derive session key
  const cipher = crypto.createCipheriv("aes-128-ecb", secretKey, null);
  cipher.setAutoPadding(false);
  const sessionKey = cipher.update(sv2);
  cipher.final();

  return sessionKey;
}

// ─── Verification Interfaces & Engine ──────────────────────────────────────────

export interface NFCVerificationParams {
  /** Expected or claimed 7-byte UID (format: "04:A3:F2:11:8E:2C:80" or raw hex "04A3F2118E2C80") */
  uid?: string;
  /** Encrypted PICCData hex string (32 chars) or Buffer */
  piccData: string | Buffer;
  /** Dynamic CMAC received in tap URL (16 hex chars / 8 bytes truncated, or 32 hex chars / 16 bytes) */
  cmac: string | Buffer;
  /** Master AES-128 secret key assigned to this tag batch (32 hex chars or 16-byte Buffer) */
  secretKey: string | Buffer;
  /** Last known counter recorded in database. If provided, decrypted counter MUST be strictly greater */
  expectedCounter?: number;
  /** Optional dynamic mirrored file data payload included under CMAC calculation */
  fileData?: string | Buffer;
}

export interface NFCVerificationResult {
  /** True if cryptographic CMAC matches and counter exceeds replay threshold */
  valid: boolean;
  /** Decrypted physical tap counter (guaranteed strictly monotonic) */
  tapCounter?: number;
  /** Verified 7-byte manufacturer UID in standard colon-separated format */
  uid?: string;
  /** Error code / diagnostic message if verification failed */
  error?: string;
  /** Hardware chip tier */
  tier: ChipTier;
  /** Additional diagnostic metadata */
  metadata?: {
    cmacMatch: boolean;
    counterValid: boolean;
    uidMatch: boolean;
    decryptedHeader?: number;
  };
}

/**
 * Standardizes a UID string into uppercase colon-delimited format (`04:A3:F2:11:8E:2C:80`).
 */
export function normalizeUID(uid: string): string {
  const clean = uid.replace(/[^0-9a-fA-F]/g, "").toUpperCase();
  const pairs: string[] = [];
  for (let i = 0; i < clean.length; i += 2) {
    pairs.push(clean.substring(i, i + 2));
  }
  return pairs.join(":");
}

/**
 * Verifies an NTAG424 DNA Dynamic Tap Signature (SUN / SDM).
 * 
 * Execution Flow:
 *  1. Decrypts 16-byte PICC data vector using master secretKey to extract UID and tap counter.
 *  2. Cross-checks decrypted UID against expected UID if provided.
 *  3. Validates that the decrypted tap counter > `expectedCounter` to prevent replay attacks.
 *  4. Derives the dynamic session MAC key (K_SesSDMMAC) using NXP AN12196 EV2 vector SV2.
 *  5. Recomputes the AES-128 CMAC over dynamic counter / file payload.
 *  6. Performs constant-time comparison against received CMAC (supports 8-byte truncated & full 16-byte).
 */
export function verifyNFCSignature(params: NFCVerificationParams): NFCVerificationResult {
  const {
    uid: expectedUid,
    piccData,
    cmac,
    secretKey,
    expectedCounter = -1,
    fileData = Buffer.alloc(0),
  } = params;

  try {
    const keyBuf = typeof secretKey === "string" ? Buffer.from(secretKey.replace(/[^0-9a-fA-F]/g, ""), "hex") : secretKey;
    const receivedCmacBuf = typeof cmac === "string" ? Buffer.from(cmac.replace(/[^0-9a-fA-F]/g, ""), "hex") : cmac;
    const fileDataBuf = typeof fileData === "string" ? Buffer.from(fileData, "utf-8") : fileData;

    if (keyBuf.length !== 16) {
      return {
        valid: false,
        tier: "NTAG424_DNA",
        error: `Invalid secret key length: expected 16 bytes (32 hex chars), got ${keyBuf.length}`,
      };
    }

    if (receivedCmacBuf.length !== 8 && receivedCmacBuf.length !== 16) {
      return {
        valid: false,
        tier: "NTAG424_DNA",
        error: `Invalid CMAC length: expected 8 or 16 bytes, got ${receivedCmacBuf.length}`,
      };
    }

    // Step 1: Decrypt PICCData vector
    const { header, uid: decryptedUid, rawUid, tapCounter } = decryptPICCData(piccData, keyBuf);

    // Step 2: Validate UID if expectedUid was provided
    let uidMatch = true;
    if (expectedUid) {
      const normalizedExpected = normalizeUID(expectedUid);
      const normalizedDecrypted = normalizeUID(decryptedUid);
      if (normalizedExpected !== normalizedDecrypted) {
        uidMatch = false;
        return {
          valid: false,
          tier: "NTAG424_DNA",
          uid: decryptedUid,
          tapCounter,
          error: `UID mismatch: expected ${normalizedExpected}, decrypted ${normalizedDecrypted}`,
          metadata: { cmacMatch: false, counterValid: true, uidMatch: false, decryptedHeader: header },
        };
      }
    }

    // Step 3: Prevent replay attacks via strictly monotonic tap counter
    const counterValid = tapCounter > expectedCounter;
    if (!counterValid) {
      return {
        valid: false,
        tier: "NTAG424_DNA",
        uid: decryptedUid,
        tapCounter,
        error: `Replay attack detected: tap counter ${tapCounter} is not greater than recorded counter ${expectedCounter}`,
        metadata: { cmacMatch: false, counterValid: false, uidMatch, decryptedHeader: header },
      };
    }

    // Step 4 & 5: Derive Session MAC Key & compute CMAC
    // Compute CMAC via standard NXP session key derivation
    const sessionMacKey = deriveNTAG424SessionMACKey(keyBuf, rawUid, tapCounter);
    
    // In NXP SUN, CMAC is computed over fileData (or dynamic ASCII payload if configured)
    const computedFullCmac = computeAES128CMAC(sessionMacKey, fileDataBuf);

    // NXP NTAG424 DNA default SDM outputs either:
    //  a) Truncated 8-byte CMAC (taking 8 odd bytes: [1, 3, 5, 7, 9, 11, 13, 15] or first 8 bytes)
    //  b) Full 16-byte CMAC
    //  c) Direct master-key CMAC over [rawUid + counter + fileData] in legacy mode
    let cmacMatch = false;

    // Check 1: Standard First 8 Bytes or Full 16 Bytes
    const computedTruncatedFirst8 = computedFullCmac.subarray(0, receivedCmacBuf.length);
    if (crypto.timingSafeEqual(computedTruncatedFirst8, receivedCmacBuf)) {
      cmacMatch = true;
    }

    // Check 2: Odd-byte truncation (NXP AN12196 Section 4.2: bytes 1, 3, 5, 7, 9, 11, 13, 15)
    if (!cmacMatch && receivedCmacBuf.length === 8) {
      const oddBytes = Buffer.from([
        computedFullCmac[1],
        computedFullCmac[3],
        computedFullCmac[5],
        computedFullCmac[7],
        computedFullCmac[9],
        computedFullCmac[11],
        computedFullCmac[13],
        computedFullCmac[15],
      ]);
      if (crypto.timingSafeEqual(oddBytes, receivedCmacBuf)) {
        cmacMatch = true;
      }
    }

    // Check 3: Master Key Direct CMAC fallback (e.g. CMAC(masterKey, rawUid || counter || fileData))
    if (!cmacMatch) {
      const directPayload = Buffer.concat([
        rawUid,
        Buffer.from([tapCounter & 0xff, (tapCounter >> 8) & 0xff, (tapCounter >> 16) & 0xff]),
        fileDataBuf,
      ]);
      const directCmac = computeAES128CMAC(keyBuf, directPayload);
      const directTrunc = directCmac.subarray(0, receivedCmacBuf.length);
      if (crypto.timingSafeEqual(directTrunc, receivedCmacBuf)) {
        cmacMatch = true;
      }
    }

    if (!cmacMatch) {
      return {
        valid: false,
        tier: "NTAG424_DNA",
        uid: decryptedUid,
        tapCounter,
        error: "Cryptographic signature validation failed: invalid CMAC",
        metadata: { cmacMatch: false, counterValid: true, uidMatch, decryptedHeader: header },
      };
    }

    return {
      valid: true,
      tier: "NTAG424_DNA",
      uid: decryptedUid,
      tapCounter,
      metadata: {
        cmacMatch: true,
        counterValid: true,
        uidMatch: true,
        decryptedHeader: header,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      valid: false,
      tier: "NTAG424_DNA",
      error: `NFC Verification Exception: ${message}`,
    };
  }
}

// ─── Static Fallback Verification (NTAG213 / NTAG215) ──────────────────────────

export interface StaticNFCTagParams {
  /** 7-byte chip UID (e.g., "04:C9:D0:33:1F:5B:A2") */
  uid: string;
  /** Chip tier */
  tier: "NTAG213_SERIALIZED" | "NTAG215_SERIALIZED";
  /** Whether the physical chip lock bits have been set to READ_ONLY */
  lockBitsVerified?: boolean;
  /** Optional manufacturer ECDSA signature bytes (if read from NTAG21x signature pages) */
  manufacturerSignature?: string;
  /** Expected SKU assigned in the vendor registry */
  expectedSku?: string;
  /** Registered SKU stored in the Makerverse batch registry */
  registeredSku?: string | null;
}

export interface StaticNFCTagResult {
  valid: boolean;
  tier: ChipTier;
  uid: string;
  error?: string;
  metadata?: {
    manufacturerPrefixValid: boolean;
    lockBitsVerified: boolean;
    skuMatch: boolean;
  };
}

/**
 * Validates static serialized NFC tags (NTAG213 / NTAG215).
 * 
 * Verifications:
 *  1. Checks 7-byte UID structure and NXP manufacturer prefix (first byte must be 0x04).
 *  2. Verifies lock bits are locked to prevent counterfeit re-writes.
 *  3. Verifies registered SKU against expected SKU in the Makerverse batch registry.
 */
export function verifyStaticNFCTag(params: StaticNFCTagParams): StaticNFCTagResult {
  const {
    uid,
    tier,
    lockBitsVerified = true,
    expectedSku,
    registeredSku,
  } = params;

  const normalized = normalizeUID(uid);
  const parts = normalized.split(":");

  // Check 1: 7-byte length
  if (parts.length !== 7) {
    return {
      valid: false,
      tier,
      uid: normalized,
      error: `Invalid static NFC UID: expected 7 bytes, got ${parts.length}`,
    };
  }

  // Check 2: NXP manufacturer code (0x04)
  const isNxp = parts[0] === "04";
  if (!isNxp) {
    return {
      valid: false,
      tier,
      uid: normalized,
      error: `Untrusted manufacturer: UID does not start with NXP identifier 04 (got ${parts[0]})`,
      metadata: { manufacturerPrefixValid: false, lockBitsVerified, skuMatch: false },
    };
  }

  // Check 3: Lock bits verification
  if (!lockBitsVerified) {
    return {
      valid: false,
      tier,
      uid: normalized,
      error: "Chip is unlocked: Lock bits must be configured to READ_ONLY for production provenance",
      metadata: { manufacturerPrefixValid: true, lockBitsVerified: false, skuMatch: false },
    };
  }

  // Check 4: SKU registry match if provided
  if (expectedSku && registeredSku && expectedSku !== registeredSku) {
    return {
      valid: false,
      tier,
      uid: normalized,
      error: `SKU mismatch: Chip registered to ${registeredSku}, but expected ${expectedSku}`,
      metadata: { manufacturerPrefixValid: true, lockBitsVerified: true, skuMatch: false },
    };
  }

  return {
    valid: true,
    tier,
    uid: normalized,
    metadata: {
      manufacturerPrefixValid: true,
      lockBitsVerified: true,
      skuMatch: true,
    },
  };
}

// ─── Static Fallback Verification (QR Code Registry) ──────────────────────────

export interface QRTokenVerificationParams {
  /** Signed token string in format "mv_qr_<payload_base64url>.<signature_hex>" */
  token: string;
  /** HMAC secret key configured on the Makerverse backend */
  secretKey: string;
  /** Maximum token age in seconds (default: 3600s / 1 hour for dynamic QR, 0 for lifetime) */
  maxAgeSeconds?: number;
  /** Set of already consumed nonces to prevent replay attacks on dynamic QR codes */
  usedNonces?: Set<string>;
}

export interface QRTokenPayload {
  productId: string;
  sku: string;
  nonce: string;
  issuedAt: number;
}

export interface QRTokenVerificationResult {
  valid: boolean;
  tier: "QR_REGISTRY";
  payload?: QRTokenPayload;
  error?: string;
}

/**
 * Validates HMAC-SHA256 signed QR Registry tokens for physical merchandise.
 * 
 * Token format: `mv_qr_<base64UrlPayload>.<hmacHex>`
 */
export function verifyQRToken(params: QRTokenVerificationParams): QRTokenVerificationResult {
  const { token, secretKey, maxAgeSeconds = 0, usedNonces } = params;

  try {
    if (!token.startsWith("mv_qr_")) {
      return {
        valid: false,
        tier: "QR_REGISTRY",
        error: "Invalid QR token format: missing 'mv_qr_' prefix",
      };
    }

    const content = token.slice(6);
    const lastDotIndex = content.lastIndexOf(".");
    if (lastDotIndex === -1) {
      return {
        valid: false,
        tier: "QR_REGISTRY",
        error: "Invalid QR token: missing signature separator",
      };
    }

    const payloadB64 = content.slice(0, lastDotIndex);
    const signatureHex = content.slice(lastDotIndex + 1);

    // Verify HMAC-SHA256
    const expectedSig = crypto
      .createHmac("sha256", secretKey)
      .update(payloadB64)
      .digest("hex");

    const sigBuf = Buffer.from(signatureHex, "hex");
    const expectedSigBuf = Buffer.from(expectedSig, "hex");

    if (sigBuf.length !== expectedSigBuf.length || !crypto.timingSafeEqual(sigBuf, expectedSigBuf)) {
      return {
        valid: false,
        tier: "QR_REGISTRY",
        error: "Invalid QR cryptographic signature",
      };
    }

    // Parse payload
    const decodedStr = Buffer.from(payloadB64, "base64url").toString("utf-8");
    const payload: QRTokenPayload = JSON.parse(decodedStr);

    // Check expiration if maxAgeSeconds is set
    if (maxAgeSeconds > 0) {
      const now = Date.now();
      const ageMs = now - payload.issuedAt;
      if (ageMs > maxAgeSeconds * 1000) {
        return {
          valid: false,
          tier: "QR_REGISTRY",
          error: `QR token has expired (age: ${Math.round(ageMs / 1000)}s, max: ${maxAgeSeconds}s)`,
        };
      }
    }

    // Check nonce replay
    if (usedNonces && usedNonces.has(payload.nonce)) {
      return {
        valid: false,
        tier: "QR_REGISTRY",
        error: `QR token replay detected: nonce ${payload.nonce} already consumed`,
      };
    }

    return {
      valid: true,
      tier: "QR_REGISTRY",
      payload,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      valid: false,
      tier: "QR_REGISTRY",
      error: `QR Verification Exception: ${message}`,
    };
  }
}

// ─── Encoding Helper for Simulating / Provisioning NTAG424 DNA Tags ───────────

/**
 * Test & Provisioning Utility:
 * Encrypts a PICCData block and generates a dynamic SUN tap payload mimicking an NTAG424 DNA chip.
 */
export function generateDynamicTapPayload(params: {
  uid: string;
  tapCounter: number;
  secretKey: Buffer | string;
  fileData?: Buffer | string;
  header?: number;
}): {
  piccData: string;
  cmac: string;
  cmacTruncated8: string;
} {
  const { uid, tapCounter, secretKey, fileData = Buffer.alloc(0), header = 0xc7 } = params;
  const keyBuf = typeof secretKey === "string" ? Buffer.from(secretKey.replace(/[^0-9a-fA-F]/g, ""), "hex") : secretKey;
  const fileDataBuf = typeof fileData === "string" ? Buffer.from(fileData, "utf-8") : fileData;

  const rawUid = Buffer.from(uid.replace(/[^0-9a-fA-F]/g, ""), "hex");
  if (rawUid.length !== 7) {
    throw new Error(`UID must be 7 bytes (got ${rawUid.length})`);
  }

  // Construct 16-byte plain PICC data
  const plainPicc = Buffer.alloc(16, 0);
  plainPicc[0] = header;
  rawUid.copy(plainPicc, 1, 0, 7);
  plainPicc[8] = tapCounter & 0xff;
  plainPicc[9] = (tapCounter >> 8) & 0xff;
  plainPicc[10] = (tapCounter >> 16) & 0xff;

  // Encrypt PICCData with AES-128-ECB
  const cipher = crypto.createCipheriv("aes-128-ecb", keyBuf, null);
  cipher.setAutoPadding(false);
  const encPicc = cipher.update(plainPicc);
  cipher.final();

  // Derive session key & compute CMAC
  const sessionKey = deriveNTAG424SessionMACKey(keyBuf, rawUid, tapCounter);
  const fullCmac = computeAES128CMAC(sessionKey, fileDataBuf);

  return {
    piccData: encPicc.toString("hex").toUpperCase(),
    cmac: fullCmac.toString("hex").toUpperCase(),
    cmacTruncated8: fullCmac.subarray(0, 8).toString("hex").toUpperCase(),
  };
}
