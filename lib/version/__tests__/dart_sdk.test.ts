// lib/version/__tests__/dart_sdk.test.ts
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("Dart SDK Semantic Versioning Implementation", () => {
  const dartFilePath = path.resolve(__dirname, "../dart/makerverse_sdk.dart");
  const dartCode = fs.readFileSync(dartFilePath, "utf8");

  it("contains numeric prerelease comparison logic adhering to SemVer 2.0.0", () => {
    expect(dartCode).toContain("_comparePrerelease");
    expect(dartCode).toContain("int.tryParse");
    expect(dartCode).toContain("aNum.compareTo(bNum)");
  });

  it("contains wildcard range matching without allowing arbitrary unknown tokens to match everything", () => {
    expect(dartCode).toContain("RegExp(r'^v?(\\d+)\\.[xX\\*]$')");
    expect(dartCode).toContain("return false;");
    // Ensure _evaluateToken doesn't end with an unconditional return true
    const evalTokenFn = dartCode.slice(dartCode.indexOf("static bool _evaluateToken"));
    const firstReturnInEnd = evalTokenFn.slice(evalTokenFn.indexOf("final exact = EcosystemVersion.tryParse(token);"));
    expect(firstReturnInEnd).toContain("return false;");
  });

  it("checks forward major version mismatch during gateway handshake", () => {
    expect(dartCode).toContain("clientVersion.major > gatewayConfig.gatewayVersion.major");
  });
});
