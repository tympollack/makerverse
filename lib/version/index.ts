// lib/version/index.ts
/**
 * Makerverse Shared SDK (makerverse_sdk) - Semantic Versioning & Governance Module
 * 
 * Central exported SDK providing:
 *  - Semantic Version primitive (EcosystemVersion) and Range Evaluator (SemVerRange)
 *  - Feature Gating Engine (FeatureGateEngine)
 *  - API & Stream Payload Envelopes (VersionedPayload, VersionMetadataSchema)
 *  - Stream and HTTP Middleware Interceptors (createStreamVersionInterceptor, createApiVersionInterceptor)
 *  - Gateway Version Handshake & Lifecycle Events (validateClientVersion, VersionLifecycleEventEmitter)
 */

import { EcosystemVersion, SemVerRange, type VersionComponents, type ComparatorOp } from "./version";
import { FeatureGateEngine, type FeatureDefinition, DEFAULT_ECOSYSTEM_FEATURES } from "./featureGate";
import {
  VersionMetadataSchema,
  createVersionedPayloadSchema,
  createVersionedPayload,
  createVersionedApiResponse,
  parseVersionedPayload,
  type VersionedPayload,
  type VersionedApiResponse,
  type VersionMetadata,
} from "./payload";
import {
  IncompatibleVersionError,
  createStreamVersionInterceptor,
  createApiVersionInterceptor,
  type StreamInterceptor,
  type ApiInterceptor,
  type StreamInterceptorOptions,
  type ApiInterceptorOptions,
} from "./middleware";
import {
  VERSION_LIFECYCLE_EVENTS,
  type VersionLifecycleEvent,
  type HandshakeStatus,
  type GatewayHandshakeConfig,
  type HandshakeResult,
  type HandshakeEventListener,
  validateClientVersion,
  VersionLifecycleEventEmitter,
} from "./handshake";

export {
  EcosystemVersion,
  SemVerRange,
  type VersionComponents,
  type ComparatorOp,
  FeatureGateEngine,
  type FeatureDefinition,
  DEFAULT_ECOSYSTEM_FEATURES,
  VersionMetadataSchema,
  createVersionedPayloadSchema,
  createVersionedPayload,
  createVersionedApiResponse,
  parseVersionedPayload,
  type VersionedPayload,
  type VersionedApiResponse,
  type VersionMetadata,
  IncompatibleVersionError,
  createStreamVersionInterceptor,
  createApiVersionInterceptor,
  type StreamInterceptor,
  type ApiInterceptor,
  type StreamInterceptorOptions,
  type ApiInterceptorOptions,
  VERSION_LIFECYCLE_EVENTS,
  type VersionLifecycleEvent,
  type HandshakeStatus,
  type GatewayHandshakeConfig,
  type HandshakeResult,
  type HandshakeEventListener,
  validateClientVersion,
  VersionLifecycleEventEmitter,
};

export const MAKERVERSE_RELEASE_VERSION = "0.1.0";

export interface MakerverseSDKConfig {
  version?: string | EcosystemVersion;
  features?: FeatureDefinition[];
}

/**
 * Unified Makerverse SDK instance.
 */
export class MakerverseSDK {
  readonly version: EcosystemVersion;
  readonly featureGates: FeatureGateEngine;
  readonly lifecycle: VersionLifecycleEventEmitter;

  constructor(config: MakerverseSDKConfig = {}) {
    this.version = EcosystemVersion.from(config.version || MAKERVERSE_RELEASE_VERSION);
    this.featureGates = new FeatureGateEngine(this.version, config.features || DEFAULT_ECOSYSTEM_FEATURES);
    this.lifecycle = new VersionLifecycleEventEmitter();
  }

  /**
   * Checks if this running SDK build supports the specified feature key.
   */
  supportsFeature(featureKey: string): boolean {
    return this.featureGates.supportsFeature(featureKey, this.version);
  }

  /**
   * Performs runtime version handshake with API Gateway configuration.
   */
  validateHandshake(gatewayConfig: GatewayHandshakeConfig): HandshakeResult {
    return this.lifecycle.executeHandshake(this.version, gatewayConfig);
  }

  /**
   * Creates a stream interceptor bound to this SDK version.
   */
  createStreamInterceptor(options: Partial<StreamInterceptorOptions> = {}): StreamInterceptor {
    return createStreamVersionInterceptor({
      sdkVersion: this.version,
      ...options,
    });
  }

  /**
   * Creates an API interceptor bound to this SDK version.
   */
  createApiInterceptor(options: Partial<ApiInterceptorOptions> = {}): ApiInterceptor {
    return createApiVersionInterceptor({
      sdkVersion: this.version,
      ...options,
    });
  }

  /**
   * Wraps data in a versioned envelope using this SDK version.
   */
  wrapPayload<T>(data: T, meta?: Record<string, unknown>): VersionedPayload<T> {
    return createVersionedPayload(data, this.version, meta);
  }
}

/**
 * Default global singleton SDK instance initialized to initial release v0.1.0.
 */
export const sdk = new MakerverseSDK({ version: MAKERVERSE_RELEASE_VERSION });

/**
 * Factory helper for creating customized SDK instances.
 */
export function createMakerverseSDK(config?: MakerverseSDKConfig): MakerverseSDK {
  return new MakerverseSDK(config);
}
