// app/(shop)/[brandId]/opengraph-image.tsx
import { ImageResponse } from "next/og";
import { getActiveDropOgSummary } from "@/lib/db/batches";

export const dynamic = "force-dynamic";
export const alt = "Makerverse Live Drop OpenGraph Card";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ brandId: string }>;
}) {
  const { brandId } = await params;
  const summary = await getActiveDropOgSummary(brandId);

  const badgeLabel = `${summary.versionTag.toUpperCase()} · ${summary.releaseStatus}`;
  const brandLine = `${summary.brandName} (${summary.brandHandle})`;
  const mintedLine = `${summary.mintedCount} MINTED SO FAR`;
  const bidLine = `$${summary.topBidDollars}.00`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#1A1A1A",
          color: "#F9F9F9",
          padding: "56px 64px",
          fontFamily: "monospace",
          border: "8px solid #CC5500",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: 24,
              fontWeight: 700,
              color: "#CC5500",
              letterSpacing: "0.14em",
            }}
          >
            MAKERVERSE // PHYGITAL DROP
          </div>
          <div
            style={{
              display: "flex",
              padding: "10px 20px",
              borderRadius: "999px",
              backgroundColor: "rgba(204, 85, 0, 0.2)",
              border: "2px solid #CC5500",
              color: "#FDBA74",
              fontSize: 20,
              fontWeight: 700,
            }}
          >
            {badgeLabel}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div
            style={{
              display: "flex",
              fontSize: 30,
              color: "#22D3EE",
              fontWeight: 700,
            }}
          >
            {brandLine}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 54,
              fontWeight: 800,
              lineHeight: 1.1,
              color: "#F9F9F9",
            }}
          >
            {summary.dropHeadline}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "2px solid rgba(255,255,255,0.14)",
            paddingTop: "28px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ display: "flex", fontSize: 18, color: "rgba(255,255,255,0.55)" }}>
              LIVE EDITION COUNTER
            </div>
            <div style={{ display: "flex", fontSize: 36, fontWeight: 800, color: "#22D3EE" }}>
              {mintedLine}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: "6px",
            }}
          >
            <div style={{ display: "flex", fontSize: 18, color: "rgba(255,255,255,0.55)" }}>
              CURRENT #069 AUCTION LEADER
            </div>
            <div style={{ display: "flex", fontSize: 36, fontWeight: 800, color: "#CC5500" }}>
              {bidLine}
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
