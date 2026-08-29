// lib/version/handshake.ts
/**
 * Makerverse Minimum Supported Version Handshake & Lifecycle Engine
 * 
 * Provides client-gateway version handshakes and event-driven lifecycle notifications.
 * Evaluates running client builds against API gateway version baselines, emitting
 * deprecation warnings and force-update triggers when clients fall below minimum thresholds.
 */

import { EcosystemVersion } from "./version";

/**
 * Version Lifecycle Event Constants
 */
export const VERSION_LIFECYCLE_EVENTS = {
  /** Emitted when client version satisfies or exceeds all gateway compatibility bounds */
  ON_VERSION_COMPATIBLE: "ON_VERSION_COMPATIBLE",
  /** Emitted when client version is supported, but a newer recommended version exists */
  ON_UPDATE_RECOMMENDED: "ON_UPDATE_RECOMMENDED",
  /** Emitted when client version is marked deprecated or approaching sunset */
  ON_VERSION_DEPRECATED: "ON_VERSION_DEPRECATED",
  /** Emitted when client version falls below minimum supported threshold (breaking/blocked) */
  ON_FORCE_UPDATE_REQUIRED: "ON_FORCE_UPDATE_REQUIRED",
} as const;

export type VersionLifecycleEvent = (typeof VERSION_LIFECYCLE_EVENTS)[keyof typeof VERSION_LIFECYCLE_EVENTS];

/**
 * Handshake status classification
 */
export type HandshakeStatus =
  | "compatible"
  | "update_recommended"
  | "deprecated"
  | "force_update_required";

export interface GatewayHandshakeConfig {
  /** The current active version running on the API Gateway */
  gatewayVersion: string | EcosystemVersion;
  /** The absolute minimum version required to communicate with the Gateway */
  minSupportedVersion: string | EcosystemVersion;
  /** The recommended/latest stable version for client builds */
  recommendedVersion: string | EcosystemVersion;
  /** Explicit list of versions that have been deprecated */
  deprecatedVersions?: (string | EcosystemVersion)[];
  /** Map of version strings to their sunset epoch timestamps (ms) */
  sunsetTimestamps?: Record<string, number>;
  /** Custom notification message from Gateway */
  message?: string;
}

export interface HandshakeResult {
  status: HandshakeStatus;
  compatible: boolean;
  actionRequired: boolean;
  message: string;
  clientVersion: EcosystemVersion;
  gatewayVersion: EcosystemVersion;
  minSupportedVersion: EcosystemVersion;
  recommendedVersion: EcosystemVersion;
  sunsetTimestamp?: number;
  deprecated: boolean;
}

export type HandshakeEventListener = (result: HandshakeResult) => void;

/**
 * Validates a client version against Gateway configuration requirements.
 *
 * @param clientVersion Current version of the client app/SDK
 * @param gatewayConfig Gateway handshake response/configuration
 */
export function validateClientVersion(
  clientVersion: string | EcosystemVersion,
  gatewayConfig: GatewayHandshakeConfig
): HandshakeResult {
  const clientVer = EcosystemVersion.from(clientVersion);
  const gatewayVer = EcosystemVersion.from(gatewayConfig.gatewayVersion);
  const minVer = EcosystemVersion.from(gatewayConfig.minSupportedVersion);
  const recVer = EcosystemVersion.from(gatewayConfig.recommendedVersion);

  const sunsetMap = gatewayConfig.sunsetTimestamps || {};
  const clientVerStr = clientVer.format(false);
  const clientVerPrefixed = clientVer.format(true);
  const sunsetTime = sunsetMap[clientVerStr] ?? sunsetMap[clientVerPrefixed];

  // Check explicit deprecated list
  const isExplicitlyDeprecated = (gatewayConfig.deprecatedVersions || []).some((depVer) => {
    const d = EcosystemVersion.from(depVer);
    return d.equals(clientVer);
  });

  // 1. Force Update Required: Client is strictly less than minSupportedVersion OR major mismatch with minSupported
  if (clientVer.lessThan(minVer) || clientVer.major < minVer.major) {
    return {
      status: "force_update_required",
      compatible: false,
      actionRequired: true,
      message:
        gatewayConfig.message ||
        `Client version ${clientVer.toString()} is below the minimum supported version (${minVer.toString()}). A mandatory update is required to continue.`,
      clientVersion: clientVer,
      gatewayVersion: gatewayVer,
      minSupportedVersion: minVer,
      recommendedVersion: recVer,
      sunsetTimestamp: sunsetTime,
      deprecated: true,
    };
  }

  // 2. Deprecated Version: Listed in deprecated list or approaching sunset
  if (isExplicitlyDeprecated || sunsetTime !== undefined) {
    return {
      status: "deprecated",
      compatible: true,
      actionRequired: false,
      message:
        gatewayConfig.message ||
        `Client version ${clientVer.toString()} is deprecated and will soon reach end-of-life${
          sunsetTime ? ` on ${new Date(sunsetTime).toISOString()}` : ""
        }. Please upgrade to ${recVer.toString()}.`,
      clientVersion: clientVer,
      gatewayVersion: gatewayVer,
      minSupportedVersion: minVer,
      recommendedVersion: recVer,
      sunsetTimestamp: sunsetTime,
      deprecated: true,
    };
  }

  // 3. Update Recommended: Supported and >= minSupported, but < recommended
  if (clientVer.lessThan(recVer)) {
    return {
      status: "update_recommended",
      compatible: true,
      actionRequired: false,
      message:
        gatewayConfig.message ||
        `A newer recommended version (${recVer.toString()}) is available. Current client: ${clientVer.toString()}.`,
      clientVersion: clientVer,
      gatewayVersion: gatewayVer,
      minSupportedVersion: minVer,
      recommendedVersion: recVer,
      deprecated: false,
    };
  }

  // 4. Fully Compatible
  return {
    status: "compatible",
    compatible: true,
    actionRequired: false,
    message: gatewayConfig.message || `Client version ${clientVer.toString()} is fully compatible with API Gateway.`,
    clientVersion: clientVer,
    gatewayVersion: gatewayVer,
    minSupportedVersion: minVer,
    recommendedVersion: recVer,
    deprecated: false,
  };
}

/**
 * Event-driven lifecycle manager that executes handshakes and dispatches
 * standard lifecycle notifications to registered listeners.
 */
export class VersionLifecycleEventEmitter {
  private listeners: Map<VersionLifecycleEvent, Set<HandshakeEventListener>> = new Map();
  private lastResult: HandshakeResult | null = null;

  /**
   * Registers a listener for a specific lifecycle event.
   */
  on(event: VersionLifecycleEvent, listener: HandshakeEventListener): this {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
    return this;
  }

  /**
   * Registers a one-time listener for a specific lifecycle event.
   */
  once(event: VersionLifecycleEvent, listener: HandshakeEventListener): this {
    const wrapper: HandshakeEventListener = (result) => {
      this.off(event, wrapper);
      listener(result);
    };
    return this.on(event, wrapper);
  }

  /**
   * Unregisters a listener for a specific lifecycle event.
   */
  off(event: VersionLifecycleEvent, listener: HandshakeEventListener): this {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(listener);
    }
    return this;
  }

  /**
   * Emits a lifecycle event to all subscribed listeners.
   */
  emit(event: VersionLifecycleEvent, result: HandshakeResult): void {
    const set = this.listeners.get(event);
    if (set) {
      for (const listener of set) {
        try {
          listener(result);
        } catch (err) {
          console.error(`Error executing listener for version lifecycle event ${event}:`, err);
        }
      }
    }
  }

  /**
   * Executes the handshake validation against the gateway config and emits appropriate events.
   */
  executeHandshake(clientVersion: string | EcosystemVersion, gatewayConfig: GatewayHandshakeConfig): HandshakeResult {
    const result = validateClientVersion(clientVersion, gatewayConfig);
    this.lastResult = result;

    switch (result.status) {
      case "force_update_required":
        this.emit(VERSION_LIFECYCLE_EVENTS.ON_FORCE_UPDATE_REQUIRED, result);
        break;
      case "deprecated":
        this.emit(VERSION_LIFECYCLE_EVENTS.ON_VERSION_DEPRECATED, result);
        break;
      case "update_recommended":
        this.emit(VERSION_LIFECYCLE_EVENTS.ON_UPDATE_RECOMMENDED, result);
        break;
      case "compatible":
        this.emit(VERSION_LIFECYCLE_EVENTS.ON_VERSION_COMPATIBLE, result);
        break;
    }

    return result;
  }

  /**
   * Returns the most recent handshake result if executed.
   */
  getLastResult(): HandshakeResult | null {
    return this.lastResult;
  }
}
