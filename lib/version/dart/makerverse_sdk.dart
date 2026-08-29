// lib/version/dart/makerverse_sdk.dart
/// Makerverse Shared SDK - Dart/Flutter Semantic Versioning Engine
///
/// Implements zero-dependency Semantic Versioning (v[major].[minor].[revision]),
/// feature gating, payload envelope validation, and runtime gateway handshake
/// for cross-platform Flutter/Dart client applications.
library makerverse_sdk;

/// Strongly-typed, immutable representation of a Makerverse Ecosystem Version.
class EcosystemVersion implements Comparable<EcosystemVersion> {
  final int major;
  final int minor;
  final int revision;
  final String? prerelease;
  final String? build;
  final String raw;

  int get patch => revision;

  EcosystemVersion(
    this.major,
    this.minor,
    this.revision, {
    this.prerelease,
    this.build,
    String? raw,
  })  : assert(major >= 0, 'Major version must be non-negative'),
        assert(minor >= 0, 'Minor version must be non-negative'),
        assert(revision >= 0, 'Revision/patch version must be non-negative'),
        raw = raw ?? 'v$major.$minor.$revision${prerelease != null ? '-$prerelease' : ''}${build != null ? '+$build' : ''}';

  static final RegExp _semverRegex = RegExp(
    r'^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$',
  );

  /// Parses a Semantic Version string into an [EcosystemVersion].
  factory EcosystemVersion.parse(String versionString) {
    final trimmed = versionString.trim();
    final match = _semverRegex.firstMatch(trimmed);
    if (match == null) {
      throw FormatException(
        'Invalid SemVer format: "$versionString". Expected format: v[major].[minor].[revision] (e.g. v1.2.0)',
      );
    }

    final major = int.parse(match.group(1)!);
    final minor = int.parse(match.group(2)!);
    final revision = int.parse(match.group(3)!);
    final prerelease = match.group(4);
    final build = match.group(5);

    return EcosystemVersion(
      major,
      minor,
      revision,
      prerelease: prerelease,
      build: build,
      raw: trimmed,
    );
  }

  /// Attempts to parse a version string, returning null on failure.
  static EcosystemVersion? tryParse(String? versionString) {
    if (versionString == null || versionString.isEmpty) return null;
    try {
      return EcosystemVersion.parse(versionString);
    } catch (_) {
      return null;
    }
  }

  @override
  int compareTo(EcosystemVersion other) {
    if (major != other.major) return major.compareTo(other.major);
    if (minor != other.minor) return minor.compareTo(other.minor);
    if (revision != other.revision) return revision.compareTo(other.revision);

    if (prerelease == null && other.prerelease == null) return 0;
    if (prerelease == null && other.prerelease != null) return 1;
    if (prerelease != null && other.prerelease == null) return -1;

    return (prerelease ?? '').compareTo(other.prerelease ?? '');
  }

  bool operator <(EcosystemVersion other) => compareTo(other) < 0;
  bool operator <=(EcosystemVersion other) => compareTo(other) <= 0;
  bool operator >(EcosystemVersion other) => compareTo(other) > 0;
  bool operator >=(EcosystemVersion other) => compareTo(other) >= 0;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is EcosystemVersion &&
          major == other.major &&
          minor == other.minor &&
          revision == other.revision &&
          prerelease == other.prerelease;

  @override
  int get hashCode => Object.hash(major, minor, revision, prerelease);

  /// Evaluates backward-compatibility rules between this running client version and target.
  bool isCompatibleWith(EcosystemVersion target) {
    if (major != target.major) return false;
    if (major == 0) {
      if (minor != target.minor) return false;
      return revision >= target.revision;
    }
    return this >= target;
  }

  /// Evaluates SemVer range constraint (e.g. `^1.2.0`, `~1.2.0`, `>=1.0.0 <2.0.0`).
  bool satisfies(String constraintString) {
    return SemVerRange.satisfies(this, constraintString);
  }

  String format({bool prefix = true}) {
    final p = prefix ? 'v' : '';
    final pre = prerelease != null ? '-$prerelease' : '';
    final bld = build != null ? '+$build' : '';
    return '$p$major.$minor.$revision$pre$bld';
  }

  @override
  String toString() => format(prefix: true);

  String toJson() => format(prefix: false);
}

/// Zero-dependency SemVer Range Evaluator in Dart.
class SemVerRange {
  final String raw;

  SemVerRange(this.raw);

  static bool satisfies(EcosystemVersion version, String constraintString) {
    final trimmed = constraintString.trim();
    if (trimmed.isEmpty || trimmed == '*' || trimmed == 'all') return true;

    // Split on disjunction ||
    final orBranches = trimmed.split('||');
    for (final branch in orBranches) {
      if (_evaluateAndBranch(version, branch.trim())) {
        return true;
      }
    }
    return false;
  }

  static bool _evaluateAndBranch(EcosystemVersion version, String branch) {
    final tokens = branch.split(RegExp(r'\s+')).where((t) => t.isNotEmpty);
    for (final token in tokens) {
      if (!_evaluateToken(version, token)) {
        return false;
      }
    }
    return true;
  }

  static bool _evaluateToken(EcosystemVersion version, String token) {
    if (token.startsWith('^')) {
      final base = EcosystemVersion.parse(token.substring(1));
      if (version < base) return false;
      if (base.major > 0) {
        return version.major == base.major;
      } else if (base.minor > 0) {
        return version.major == 0 && version.minor == base.minor;
      } else {
        return version.major == 0 && version.minor == 0 && version.revision == base.revision;
      }
    }

    if (token.startsWith('~')) {
      final base = EcosystemVersion.parse(token.substring(1));
      if (version < base) return false;
      return version.major == base.major && version.minor == base.minor;
    }

    if (token.startsWith('>=')) {
      return version >= EcosystemVersion.parse(token.substring(2));
    }
    if (token.startsWith('>')) {
      return version > EcosystemVersion.parse(token.substring(1));
    }
    if (token.startsWith('<=')) {
      return version <= EcosystemVersion.parse(token.substring(2));
    }
    if (token.startsWith('<')) {
      return version < EcosystemVersion.parse(token.substring(1));
    }
    if (token.startsWith('=')) {
      return version == EcosystemVersion.parse(token.substring(1));
    }

    final exact = EcosystemVersion.tryParse(token);
    if (exact != null) {
      return version == exact;
    }

    return true;
  }
}

/// Feature Definition model in Dart.
class FeatureDefinition {
  final String key;
  final EcosystemVersion? minVersion;
  final EcosystemVersion? maxVersion;
  final String? constraint;
  final String? description;
  final bool enabled;

  FeatureDefinition({
    required this.key,
    this.minVersion,
    this.maxVersion,
    this.constraint,
    this.description,
    this.enabled = true,
  });
}

/// Feature Gate Engine for Dart/Flutter applications.
class FeatureGateEngine {
  final Map<String, FeatureDefinition> _features = {};
  EcosystemVersion clientVersion;

  FeatureGateEngine({
    required this.clientVersion,
    List<FeatureDefinition>? initialFeatures,
  }) {
    if (initialFeatures != null) {
      for (final f in initialFeatures) {
        registerFeature(f);
      }
    }
  }

  void registerFeature(FeatureDefinition feature) {
    _features[feature.key] = feature;
  }

  bool supportsFeature(String key, {EcosystemVersion? overrideVersion}) {
    final feature = _features[key];
    if (feature == null || !feature.enabled) return false;

    final ver = overrideVersion ?? clientVersion;

    if (feature.constraint != null && !ver.satisfies(feature.constraint!)) {
      return false;
    }
    if (feature.minVersion != null && ver < feature.minVersion!) {
      return false;
    }
    if (feature.maxVersion != null && ver > feature.maxVersion!) {
      return false;
    }

    return true;
  }
}

/// Version Lifecycle Event Constants in Dart.
abstract class VersionLifecycleEvents {
  static const String onVersionCompatible = 'ON_VERSION_COMPATIBLE';
  static const String onUpdateRecommended = 'ON_UPDATE_RECOMMENDED';
  static const String onVersionDeprecated = 'ON_VERSION_DEPRECATED';
  static const String onForceUpdateRequired = 'ON_FORCE_UPDATE_REQUIRED';
}

/// Gateway Handshake Configuration in Dart.
class GatewayHandshakeConfig {
  final EcosystemVersion gatewayVersion;
  final EcosystemVersion minSupportedVersion;
  final EcosystemVersion recommendedVersion;
  final List<EcosystemVersion>? deprecatedVersions;
  final Map<String, int>? sunsetTimestamps;
  final String? message;

  GatewayHandshakeConfig({
    required this.gatewayVersion,
    required this.minSupportedVersion,
    required this.recommendedVersion,
    this.deprecatedVersions,
    this.sunsetTimestamps,
    this.message,
  });
}

/// Handshake Result model.
class HandshakeResult {
  final String status;
  final bool compatible;
  final bool actionRequired;
  final String message;
  final EcosystemVersion clientVersion;
  final EcosystemVersion gatewayVersion;
  final EcosystemVersion minSupportedVersion;
  final EcosystemVersion recommendedVersion;

  HandshakeResult({
    required this.status,
    required this.compatible,
    required this.actionRequired,
    required this.message,
    required this.clientVersion,
    required this.gatewayVersion,
    required this.minSupportedVersion,
    required this.recommendedVersion,
  });
}

/// Runtime Handshake Validator.
HandshakeResult validateClientVersion(
  EcosystemVersion clientVersion,
  GatewayHandshakeConfig gatewayConfig,
) {
  if (clientVersion < gatewayConfig.minSupportedVersion ||
      clientVersion.major < gatewayConfig.minSupportedVersion.major) {
    return HandshakeResult(
      status: 'force_update_required',
      compatible: false,
      actionRequired: true,
      message: gatewayConfig.message ??
          'Client version ${clientVersion.toString()} is below minimum supported version (${gatewayConfig.minSupportedVersion.toString()}).',
      clientVersion: clientVersion,
      gatewayVersion: gatewayConfig.gatewayVersion,
      minSupportedVersion: gatewayConfig.minSupportedVersion,
      recommendedVersion: gatewayConfig.recommendedVersion,
    );
  }

  final isDeprecated = gatewayConfig.deprecatedVersions?.any((d) => d == clientVersion) ?? false;
  if (isDeprecated) {
    return HandshakeResult(
      status: 'deprecated',
      compatible: true,
      actionRequired: false,
      message: gatewayConfig.message ??
          'Client version ${clientVersion.toString()} is deprecated. Please upgrade to ${gatewayConfig.recommendedVersion.toString()}.',
      clientVersion: clientVersion,
      gatewayVersion: gatewayConfig.gatewayVersion,
      minSupportedVersion: gatewayConfig.minSupportedVersion,
      recommendedVersion: gatewayConfig.recommendedVersion,
    );
  }

  if (clientVersion < gatewayConfig.recommendedVersion) {
    return HandshakeResult(
      status: 'update_recommended',
      compatible: true,
      actionRequired: false,
      message: gatewayConfig.message ??
          'A newer recommended version (${gatewayConfig.recommendedVersion.toString()}) is available.',
      clientVersion: clientVersion,
      gatewayVersion: gatewayConfig.gatewayVersion,
      minSupportedVersion: gatewayConfig.minSupportedVersion,
      recommendedVersion: gatewayConfig.recommendedVersion,
    );
  }

  return HandshakeResult(
    status: 'compatible',
    compatible: true,
    actionRequired: false,
    message: gatewayConfig.message ?? 'Client version is fully compatible.',
    clientVersion: clientVersion,
    gatewayVersion: gatewayConfig.gatewayVersion,
    minSupportedVersion: gatewayConfig.minSupportedVersion,
    recommendedVersion: gatewayConfig.recommendedVersion,
  );
}
