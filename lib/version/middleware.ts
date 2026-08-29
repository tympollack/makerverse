// lib/version/middleware.ts
/**
 * Makerverse API & Stream Version Middleware Guardrails
 * 
 * Provides runtime stream interceptors and HTTP response validation guardrails.
 * Validates incoming Redis stream events and API responses against the running SDK
 * version, rejecting incompatible major version jumps and notifying on deprecations.
 */

import { EcosystemVersion } from "./version";
import { parseVersionedPayload, type VersionedPayload, type VersionedApiResponse } from "./payload";

export class IncompatibleVersionError extends Error {
  readonly clientVersion: EcosystemVersion;
  readonly payloadVersion: EcosystemVersion;
  readonly isMajorBreaking: boolean;

  constructor(
    clientVersion: EcosystemVersion | string,
    payloadVersion: EcosystemVersion | string,
    message?: string
  ) {
    const cVer = EcosystemVersion.from(clientVersion);
    const pVer = EcosystemVersion.from(payloadVersion);
    const isMajor = cVer.major !== pVer.major;

    const detailMsg =
      message ||
      `Incompatible version mismatch: SDK client (${cVer.toString()}) cannot process incoming payload (${pVer.toString()}). ${
        isMajor ? "Breaking major version jump detected." : "Client version is older than required payload schema."
      }`;

    super(detailMsg);
    this.name = "IncompatibleVersionError";
    this.clientVersion = cVer;
    this.payloadVersion = pVer;
    this.isMajorBreaking = isMajor;
  }
}

export interface StreamInterceptorOptions {
  /** The SDK version running in the consumer / client application */
  sdkVersion: string | EcosystemVersion;
  /** Optional explicit SemVer constraint range e.g. "^1.0.0" */
  allowedRange?: string;
  /** Whether to strictly enforce major version match (default: true) */
  strictMajor?: boolean;
  /** Callback fired when a minor/patch version difference is detected */
  onVersionWarning?: (message: string, payloadVersion: EcosystemVersion, sdkVersion: EcosystemVersion) => void;
  /** Custom handler for incompatible versions (if omitted, throws IncompatibleVersionError) */
  onIncompatible?: (error: IncompatibleVersionError) => void;
}

export interface StreamInterceptor {
  /**
   * Intercepts and validates an incoming stream event payload.
   * If valid, returns the unwrapped data payload and version.
   * If incompatible, throws IncompatibleVersionError (or calls custom handler).
   */
  intercept<T = unknown>(rawPayload: unknown): { data: T; version: EcosystemVersion; meta?: Record<string, unknown> };
}

/**
 * Creates an SDK stream interceptor for validating Redis stream event versions.
 */
export function createStreamVersionInterceptor(options: StreamInterceptorOptions): StreamInterceptor {
  const sdkVer = EcosystemVersion.from(options.sdkVersion);
  const strictMajor = options.strictMajor ?? true;

  return {
    intercept<T = unknown>(rawPayload: unknown): { data: T; version: EcosystemVersion; meta?: Record<string, unknown> } {
      const parsed = parseVersionedPayload<T>(rawPayload);
      const payloadVer = parsed.version;

      // 1. Evaluate explicit range constraint if defined
      if (options.allowedRange) {
        if (!payloadVer.satisfies(options.allowedRange)) {
          const err = new IncompatibleVersionError(
            sdkVer,
            payloadVer,
            `Stream payload version ${payloadVer.toString()} does not satisfy allowed constraint: "${options.allowedRange}"`
          );
          if (options.onIncompatible) {
            options.onIncompatible(err);
          }
          throw err;
        }
      }

      // 2. Strict Major Version Check
      if (strictMajor && payloadVer.major !== sdkVer.major) {
        const err = new IncompatibleVersionError(
          sdkVer,
          payloadVer,
          `Breaking stream payload version jump: SDK is on major v${sdkVer.major}, payload is on v${payloadVer.major}`
        );
        if (options.onIncompatible) {
          options.onIncompatible(err);
        }
        throw err;
      }

      // 3. Backward Compatibility Rule:
      // If the payload version requires features/schemas newer than this SDK can handle on the same major line:
      if (payloadVer.major === sdkVer.major && payloadVer.greaterThan(sdkVer)) {
        if (options.onVersionWarning) {
          options.onVersionWarning(
            `Incoming stream payload version (${payloadVer.toString()}) is newer than current SDK (${sdkVer.toString()}). Some optional fields may be omitted.`,
            payloadVer,
            sdkVer
          );
        }
      }

      return {
        data: parsed.data,
        version: payloadVer,
        meta: parsed.meta,
      };
    },
  };
}

export interface ApiInterceptorOptions {
  /** The SDK version running in the client application */
  sdkVersion: string | EcosystemVersion;
  /** Optional explicit constraint range */
  allowedRange?: string;
  /** Callback fired on deprecated or non-standard version response */
  onVersionMismatch?: (info: { responseVersion: EcosystemVersion; sdkVersion: EcosystemVersion }) => void;
}

export interface ApiInterceptor {
  /**
   * Intercepts an HTTP API response object or JSON body.
   */
  interceptResponse<T = unknown>(response: VersionedApiResponse<T> | Record<string, unknown>): T;
}

/**
 * Creates an HTTP API response interceptor for client applications.
 */
export function createApiVersionInterceptor(options: ApiInterceptorOptions): ApiInterceptor {
  const sdkVer = EcosystemVersion.from(options.sdkVersion);

  return {
    interceptResponse<T = unknown>(response: VersionedApiResponse<T> | Record<string, unknown>): T {
      if (!response || typeof response !== "object") {
        throw new Error("Invalid API response format: expected an object");
      }

      const versionStr = (response.version as string) || (response.meta as Record<string, unknown>)?.version;
      if (!versionStr || typeof versionStr !== "string") {
        throw new Error("API response is missing required 'version' metadata");
      }

      const respVer = EcosystemVersion.parse(versionStr);

      if (options.allowedRange && !respVer.satisfies(options.allowedRange)) {
        throw new IncompatibleVersionError(
          sdkVer,
          respVer,
          `API response version ${respVer.toString()} does not satisfy allowed constraint: "${options.allowedRange}"`
        );
      }

      if (respVer.major !== sdkVer.major) {
        throw new IncompatibleVersionError(
          sdkVer,
          respVer,
          `API response breaking version mismatch: client is v${sdkVer.major}, server is v${respVer.major}`
        );
      }

      if (response.meta && (response.meta as Record<string, unknown>).deprecated) {
        if (options.onVersionMismatch) {
          options.onVersionMismatch({ responseVersion: respVer, sdkVersion: sdkVer });
        }
      }

      return (response as VersionedApiResponse<T>).data !== undefined
        ? (response as VersionedApiResponse<T>).data
        : (response as unknown as T);
    },
  };
}
