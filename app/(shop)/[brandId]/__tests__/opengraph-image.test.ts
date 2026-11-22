// @vitest-environment node
import { describe, expect, it } from "vitest";
import { getActiveDropOgSummary } from "@/lib/db/batches";
import OgImage from "@/app/(shop)/[brandId]/opengraph-image";

describe("OpenGraph ImageResponse for /[brandId]/opengraph-image", () => {
  it("generates an OpenGraph ImageResponse with valid PNG bytes", async () => {
    const summary = await getActiveDropOgSummary("get-bent");
    expect(summary.brandName).toBe("GET BENT CLOTHING");
    expect(summary.mintedCount).toBeGreaterThan(0);

    const response = await OgImage({ params: Promise.resolve({ brandId: "get-bent" }) });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("image/png");

    const bytes = new Uint8Array(await response.arrayBuffer());
    expect(bytes.byteLength).toBeGreaterThan(100);
    expect(Array.from(bytes.slice(0, 4))).toEqual([0x89, 0x50, 0x4e, 0x47]);
  });
});
