// lib/version/payload.ts
/**
 * Makerverse Versioned Payload & API Schema Guardrails
 * 
 * Defines standard top-level envelope schemas and TypeScript interfaces for
 * HTTP API responses and Redis event stream payloads. Guarantees that every
 * distributed payload carries an explicit, validated SemVer version header.
 */

import { z } from "zod";
import { EcosystemVersion } from "./version";

/**
 * Top-level metadata schema included in API responses and event payloads.
 */
export const VersionMetadataSchema = z.object({
  /** Semantic version string e.g. "1.2.0" or "v1.2.0" */
  version: z.string().min(1, "Payload version is required"),
  /** Optional schema format identifier */
  schema_version: z.string().optional(),
  /** Timestamp when the payload or response was generated */
  timestamp: z.union([z.string().datetime(), z.number().int().positive()]).optional(),
  /** Originating service node identifier */
  source_service: z.string().optional(),
  /** Distributed trace identifier */
  trace_id: z.string().optional(),
});
export type VersionMetadata = z.infer<typeof VersionMetadataSchema>;

/**
 * Generic Versioned Payload Envelope Schema
 */
export function createVersionedPayloadSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    version: z.string().min(1, "Payload version is required"),
    data: dataSchema,
    meta: z.record(z.string(), z.unknown()).optional(),
    timestamp: z.union([z.string().datetime(), z.number().int().positive()]).optional(),
  });
}

export interface VersionedPayload<T = unknown> {
  version: string;
  data: T;
  meta?: Record<string, unknown>;
  timestamp?: string | number;
}

export interface VersionedApiResponse<T = unknown> {
  success: boolean;
  version: string;
  data: T;
  meta?: {
    requestId?: string;
    serverTime?: number;
    deprecated?: boolean;
    recommendedVersion?: string;
    [key: string]: unknown;
  };
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Creates a standard versioned payload wrapper.
 *
 * @param data The payload data model
 * @param version The version string or EcosystemVersion instance
 * @param meta Optional metadata dictionary
 */
export function createVersionedPayload<T>(
  data: T,
  version: string | EcosystemVersion = "1.0.0",
  meta?: Record<string, unknown>
): VersionedPayload<T> {
  const ver = typeof version === "string" ? version : version.format(false);
  return {
    version: ver,
    data,
    meta,
    timestamp: Date.now(),
  };
}

/**
 * Creates a standard versioned HTTP API response envelope.
 */
export function createVersionedApiResponse<T>(
  data: T,
  version: string | EcosystemVersion = "1.0.0",
  meta?: VersionedApiResponse<T>["meta"]
): VersionedApiResponse<T> {
  const ver = typeof version === "string" ? version : version.format(false);
  return {
    success: true,
    version: ver,
    data,
    meta: {
      serverTime: Date.now(),
      ...meta,
    },
  };
}

/**
 * Parses and validates an incoming raw payload against the versioned envelope and data schema.
 *
 * @param raw Incoming payload object or JSON string
 * @param dataSchema Optional Zod schema for validating the inner `data` payload
 */
export function parseVersionedPayload<T = unknown>(
  raw: unknown,
  dataSchema?: z.ZodType<T>
): { version: EcosystemVersion; data: T; meta?: Record<string, unknown>; raw: unknown } {
  let parsedObj: unknown = raw;
  if (typeof raw === "string") {
    try {
      parsedObj = JSON.parse(raw);
    } catch {
      throw new Error(`Failed to parse payload as JSON string: ${String(raw).slice(0, 100)}`);
    }
  }

  if (!parsedObj || typeof parsedObj !== "object") {
    throw new Error("Invalid payload: Expected an object");
  }

  const obj = parsedObj as Record<string, unknown>;

  // Check top-level version field
  if (!obj.version || typeof obj.version !== "string") {
    throw new Error("Missing required 'version' field in payload envelope");
  }

  const version = EcosystemVersion.parse(obj.version);

  // If payload follows `{ version, data, meta }` structure:
  let innerData: unknown;
  let meta: Record<string, unknown> | undefined;

  if ("data" in obj) {
    innerData = obj.data;
    meta = (obj.meta as Record<string, unknown>) ?? undefined;
  } else {
    // Top-level payload itself contains data fields alongside version
    const { version: _, ...rest } = obj;
    innerData = rest;
  }

  // Validate inner data against schema if provided
  let validatedData = innerData as T;
  if (dataSchema) {
    validatedData = dataSchema.parse(innerData);
  }

  return {
    version,
    data: validatedData,
    meta,
    raw: parsedObj,
  };
}
