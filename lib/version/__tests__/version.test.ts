// lib/version/__tests__/version.test.ts
import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import {
  EcosystemVersion,
  SemVerRange,
  FeatureGateEngine,
  createVersionedPayload,
  createVersionedApiResponse,
  parseVersionedPayload,
  createVersionedPayloadSchema,
  createStreamVersionInterceptor,
  createApiVersionInterceptor,
  IncompatibleVersionError,
  validateClientVersion,
  VersionLifecycleEventEmitter,
  VERSION_LIFECYCLE_EVENTS,
  MakerverseSDK,
  createMakerverseSDK,
  sdk,
} from "../index";

describe("EcosystemVersion Core Engine", () => {
  describe("Parsing & Formatting", () => {
    it("parses standard SemVer format strings with and without 'v' prefix", () => {
      const v1 = EcosystemVersion.parse("v1.2.3");
      expect(v1.major).toBe(1);
      expect(v1.minor).toBe(2);
      expect(v1.revision).toBe(3);
      expect(v1.patch).toBe(3);
      expect(v1.prerelease).toBeNull();
      expect(v1.build).toBeNull();
      expect(v1.toString()).toBe("v1.2.3");
      expect(v1.format(false)).toBe("1.2.3");
      expect(v1.toJSON()).toBe("1.2.3");

      const v2 = EcosystemVersion.parse("2.0.0");
      expect(v2.major).toBe(2);
      expect(v2.minor).toBe(0);
      expect(v2.revision).toBe(0);
      expect(v2.toString()).toBe("v2.0.0");
    });

    it("parses prerelease tags and build metadata", () => {
      const v = EcosystemVersion.parse("v1.2.0-beta.1+build.20260829");
      expect(v.major).toBe(1);
      expect(v.minor).toBe(2);
      expect(v.revision).toBe(0);
      expect(v.prerelease).toBe("beta.1");
      expect(v.build).toBe("build.20260829");
      expect(v.toString()).toBe("v1.2.0-beta.1+build.20260829");
      expect(v.format(false)).toBe("1.2.0-beta.1+build.20260829");
    });

    it("handles tryParse and from helper correctly", () => {
      expect(EcosystemVersion.tryParse("v1.0.0")?.major).toBe(1);
      expect(EcosystemVersion.tryParse("invalid-string")).toBeNull();
      expect(EcosystemVersion.tryParse(null)).toBeNull();
      expect(EcosystemVersion.tryParse("")).toBeNull();
      expect(EcosystemVersion.tryParse(123 as any)).toBeNull();

      const existing = new EcosystemVersion(1, 4, 0);
      expect(EcosystemVersion.from(existing)).toBe(existing);
      expect(EcosystemVersion.from("v1.4.0").minor).toBe(4);
    });

    it("throws clear errors on invalid version strings", () => {
      expect(() => EcosystemVersion.parse("")).toThrow("non-empty string");
      expect(() => EcosystemVersion.parse("   ")).toThrow("non-empty string");
      expect(() => EcosystemVersion.parse(null as any)).toThrow("non-empty string");
      expect(() => EcosystemVersion.parse("1.2")).toThrow('Invalid SemVer format: "1.2"');
      expect(() => EcosystemVersion.parse("v1")).toThrow("Invalid SemVer format");
      expect(() => EcosystemVersion.parse("1.2.3.4")).toThrow("Invalid SemVer format");
      expect(() => EcosystemVersion.parse("v01.2.0")).toThrow("Invalid SemVer format");
      expect(() => EcosystemVersion.parse("abc.def.ghi")).toThrow("Invalid SemVer format");
    });

    it("validates constructor integer parameters", () => {
      expect(() => new EcosystemVersion(-1, 0, 0)).toThrow(TypeError);
      expect(() => new EcosystemVersion(1, -2, 0)).toThrow(TypeError);
      expect(() => new EcosystemVersion(1, 0, -3)).toThrow(TypeError);
      expect(() => new EcosystemVersion(1.5, 0, 0)).toThrow(TypeError);
      expect(() => new EcosystemVersion(1, 2.5, 0)).toThrow(TypeError);
      expect(() => new EcosystemVersion(1, 0, 3.5)).toThrow(TypeError);
    });
  });

  describe("Comparison Operators", () => {
    it("compares major, minor, and revision precedence", () => {
      const v100 = EcosystemVersion.parse("1.0.0");
      const v110 = EcosystemVersion.parse("1.1.0");
      const v111 = EcosystemVersion.parse("1.1.1");
      const v200 = EcosystemVersion.parse("2.0.0");

      expect(v100.compare(v110)).toBe(-1);
      expect(v110.compare(v100)).toBe(1);
      expect(v100.compare("1.0.0")).toBe(0);

      expect(v100.lessThan(v110)).toBe(true);
      expect(v100.lessThanOrEqual(v100)).toBe(true);
      expect(v111.greaterThan(v110)).toBe(true);
      expect(v111.greaterThanOrEqual(v111)).toBe(true);
      expect(v200.greaterThan(v111)).toBe(true);
      expect(v100.equals(EcosystemVersion.parse("v1.0.0"))).toBe(true);
    });

    it("compares prerelease versions per SemVer 2.0.0 rules", () => {
      const v1 = EcosystemVersion.parse("1.0.0-alpha");
      const v2 = EcosystemVersion.parse("1.0.0-alpha.1");
      const v3 = EcosystemVersion.parse("1.0.0-alpha.beta");
      const v4 = EcosystemVersion.parse("1.0.0-beta");
      const v5 = EcosystemVersion.parse("1.0.0-beta.2");
      const v6 = EcosystemVersion.parse("1.0.0-beta.11");
      const v7 = EcosystemVersion.parse("1.0.0-rc.1");
      const v8 = EcosystemVersion.parse("1.0.0");

      // 1.0.0-alpha < 1.0.0-alpha.1 < 1.0.0-alpha.beta < 1.0.0-beta < 1.0.0-beta.2 < 1.0.0-beta.11 < 1.0.0-rc.1 < 1.0.0
      expect(v1.lessThan(v2)).toBe(true);
      expect(v2.lessThan(v3)).toBe(true);
      expect(v3.lessThan(v4)).toBe(true);
      expect(v4.lessThan(v5)).toBe(true);
      expect(v5.lessThan(v6)).toBe(true);
      expect(v6.lessThan(v7)).toBe(true);
      expect(v7.lessThan(v8)).toBe(true);
      expect(v8.greaterThan(v1)).toBe(true);

      // Prerelease with different lengths and identical prefixes
      const vAlpha1 = EcosystemVersion.parse("1.0.0-alpha.1");
      const vAlpha11 = EcosystemVersion.parse("1.0.0-alpha.1.1");
      expect(vAlpha1.lessThan(vAlpha11)).toBe(true);
      expect(vAlpha11.greaterThan(vAlpha1)).toBe(true);

      // Numeric vs string identifier in prerelease
      const vNum = EcosystemVersion.parse("1.0.0-1");
      const vStr = EcosystemVersion.parse("1.0.0-a");
      expect(vNum.lessThan(vStr)).toBe(true);
      expect(vStr.greaterThan(vNum)).toBe(true);
    });

    it("ignores build metadata during version comparison", () => {
      const vA = EcosystemVersion.parse("1.0.0+build.1");
      const vB = EcosystemVersion.parse("1.0.0+build.2");
      expect(vA.equals(vB)).toBe(true);
      expect(vA.compare(vB)).toBe(0);
    });
  });

  describe("Backward Compatibility (isCompatibleWith)", () => {
    it("evaluates compatibility for major >= 1", () => {
      const client120 = EcosystemVersion.parse("v1.2.0");

      // Backward compatible with baseline 1.0.0 and 1.2.0
      expect(client120.isCompatibleWith("1.0.0")).toBe(true);
      expect(client120.isCompatibleWith("1.1.5")).toBe(true);
      expect(client120.isCompatibleWith("1.2.0")).toBe(true);

      // Incompatible with higher minor baseline on same major
      expect(client120.isCompatibleWith("1.3.0")).toBe(false);

      // Incompatible with different major versions
      expect(client120.isCompatibleWith("2.0.0")).toBe(false);
      expect(client120.isCompatibleWith("0.9.0")).toBe(false);
    });

    it("evaluates compatibility for 0.x.y initial development versions", () => {
      const dev025 = EcosystemVersion.parse("v0.2.5");

      // Same 0.2 line with lower or equal revision is compatible
      expect(dev025.isCompatibleWith("0.2.0")).toBe(true);
      expect(dev025.isCompatibleWith("0.2.5")).toBe(true);

      // Higher revision required -> incompatible
      expect(dev025.isCompatibleWith("0.2.6")).toBe(false);

      // Different minor in 0.x is treated as breaking
      expect(dev025.isCompatibleWith("0.1.0")).toBe(false);
      expect(dev025.isCompatibleWith("0.3.0")).toBe(false);
    });
  });

  describe("SemVer Range Evaluator (satisfies & SemVerRange)", () => {
    it("evaluates exact and simple comparison constraints", () => {
      const v = EcosystemVersion.parse("1.2.3");
      expect(v.satisfies("1.2.3")).toBe(true);
      expect(v.satisfies("=1.2.3")).toBe(true);
      expect(v.satisfies("==1.2.3")).toBe(true);
      expect(v.satisfies(">=1.2.0")).toBe(true);
      expect(v.satisfies(">1.2.0")).toBe(true);
      expect(v.satisfies("<2.0.0")).toBe(true);
      expect(v.satisfies("<=1.2.3")).toBe(true);
      expect(v.satisfies("<1.2.3")).toBe(false);
      expect(v.satisfies(">1.2.3")).toBe(false);
    });

    it("evaluates caret (^) ranges across 1.x, 0.x, and 0.0.x", () => {
      const v123 = EcosystemVersion.parse("1.2.3");
      expect(v123.satisfies("^1.2.0")).toBe(true);
      expect(v123.satisfies("^1.0.0")).toBe(true);
      expect(v123.satisfies("^1.2.3")).toBe(true);
      expect(v123.satisfies("^1.2.4")).toBe(false);
      expect(v123.satisfies("^2.0.0")).toBe(false);

      const v023 = EcosystemVersion.parse("0.2.3");
      expect(v023.satisfies("^0.2.0")).toBe(true);
      expect(v023.satisfies("^0.2.3")).toBe(true);
      expect(v023.satisfies("^0.3.0")).toBe(false);
      expect(v023.satisfies("^0.1.0")).toBe(false);

      const v003 = EcosystemVersion.parse("0.0.3");
      expect(v003.satisfies("^0.0.3")).toBe(true);
      expect(v003.satisfies("^0.0.4")).toBe(false);
      expect(v003.satisfies("^0.0.2")).toBe(false);
    });

    it("evaluates tilde (~) ranges", () => {
      const v123 = EcosystemVersion.parse("1.2.3");
      expect(v123.satisfies("~1.2.3")).toBe(true);
      expect(v123.satisfies("~1.2")).toBe(true);
      expect(v123.satisfies("~1")).toBe(true);
      expect(v123.satisfies("~1.3.0")).toBe(false);
    });

    it("evaluates wildcard ranges and operators on wildcards", () => {
      const v123 = EcosystemVersion.parse("1.2.3");
      expect(v123.satisfies("*")).toBe(true);
      expect(v123.satisfies("all")).toBe(true);
      expect(v123.satisfies("")).toBe(true);
      expect(v123.satisfies("1.x")).toBe(true);
      expect(v123.satisfies("1.2.*")).toBe(true);
      expect(v123.satisfies("1.*.*")).toBe(true);
      expect(v123.satisfies(">=1.x")).toBe(true);
      expect(v123.satisfies("<2.x")).toBe(true);
      expect(v123.satisfies("<=1.x")).toBe(true);
      expect(v123.satisfies(">=1.2.x")).toBe(true);
      expect(v123.satisfies("<1.3.x")).toBe(true);
      expect(v123.satisfies("<=1.2.x")).toBe(true);
      expect(v123.satisfies("2.x")).toBe(false);
    });

    it("evaluates hyphen ranges with exact and wildcard bounds", () => {
      const v = EcosystemVersion.parse("1.5.0");
      expect(v.satisfies("1.0.0 - 2.0.0")).toBe(true);
      expect(v.satisfies("1.0.0 - 1.4.0")).toBe(false);
      expect(v.satisfies("1.0.0 - 2.x")).toBe(true);
      expect(v.satisfies("1.0.0 - 1.5.x")).toBe(true);
      expect(v.satisfies("1.0.0 - 1.4.x")).toBe(false);
    });

    it("evaluates conjunctions and disjunctions (||)", () => {
      const v1 = EcosystemVersion.parse("1.2.0");
      const v2 = EcosystemVersion.parse("2.1.0");
      const v3 = EcosystemVersion.parse("3.0.0");

      const constraint = "^1.0.0 || ^2.0.0";
      expect(v1.satisfies(constraint)).toBe(true);
      expect(v2.satisfies(constraint)).toBe(true);
      expect(v3.satisfies(constraint)).toBe(false);

      expect(v1.satisfies(">=1.0.0 <1.5.0")).toBe(true);
      expect(v1.satisfies(">=1.3.0 <2.0.0")).toBe(false);

      expect(SemVerRange.satisfies("1.2.0", "^1.0.0")).toBe(true);
    });
  });
});

describe("FeatureGateEngine", () => {
  it("evaluates feature support against client version thresholds", () => {
    const engine = new FeatureGateEngine("1.2.0");

    expect(engine.supportsFeature("REDIS_STREAM_V2_ENVELOPE")).toBe(true); // min 1.0.0
    expect(engine.supportsFeature("CART_EXPIRY_RECOVERY")).toBe(true); // min 1.1.0
    expect(engine.supportsFeature("NFC_DYNAMIC_TAP_V2")).toBe(true); // min 1.2.0
    expect(engine.supportsFeature("SPATIAL_AR_TAGGING")).toBe(false); // min 1.3.0
    expect(engine.supportsFeature("BIOMETRIC_CHECKOUT")).toBe(false); // min 2.0.0
  });

  it("supports explicit override versions and active features discovery", () => {
    const engine = new FeatureGateEngine("1.0.0");

    expect(engine.supportsFeature("NFC_DYNAMIC_TAP_V2")).toBe(false);
    expect(engine.supportsFeature("NFC_DYNAMIC_TAP_V2", "1.2.0")).toBe(true);

    const activeAt120 = engine.getActiveFeatures("1.2.0");
    expect(activeAt120).toContain("NFC_DYNAMIC_TAP_V2");
    expect(activeAt120).toContain("CART_EXPIRY_RECOVERY");
    expect(activeAt120).not.toContain("SPATIAL_AR_TAGGING");

    const all = engine.getAllFeatures();
    expect(all.length).toBeGreaterThan(0);
  });

  it("manages client version state dynamically", () => {
    const engine = new FeatureGateEngine("1.0.0");
    expect(engine.getClientVersion().toString()).toBe("v1.0.0");

    engine.setClientVersion("1.4.0");
    expect(engine.getClientVersion().toString()).toBe("v1.4.0");
    expect(engine.supportsFeature("SPATIAL_AR_TAGGING")).toBe(true);
  });

  it("registers custom features with range constraints and maxVersion", () => {
    const engine = new FeatureGateEngine("1.5.0");

    engine.registerFeature({
      key: "LEGACY_PAYMENT_V1",
      minVersion: "1.0.0",
      maxVersion: "1.4.0",
      description: "Deprecated legacy payment endpoint",
    });

    engine.registerFeature({
      key: "SPECIAL_BETA_FLAG",
      constraint: "^1.5.0",
      description: "Active only in 1.5.x",
    });

    expect(engine.supportsFeature("LEGACY_PAYMENT_V1")).toBe(false); // Client 1.5.0 > max 1.4.0
    expect(engine.supportsFeature("LEGACY_PAYMENT_V1", "1.3.0")).toBe(true);
    expect(engine.supportsFeature("SPECIAL_BETA_FLAG")).toBe(true);
    expect(engine.supportsFeature("SPECIAL_BETA_FLAG", "2.0.0")).toBe(false);
  });

  it("handles disabled features, unregistering, and validation errors", () => {
    const engine = new FeatureGateEngine("2.0.0");

    engine.registerFeature({
      key: "DISABLED_FEATURE",
      minVersion: "1.0.0",
      enabled: false,
    });

    expect(engine.supportsFeature("DISABLED_FEATURE")).toBe(false);
    expect(engine.supportsFeature("NON_EXISTENT_FEATURE")).toBe(false);

    expect(engine.getFeature("DISABLED_FEATURE")?.key).toBe("DISABLED_FEATURE");
    expect(engine.unregisterFeature("DISABLED_FEATURE")).toBe(true);
    expect(engine.getFeature("DISABLED_FEATURE")).toBeUndefined();

    expect(() => engine.registerFeature({ key: "" })).toThrow("valid non-empty 'key'");
  });
});

describe("Versioned Payload & API Envelopes", () => {
  it("creates standard versioned payloads and API responses", () => {
    const payload = createVersionedPayload({ sku: "CHIP-424", stock: 100 }, "1.2.0", { node: "edge-1" });
    expect(payload.version).toBe("1.2.0");
    expect(payload.data.sku).toBe("CHIP-424");
    expect(payload.meta?.node).toBe("edge-1");
    expect(payload.timestamp).toBeDefined();

    const apiResp = createVersionedApiResponse({ orderId: "ord_123" }, "1.2.0", { requestId: "req_999" });
    expect(apiResp.success).toBe(true);
    expect(apiResp.version).toBe("1.2.0");
    expect(apiResp.data.orderId).toBe("ord_123");
    expect(apiResp.meta?.requestId).toBe("req_999");
  });

  it("creates and validates with createVersionedPayloadSchema", () => {
    const Schema = createVersionedPayloadSchema(z.object({ token: z.string() }));
    const valid = Schema.parse({
      version: "1.0.0",
      data: { token: "abc" },
      timestamp: Date.now(),
    });
    expect(valid.version).toBe("1.0.0");
    expect(valid.data.token).toBe("abc");
  });

  it("parses and validates versioned payloads with Zod data schemas", () => {
    const ItemSchema = z.object({ id: z.string(), qty: z.number() });

    const raw = JSON.stringify({
      version: "1.2.0",
      data: { id: "item_1", qty: 5 },
      meta: { trace: "abc" },
    });

    const parsed = parseVersionedPayload(raw, ItemSchema);
    expect(parsed.version.major).toBe(1);
    expect(parsed.version.minor).toBe(2);
    expect(parsed.data.id).toBe("item_1");
    expect(parsed.data.qty).toBe(5);
    expect(parsed.meta?.trace).toBe("abc");
  });

  it("parses flat payload objects containing a version field", () => {
    const flat = {
      version: "v1.3.0",
      event_type: "catalog.restock",
      sku: "SKU-001",
    };

    const parsed = parseVersionedPayload(flat);
    expect(parsed.version.toString()).toBe("v1.3.0");
    expect((parsed.data as any).sku).toBe("SKU-001");
  });

  it("throws descriptive errors on malformed payloads", () => {
    expect(() => parseVersionedPayload("not-json")).toThrow("Failed to parse payload as JSON");
    expect(() => parseVersionedPayload(null)).toThrow("Expected an object");
    expect(() => parseVersionedPayload({ data: "no-version" })).toThrow("Missing required 'version'");
  });
});

describe("API & Stream Middleware Guardrails", () => {
  it("stream interceptor allows compatible events and extracts payload data", () => {
    const interceptor = createStreamVersionInterceptor({ sdkVersion: "1.2.0" });

    const event = {
      version: "1.2.0",
      data: { event_type: "commerce.hold_created", hold_id: "h_1" },
    };

    const result = interceptor.intercept<{ hold_id: string }>(event);
    expect(result.data.hold_id).toBe("h_1");
    expect(result.version.toString()).toBe("v1.2.0");
  });

  it("stream interceptor rejects breaking major version jumps", () => {
    const onIncompatible = vi.fn();
    const interceptor = createStreamVersionInterceptor({
      sdkVersion: "1.2.0",
      onIncompatible,
    });

    const breakingEvent = {
      version: "2.0.0",
      data: { event_type: "commerce.v2_checkout", payment_token: "tok_xyz" },
    };

    expect(() => interceptor.intercept(breakingEvent)).toThrow(IncompatibleVersionError);
    expect(onIncompatible).toHaveBeenCalledTimes(1);

    const defaultErr = new IncompatibleVersionError("1.0.0", "2.0.0");
    expect(defaultErr.isMajorBreaking).toBe(true);
  });

  it("stream interceptor enforces explicit allowedRange", () => {
    const onIncompatible = vi.fn();
    const interceptor = createStreamVersionInterceptor({
      sdkVersion: "1.2.0",
      allowedRange: ">=1.0.0 <1.3.0",
      onIncompatible,
    });

    const event140 = { version: "1.4.0", data: { ping: true } };
    expect(() => interceptor.intercept(event140)).toThrow(/does not satisfy allowed constraint/);
    expect(onIncompatible).toHaveBeenCalledTimes(1);
  });

  it("triggers warning callback when payload version is newer minor/patch on same major", () => {
    const onWarning = vi.fn();
    const interceptor = createStreamVersionInterceptor({
      sdkVersion: "1.1.0",
      onVersionWarning: onWarning,
    });

    const newerMinorEvent = { version: "1.3.0", data: { feature: "new" } };
    const result = interceptor.intercept(newerMinorEvent);

    expect(result.data).toBeDefined();
    expect(onWarning).toHaveBeenCalledTimes(1);
    expect(onWarning).toHaveBeenCalledWith(
      expect.stringContaining("is newer than current SDK"),
      expect.any(EcosystemVersion),
      expect.any(EcosystemVersion)
    );
  });

  it("API response interceptor validates version headers and handles deprecated endpoints", () => {
    const onMismatch = vi.fn();
    const interceptor = createApiVersionInterceptor({
      sdkVersion: "1.2.0",
      onVersionMismatch: onMismatch,
    });

    const response = {
      success: true,
      version: "1.2.0",
      data: { user: "alice" },
      meta: { deprecated: true },
    };

    const data = interceptor.interceptResponse<{ user: string }>(response);
    expect(data.user).toBe("alice");
    expect(onMismatch).toHaveBeenCalledTimes(1);
  });

  it("API response interceptor throws on invalid or major mismatch", () => {
    const interceptor = createApiVersionInterceptor({
      sdkVersion: "1.2.0",
      allowedRange: "^1.0.0",
    });

    expect(() => interceptor.interceptResponse(null as any)).toThrow("expected an object");
    expect(() => interceptor.interceptResponse({ data: "no-version" })).toThrow("missing required 'version'");
    expect(() => interceptor.interceptResponse({ version: "2.0.0", data: {} })).toThrow(IncompatibleVersionError);
    expect(() => interceptor.interceptResponse({ version: "0.9.0", data: {} })).toThrow(/does not satisfy allowed constraint/);

    // Response without explicit data field
    const flatResp = { version: "1.2.0", message: "ok" };
    const unwrapped = interceptor.interceptResponse<{ message: string }>(flatResp);
    expect(unwrapped.message).toBe("ok");
  });
});

describe("Minimum Supported Version Handshake & Lifecycle Events", () => {
  const gatewayConfig = {
    gatewayVersion: "1.5.0",
    minSupportedVersion: "1.1.0",
    recommendedVersion: "1.4.0",
    deprecatedVersions: ["1.1.0"],
    sunsetTimestamps: {
      "1.1.0": 1798761600000,
    },
  };

  it("returns compatible status when client >= recommended", () => {
    const result = validateClientVersion("1.4.0", gatewayConfig);
    expect(result.status).toBe("compatible");
    expect(result.compatible).toBe(true);
    expect(result.actionRequired).toBe(false);
  });

  it("returns update_recommended status when client is between min and recommended", () => {
    const result = validateClientVersion("1.2.0", gatewayConfig);
    expect(result.status).toBe("update_recommended");
    expect(result.compatible).toBe(true);
    expect(result.actionRequired).toBe(false);
  });

  it("returns deprecated status when client is in deprecated list or approaching sunset", () => {
    const result = validateClientVersion("1.1.0", gatewayConfig);
    expect(result.status).toBe("deprecated");
    expect(result.compatible).toBe(true);
    expect(result.actionRequired).toBe(false);
    expect(result.deprecated).toBe(true);
    expect(result.sunsetTimestamp).toBe(1798761600000);
  });

  it("returns force_update_required status when client < minSupportedVersion", () => {
    const result = validateClientVersion("1.0.0", gatewayConfig);
    expect(result.status).toBe("force_update_required");
    expect(result.compatible).toBe(false);
    expect(result.actionRequired).toBe(true);
  });

  it("supports custom messages and major mismatch in handshake", () => {
    const customConfig = {
      gatewayVersion: "2.0.0",
      minSupportedVersion: "2.0.0",
      recommendedVersion: "2.0.0",
      message: "Gateway upgraded to v2",
    };

    const res = validateClientVersion("1.5.0", customConfig);
    expect(res.status).toBe("force_update_required");
    expect(res.message).toBe("Gateway upgraded to v2");
  });

  it("VersionLifecycleEventEmitter dispatches typed events", () => {
    const emitter = new VersionLifecycleEventEmitter();

    const onCompatible = vi.fn();
    const onRecommended = vi.fn();
    const onDeprecated = vi.fn();
    const onForceUpdate = vi.fn();

    emitter.on(VERSION_LIFECYCLE_EVENTS.ON_VERSION_COMPATIBLE, onCompatible);
    emitter.on(VERSION_LIFECYCLE_EVENTS.ON_UPDATE_RECOMMENDED, onRecommended);
    emitter.on(VERSION_LIFECYCLE_EVENTS.ON_VERSION_DEPRECATED, onDeprecated);
    emitter.on(VERSION_LIFECYCLE_EVENTS.ON_FORCE_UPDATE_REQUIRED, onForceUpdate);

    // 1. Force update
    emitter.executeHandshake("1.0.0", gatewayConfig);
    expect(onForceUpdate).toHaveBeenCalledTimes(1);

    // 2. Deprecated
    emitter.executeHandshake("1.1.0", gatewayConfig);
    expect(onDeprecated).toHaveBeenCalledTimes(1);

    // 3. Update recommended
    emitter.executeHandshake("1.2.0", gatewayConfig);
    expect(onRecommended).toHaveBeenCalledTimes(1);

    // 4. Compatible
    emitter.executeHandshake("1.5.0", gatewayConfig);
    expect(onCompatible).toHaveBeenCalledTimes(1);

    expect(emitter.getLastResult()?.status).toBe("compatible");
  });

  it("safely catches listener errors in emit", () => {
    const emitter = new VersionLifecycleEventEmitter();
    const badListener = vi.fn().mockImplementation(() => {
      throw new Error("listener error");
    });
    const goodListener = vi.fn();

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    emitter.on(VERSION_LIFECYCLE_EVENTS.ON_VERSION_COMPATIBLE, badListener);
    emitter.on(VERSION_LIFECYCLE_EVENTS.ON_VERSION_COMPATIBLE, goodListener);

    emitter.executeHandshake("1.5.0", gatewayConfig);

    expect(badListener).toHaveBeenCalledTimes(1);
    expect(goodListener).toHaveBeenCalledTimes(1);
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("supports once listener and off unsubscribe", () => {
    const emitter = new VersionLifecycleEventEmitter();
    const listener = vi.fn();

    emitter.once(VERSION_LIFECYCLE_EVENTS.ON_VERSION_COMPATIBLE, listener);
    emitter.executeHandshake("1.5.0", gatewayConfig);
    emitter.executeHandshake("1.5.0", gatewayConfig);

    expect(listener).toHaveBeenCalledTimes(1);

    const normalListener = vi.fn();
    emitter.on(VERSION_LIFECYCLE_EVENTS.ON_VERSION_COMPATIBLE, normalListener);
    emitter.off(VERSION_LIFECYCLE_EVENTS.ON_VERSION_COMPATIBLE, normalListener);
    emitter.executeHandshake("1.5.0", gatewayConfig);

    expect(normalListener).not.toHaveBeenCalled();
  });
});

describe("MakerverseSDK Unified Facade", () => {
  it("initializes SDK with default and custom configurations", () => {
    const customSdk = createMakerverseSDK({ version: "1.3.0" });
    expect(customSdk.version.toString()).toBe("v1.3.0");
    expect(customSdk.supportsFeature("SPATIAL_AR_TAGGING")).toBe(true);
    expect(customSdk.supportsFeature("BIOMETRIC_CHECKOUT")).toBe(false);

    const payload = customSdk.wrapPayload({ sku: "NFC-424" });
    expect(payload.version).toBe("1.3.0");
    expect(payload.data.sku).toBe("NFC-424");

    const streamInterceptor = customSdk.createStreamInterceptor();
    expect(streamInterceptor).toBeDefined();

    const apiInterceptor = customSdk.createApiInterceptor();
    expect(apiInterceptor).toBeDefined();

    const handshakeRes = customSdk.validateHandshake({
      gatewayVersion: "1.4.0",
      minSupportedVersion: "1.0.0",
      recommendedVersion: "1.3.0",
    });
    expect(handshakeRes.status).toBe("compatible");
  });

  it("exports global singleton sdk instance", () => {
    expect(sdk).toBeInstanceOf(MakerverseSDK);
    expect(sdk.version.toString()).toBe("v0.1.0");
    expect(sdk.supportsFeature("REDIS_STREAM_V2_ENVELOPE")).toBe(true);
  });
});
