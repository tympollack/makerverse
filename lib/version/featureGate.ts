// lib/version/featureGate.ts
/**
 * Makerverse Feature Gate Engine
 * 
 * Provides client and server-side feature gating based on Semantic Version
 * thresholds and constraints. Connected client apps and services can verify
 * capability support before triggering migrations, new APIs, or UI states.
 */

import { EcosystemVersion, SemVerRange } from "./version";

export interface FeatureDefinition {
  /** Unique feature identifier key (e.g. 'NFC_DYNAMIC_TAP_V2') */
  key: string;
  /** Minimum SemVer threshold required to support this feature */
  minVersion?: string | EcosystemVersion;
  /** Maximum SemVer version (feature retired or deprecated above this) */
  maxVersion?: string | EcosystemVersion;
  /** SemVer constraint range (e.g. '^1.2.0', '>=1.4.0 <3.0.0') */
  constraint?: string;
  /** Human-readable explanation of feature capabilities */
  description?: string;
  /** Whether the feature is globally active or toggled off */
  enabled?: boolean;
  /** Additional arbitrary metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Standard Makerverse ecosystem built-in feature catalog.
 */
export const DEFAULT_ECOSYSTEM_FEATURES: FeatureDefinition[] = [
  {
    key: "REDIS_STREAM_V2_ENVELOPE",
    minVersion: "0.1.0",
    description: "Standardized version metadata envelope on Redis stream events",
    enabled: true,
  },
  {
    key: "CART_EXPIRY_RECOVERY",
    minVersion: "1.1.0",
    description: "Client-side reservation recovery and TTL extension protocol",
    enabled: true,
  },
  {
    key: "NFC_DYNAMIC_TAP_V2",
    minVersion: "1.2.0",
    description: "NTAG424 DNA dynamic tap decryption and AES-128 CMAC verification",
    enabled: true,
  },
  {
    key: "SPATIAL_AR_TAGGING",
    minVersion: "1.3.0",
    description: "Spatial post product tagging with percentage coordinates",
    enabled: true,
  },
  {
    key: "PROVENANCE_MINTING_V2",
    minVersion: "1.4.0",
    description: "On-chain provenance minting and cryptographic receipt verification",
    enabled: true,
  },
  {
    key: "BIOMETRIC_CHECKOUT",
    minVersion: "2.0.0",
    description: "WebAuthn / Passkey hardware biometric instant checkout",
    enabled: true,
  },
];

export class FeatureGateEngine {
  private features: Map<string, FeatureDefinition> = new Map();
  private clientVersion: EcosystemVersion;

  constructor(defaultVersion: string | EcosystemVersion = "0.1.0", initialFeatures: FeatureDefinition[] = DEFAULT_ECOSYSTEM_FEATURES) {
    this.clientVersion = EcosystemVersion.from(defaultVersion);
    this.registerFeatures(initialFeatures);
  }

  /**
   * Sets the active client version for all subsequent threshold evaluations.
   */
  setClientVersion(version: string | EcosystemVersion): void {
    this.clientVersion = EcosystemVersion.from(version);
  }

  /**
   * Gets the currently configured client version.
   */
  getClientVersion(): EcosystemVersion {
    return this.clientVersion;
  }

  /**
   * Registers or updates a feature definition in the registry.
   */
  registerFeature(definition: FeatureDefinition): void {
    if (!definition || !definition.key) {
      throw new Error("Feature definition must have a valid non-empty 'key'");
    }
    this.features.set(definition.key, {
      ...definition,
      enabled: definition.enabled ?? true,
    });
  }

  /**
   * Registers multiple feature definitions.
   */
  registerFeatures(definitions: FeatureDefinition[]): void {
    for (const def of definitions) {
      this.registerFeature(def);
    }
  }

  /**
   * Retrieves a feature definition by key.
   */
  getFeature(key: string): FeatureDefinition | undefined {
    return this.features.get(key);
  }

  /**
   * Returns all registered feature definitions.
   */
  getAllFeatures(): FeatureDefinition[] {
    return Array.from(this.features.values());
  }

  /**
   * Removes a feature from the registry.
   */
  unregisterFeature(key: string): boolean {
    return this.features.delete(key);
  }

  /**
   * Checks if a specific feature is supported for the given (or active) client version.
   *
   * @param featureKey The feature key identifier
   * @param overrideVersion Optional version to evaluate against (defaults to engine's clientVersion)
   */
  supportsFeature(featureKey: string, overrideVersion?: string | EcosystemVersion): boolean {
    const feature = this.features.get(featureKey);
    if (!feature) {
      return false;
    }

    if (feature.enabled === false) {
      return false;
    }

    const version = overrideVersion ? EcosystemVersion.from(overrideVersion) : this.clientVersion;

    // 1. Evaluate explicit constraint string if provided (e.g. '^1.2.0' or '>=1.2.0 <2.0.0')
    if (feature.constraint) {
      if (!version.satisfies(feature.constraint)) {
        return false;
      }
    }

    // 2. Evaluate minVersion threshold
    if (feature.minVersion) {
      const minVer = EcosystemVersion.from(feature.minVersion);
      if (version.lessThan(minVer)) {
        return false;
      }
    }

    // 3. Evaluate maxVersion threshold
    if (feature.maxVersion) {
      const maxVer = EcosystemVersion.from(feature.maxVersion);
      if (version.greaterThan(maxVer)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Evaluates and returns a list of all active feature keys supported by the client version.
   */
  getActiveFeatures(overrideVersion?: string | EcosystemVersion): string[] {
    const version = overrideVersion ? EcosystemVersion.from(overrideVersion) : this.clientVersion;
    const active: string[] = [];

    for (const [key] of this.features) {
      if (this.supportsFeature(key, version)) {
        active.push(key);
      }
    }

    return active;
  }
}
