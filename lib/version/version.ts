// lib/version/version.ts
/**
 * Makerverse Ecosystem Semantic Versioning Engine
 * 
 * Implements standard Semantic Versioning (v[major].[minor].[revision]) with
 * zero external runtime dependencies. Supports parsing, string formatting,
 * range comparisons, caret/tilde/hyphen range evaluation, and backward-compatibility checks.
 * 
 * Version Contract:
 *  - Major: Breaking schema migrations, authentication overhauls, or deleted payload attributes.
 *  - Minor: Backward-compatible feature additions or optional payload fields.
 *  - Revision (Patch): Backward-compatible bug fixes, security patches, or state machine optimizations.
 */

export interface VersionComponents {
  major: number;
  minor: number;
  revision: number;
  prerelease?: string | null;
  build?: string | null;
}

/**
 * Validates and compares prerelease identifiers per SemVer 2.0.0 Section 11.
 */
function comparePrerelease(a: string | null | undefined, b: string | null | undefined): number {
  // If neither has prerelease, they are equal
  if (!a && !b) return 0;
  // A version with prerelease has LOWER precedence than a normal version
  if (!a && b) return 1;
  if (a && !b) return -1;

  const aParts = (a as string).split(".");
  const bParts = (b as string).split(".");
  const len = Math.max(aParts.length, bParts.length);

  for (let i = 0; i < len; i++) {
    const aPart = aParts[i];
    const bPart = bParts[i];

    if (aPart === undefined) return -1;
    if (bPart === undefined) return 1;
    if (aPart === bPart) continue;

    const aNum = Number(aPart);
    const bNum = Number(bPart);
    const aIsNum = !isNaN(aNum) && /^\d+$/.test(aPart);
    const bIsNum = !isNaN(bNum) && /^\d+$/.test(bPart);

    if (aIsNum && bIsNum) {
      if (aNum !== bNum) return aNum > bNum ? 1 : -1;
    } else if (aIsNum && !bIsNum) {
      // Numeric identifiers always have lower precedence than non-numeric
      return -1;
    } else if (!aIsNum && bIsNum) {
      return 1;
    } else {
      // Compare lexically in ASCII sort order
      return aPart > bPart ? 1 : -1;
    }
  }

  return 0;
}

/**
 * Strongly-typed, immutable representation of a Makerverse Ecosystem Version.
 */
export class EcosystemVersion {
  readonly major: number;
  readonly minor: number;
  readonly revision: number;
  readonly prerelease: string | null;
  readonly build: string | null;
  readonly raw: string;

  /**
   * Alias for revision to maintain standard SemVer naming compatibility.
   */
  get patch(): number {
    return this.revision;
  }

  constructor(
    major: number,
    minor: number,
    revision: number,
    prerelease: string | null = null,
    build: string | null = null,
    raw?: string,
  ) {
    if (!Number.isInteger(major) || major < 0) {
      throw new TypeError(`Major version must be a non-negative integer, received: ${major}`);
    }
    if (!Number.isInteger(minor) || minor < 0) {
      throw new TypeError(`Minor version must be a non-negative integer, received: ${minor}`);
    }
    if (!Number.isInteger(revision) || revision < 0) {
      throw new TypeError(`Revision/patch version must be a non-negative integer, received: ${revision}`);
    }

    this.major = major;
    this.minor = minor;
    this.revision = revision;
    this.prerelease = prerelease || null;
    this.build = build || null;
    this.raw = raw ?? this.toString();
  }

  /**
   * SemVer Regular Expression supporting optional 'v' prefix, prerelease, and build metadata.
   * Group 1: Major, Group 2: Minor, Group 3: Revision/Patch, Group 4: Prerelease, Group 5: Build
   */
  private static readonly SEMVER_REGEX =
    /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

  /**
   * Parses a Semantic Version string into a strongly-typed `EcosystemVersion`.
   * Throws an Error if the version string is invalid.
   *
   * @param versionString Version string (e.g. 'v1.2.0', '1.2.0', 'v2.0.1-beta.1+build.42')
   */
  static parse(versionString: string): EcosystemVersion {
    if (typeof versionString !== "string" || !versionString.trim()) {
      throw new Error(`Invalid SemVer format: version string must be a non-empty string`);
    }

    const trimmed = versionString.trim();
    const match = trimmed.match(EcosystemVersion.SEMVER_REGEX);

    if (!match) {
      throw new Error(`Invalid SemVer format: "${versionString}". Expected format: v[major].[minor].[revision] (e.g., v1.2.0)`);
    }

    const major = parseInt(match[1], 10);
    const minor = parseInt(match[2], 10);
    const revision = parseInt(match[3], 10);
    const prerelease = match[4] || null;
    const build = match[5] || null;

    return new EcosystemVersion(major, minor, revision, prerelease, build, trimmed);
  }

  /**
   * Attempts to parse a version string, returning `null` if parsing fails.
   */
  static tryParse(versionString: string | null | undefined): EcosystemVersion | null {
    if (!versionString || typeof versionString !== "string") return null;
    try {
      return EcosystemVersion.parse(versionString);
    } catch {
      return null;
    }
  }

  /**
   * Ensures an input is converted to an `EcosystemVersion` instance.
   */
  static from(version: EcosystemVersion | string): EcosystemVersion {
    if (version instanceof EcosystemVersion) {
      return version;
    }
    return EcosystemVersion.parse(version);
  }

  /**
   * Compares this version against another version.
   * Returns:
   *  - -1 if this < other
   *  -  0 if this == other
   *  -  1 if this > other
   */
  compare(other: EcosystemVersion | string): number {
    const target = EcosystemVersion.from(other);

    if (this.major !== target.major) {
      return this.major > target.major ? 1 : -1;
    }
    if (this.minor !== target.minor) {
      return this.minor > target.minor ? 1 : -1;
    }
    if (this.revision !== target.revision) {
      return this.revision > target.revision ? 1 : -1;
    }

    return comparePrerelease(this.prerelease, target.prerelease);
  }

  /**
   * Checks if this version is strictly equal to another version (ignoring build metadata).
   */
  equals(other: EcosystemVersion | string): boolean {
    return this.compare(other) === 0;
  }

  /**
   * Checks if this version is strictly greater than another version.
   */
  greaterThan(other: EcosystemVersion | string): boolean {
    return this.compare(other) > 0;
  }

  /**
   * Checks if this version is greater than or equal to another version.
   */
  greaterThanOrEqual(other: EcosystemVersion | string): boolean {
    return this.compare(other) >= 0;
  }

  /**
   * Checks if this version is strictly less than another version.
   */
  lessThan(other: EcosystemVersion | string): boolean {
    return this.compare(other) < 0;
  }

  /**
   * Checks if this version is less than or equal to another version.
   */
  lessThanOrEqual(other: EcosystemVersion | string): boolean {
    return this.compare(other) <= 0;
  }

  /**
   * Evaluates backward-compatibility rules between this running client version and a target version:
   * 
   * 1. Major mismatch: If major versions differ, breaking changes exist -> incompatible (false).
   * 2. Major >= 1: Must share the same major version and this >= target (backward compatible additions/fixes).
   * 3. Major == 0: Initial development versioning. Minor version bumps are breaking in 0.x,
   *    so compatibility requires this.minor === target.minor and this.revision >= target.revision.
   * 
   * @param targetVersion The required minimum baseline version to check compatibility against
   */
  isCompatibleWith(targetVersion: EcosystemVersion | string): boolean {
    const target = EcosystemVersion.from(targetVersion);

    // Major mismatch is always incompatible
    if (this.major !== target.major) {
      return false;
    }

    // For 0.x.y initial development, minor bumps indicate breaking schema/API changes
    if (this.major === 0) {
      if (this.minor !== target.minor) {
        return false;
      }
      return this.revision >= target.revision;
    }

    // For 1.x.y and above, client must be >= target on the same major line
    return this.greaterThanOrEqual(target);
  }

  /**
   * Evaluates whether this version satisfies a given SemVer range constraint.
   * Supports `^1.2.0`, `~1.2.0`, `>=1.0.0 <2.0.0`, `1.0.0 - 2.0.0`, `*`, `||`, etc.
   *
   * @param constraintString The SemVer range constraint string
   */
  satisfies(constraintString: string): boolean {
    return SemVerRange.satisfies(this, constraintString);
  }

  /**
   * Formats version as standard string with optional 'v' prefix.
   */
  format(prefix = true): string {
    const p = prefix ? "v" : "";
    const pre = this.prerelease ? `-${this.prerelease}` : "";
    const bld = this.build ? `+${this.build}` : "";
    return `${p}${this.major}.${this.minor}.${this.revision}${pre}${bld}`;
  }

  /**
   * Formats version with default canonical 'v' prefix (e.g. `v1.2.0`).
   */
  toString(): string {
    return this.format(true);
  }

  /**
   * Formats for JSON serialization without 'v' prefix for standard SemVer JSON compliance.
   */
  toJSON(): string {
    return this.format(false);
  }
}

/**
 * Comparator Operator Types
 */
export type ComparatorOp = "<" | "<=" | ">" | ">=" | "=" | "" | "==";

interface SimpleComparator {
  operator: ComparatorOp;
  version: EcosystemVersion;
}

/**
 * Zero-dependency Semantic Versioning Range parser and evaluator.
 * Supports:
 *  - Simple comparators: `>`, `>=`, `<`, `<=`, `=`, `==`
 *  - Caret ranges: `^1.2.3`, `^0.2.3`, `^0.0.3`, `^1.2.x`, `^1.x`
 *  - Tilde ranges: `~1.2.3`, `~1.2`, `~1`, `~0.2.3`
 *  - Hyphen ranges: `1.2.3 - 2.3.4`
 *  - Wildcards / X-ranges: `*`, `x`, `X`, `1.x`, `1.2.*`, `1.*.*`
 *  - Conjunctions (AND): `>=1.2.0 <2.0.0`
 *  - Disjunctions (OR): `^1.0.0 || ^2.0.0`
 */
export class SemVerRange {
  private readonly comparatorSets: SimpleComparator[][];
  readonly raw: string;

  constructor(rangeString: string) {
    this.raw = rangeString.trim();
    this.comparatorSets = SemVerRange.parseRange(this.raw);
  }

  /**
   * Tests if a given version satisfies a constraint string.
   */
  static satisfies(version: EcosystemVersion | string, constraintString: string): boolean {
    const v = EcosystemVersion.from(version);
    const range = new SemVerRange(constraintString);
    return range.test(v);
  }

  /**
   * Tests if a given version satisfies this range.
   */
  test(version: EcosystemVersion | string): boolean {
    const v = EcosystemVersion.from(version);

    if (this.comparatorSets.length === 0) {
      return true; // Empty range matches all
    }

    // Disjunctions (OR): version matches if ANY comparator set is satisfied
    return this.comparatorSets.some((set) => {
      // Conjunctions (AND): version must satisfy ALL comparators in the set
      return set.every((comp) => SemVerRange.evaluateComparator(v, comp));
    });
  }

  private static evaluateComparator(v: EcosystemVersion, comp: SimpleComparator): boolean {
    const cmp = v.compare(comp.version);
    switch (comp.operator) {
      case ">":
        return cmp > 0;
      case ">=":
        return cmp >= 0;
      case "<":
        return cmp < 0;
      case "<=":
        return cmp <= 0;
      case "=":
      case "==":
      case "":
        return cmp === 0;
      default:
        return false;
    }
  }

  /**
   * Parses complex range expression into a 2D array of comparators (OR of ANDs).
   */
  private static parseRange(rangeString: string): SimpleComparator[][] {
    if (!rangeString || rangeString === "*" || rangeString === "" || rangeString.toLowerCase() === "all") {
      return [[]]; // Match anything
    }

    // Split on logical OR `||`
    const orClauses = rangeString.split("||").map((s) => s.trim()).filter(Boolean);

    return orClauses.map((clause) => {
      // Expand hyphen ranges e.g. "1.2.3 - 2.3.4"
      const expandedClause = SemVerRange.expandHyphenRanges(clause);
      // Split on whitespace to get individual comparators
      const tokens = expandedClause.split(/\s+/).filter(Boolean);

      const comparators: SimpleComparator[] = [];
      for (const token of tokens) {
        comparators.push(...SemVerRange.parseToken(token));
      }
      return comparators;
    });
  }

  /**
   * Expands hyphen ranges (e.g. `1.2.3 - 2.3.4`) into `>=1.2.3 <=2.3.4`.
   */
  private static expandHyphenRanges(clause: string): string {
    const hyphenRegex = /^\s*([v\d\w.*+-]+)\s+-\s+([v\d\w.*+-]+)\s*$/;
    const match = clause.match(hyphenRegex);
    if (!match) return clause;

    const fromVer = match[1];
    const toVer = match[2];

    const parsedTo = SemVerRange.parsePartialVersion(toVer);
    if (parsedTo.isWildcardMinor) {
      // e.g. 1.2.3 - 2.x -> >=1.2.3 <3.0.0
      return `>=${fromVer} <${parsedTo.major + 1}.0.0`;
    }
    if (parsedTo.isWildcardRevision) {
      // e.g. 1.2.3 - 2.3.x -> >=1.2.3 <2.4.0
      return `>=${fromVer} <${parsedTo.major}.${parsedTo.minor + 1}.0`;
    }

    return `>=${fromVer} <=${toVer}`;
  }

  private static parsePartialVersion(str: string): {
    major: number;
    minor: number;
    revision: number;
    isWildcardMinor: boolean;
    isWildcardRevision: boolean;
  } {
    const clean = str.replace(/^v/, "");
    const parts = clean.split(".");
    const major = parseInt(parts[0] || "0", 10);
    const isWildcardMinor = parts.length < 2 || parts[1] === "*" || parts[1]?.toLowerCase() === "x";
    const minor = isWildcardMinor ? 0 : parseInt(parts[1], 10);
    const isWildcardRevision = parts.length < 3 || parts[2] === "*" || parts[2]?.toLowerCase() === "x";
    const revision = isWildcardRevision ? 0 : parseInt(parts[2], 10);

    return { major, minor, revision, isWildcardMinor, isWildcardRevision };
  }

  /**
   * Parses a single token (e.g. `^1.2.0`, `~1.2.0`, `>=1.0.0`, `1.x`) into comparators.
   */
  private static parseToken(token: string): SimpleComparator[] {
    const t = token.trim();
    if (!t || t === "*" || t === "x" || t === "X") return [];

    // Caret ranges (`^1.2.3`, `^0.2.3`, `^0.0.3`)
    if (t.startsWith("^")) {
      return SemVerRange.expandCaret(t.slice(1));
    }

    // Tilde ranges (`~1.2.3`, `~1.2`, `~1`)
    if (t.startsWith("~")) {
      return SemVerRange.expandTilde(t.slice(1));
    }

    // Explicit comparators: >=, <=, >, <, ==, =
    const compMatch = t.match(/^(>=|<=|>|<|==|=)?\s*([v\d\w.*+-]+)$/);
    if (compMatch) {
      const op = (compMatch[1] as ComparatorOp) || "=";
      const verStr = compMatch[2];

      const partial = SemVerRange.parsePartialVersion(verStr);
      if (partial.isWildcardMinor) {
        // e.g. 1.x or 1.*
        if (op === "=" || op === "==") {
          return [
            { operator: ">=", version: new EcosystemVersion(partial.major, 0, 0) },
            { operator: "<", version: new EcosystemVersion(partial.major + 1, 0, 0) },
          ];
        }
        if (op === ">=") {
          return [{ operator: ">=", version: new EcosystemVersion(partial.major, 0, 0) }];
        }
        if (op === "<") {
          return [{ operator: "<", version: new EcosystemVersion(partial.major, 0, 0) }];
        }
        if (op === "<=") {
          return [{ operator: "<", version: new EcosystemVersion(partial.major + 1, 0, 0) }];
        }
      }

      if (partial.isWildcardRevision) {
        // e.g. 1.2.x or 1.2.*
        if (op === "=" || op === "==") {
          return [
            { operator: ">=", version: new EcosystemVersion(partial.major, partial.minor, 0) },
            { operator: "<", version: new EcosystemVersion(partial.major, partial.minor + 1, 0) },
          ];
        }
        if (op === ">=") {
          return [{ operator: ">=", version: new EcosystemVersion(partial.major, partial.minor, 0) }];
        }
        if (op === "<") {
          return [{ operator: "<", version: new EcosystemVersion(partial.major, partial.minor, 0) }];
        }
        if (op === "<=") {
          return [{ operator: "<", version: new EcosystemVersion(partial.major, partial.minor + 1, 0) }];
        }
      }

      const version = EcosystemVersion.parse(verStr);
      return [{ operator: op, version }];
    }

    // Default exact parse
    const version = EcosystemVersion.parse(t);
    return [{ operator: "=", version }];
  }

  /**
   * Caret Range Expansion Rule:
   * Allows changes that do not modify the left-most non-zero digit in [major, minor, revision].
   * - ^1.2.3 -> >=1.2.3 <2.0.0
   * - ^0.2.3 -> >=0.2.3 <0.3.0
   * - ^0.0.3 -> >=0.0.3 <0.0.4
   */
  private static expandCaret(verStr: string): SimpleComparator[] {
    const partial = SemVerRange.parsePartialVersion(verStr);
    const minVersion = EcosystemVersion.tryParse(verStr) ?? new EcosystemVersion(partial.major, partial.minor, partial.revision);

    let maxVersion: EcosystemVersion;
    if (partial.major > 0) {
      maxVersion = new EcosystemVersion(partial.major + 1, 0, 0);
    } else if (partial.minor > 0 || partial.isWildcardRevision) {
      maxVersion = new EcosystemVersion(0, partial.minor + 1, 0);
    } else {
      maxVersion = new EcosystemVersion(0, 0, partial.revision + 1);
    }

    return [
      { operator: ">=", version: minVersion },
      { operator: "<", version: maxVersion },
    ];
  }

  /**
   * Tilde Range Expansion Rule:
   * Allows patch-level changes if minor is specified; allows minor-level if only major specified.
   * - ~1.2.3 -> >=1.2.3 <1.3.0
   * - ~1.2   -> >=1.2.0 <1.3.0
   * - ~1     -> >=1.0.0 <2.0.0
   */
  private static expandTilde(verStr: string): SimpleComparator[] {
    const partial = SemVerRange.parsePartialVersion(verStr);
    const minVersion = EcosystemVersion.tryParse(verStr) ?? new EcosystemVersion(partial.major, partial.minor, partial.revision);

    let maxVersion: EcosystemVersion;
    if (partial.isWildcardMinor) {
      maxVersion = new EcosystemVersion(partial.major + 1, 0, 0);
    } else {
      maxVersion = new EcosystemVersion(partial.major, partial.minor + 1, 0);
    }

    return [
      { operator: ">=", version: minVersion },
      { operator: "<", version: maxVersion },
    ];
  }
}
