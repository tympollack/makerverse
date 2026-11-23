// lib/email/dropAlertTemplate.ts
import { formatCents } from "@/lib/utils";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export interface LiveDropBatchSummary {
  id: string;
  brandId: string;
  brandName: string;
  brandSlug: string;
  productId?: string | null;
  productLineId?: string | null;
  title: string;
  sku?: string | null;
  versionTag: string;
  artistAttribution?: string | null;
  basePriceCents: number;
  maxCap?: number | null;
  vanityAuctionEnabled: boolean;
  chipTier: string;
}

export interface DropEmailContent {
  subject: string;
  html: string;
  text: string;
}

/**
 * Renders branded `#1A1A1A` charcoal / `#CC5500` burnt orange HTML and text
 * emails for a newly LIVE Makerverse drop.
 */
export function buildDropAlertEmailContent(params: {
  batch: LiveDropBatchSummary;
  appBaseUrl: string;
  unsubscribeUrl: string;
}): DropEmailContent {
  const { batch, appBaseUrl, unsubscribeUrl } = params;
  const cleanBase = appBaseUrl.replace(/\/+$/, "");
  const dropUrl = `${cleanBase}/${encodeURIComponent(batch.brandSlug)}`;

  const isV2 = batch.versionTag.toLowerCase().startsWith("v2");
  const versionBadge = isV2
    ? `${batch.versionTag} ARTIST EDITION`
    : `${batch.versionTag} PURE-TYPE`;
  const priceLabel = formatCents(batch.basePriceCents);
  const capLabel = batch.maxCap ? `1-of-${batch.maxCap} Limited Cap` : "Uncapped 1-of-N Edition";
  const auctionHighlight = batch.vanityAuctionEnabled
    ? "Vanity Serial Auction & #69 / Low-Number Bidding Open"
    : "Direct Serialized Drop Checkout Open";

  const subject = `[LIVE DROP] ${batch.brandName}: ${batch.title} (${batch.versionTag})`;

  const safeBrand = escapeHtml(batch.brandName);
  const safeTitle = escapeHtml(batch.title);
  const safeVersion = escapeHtml(versionBadge);
  const safePrice = escapeHtml(priceLabel);
  const safeCap = escapeHtml(capLabel);
  const safeAuction = escapeHtml(auctionHighlight);
  const safeTier = escapeHtml(batch.chipTier);
  const safeAttr = batch.artistAttribution ? escapeHtml(batch.artistAttribution) : null;
  const safeDropUrl = escapeHtml(dropUrl);
  const safeUnsubUrl = escapeHtml(unsubscribeUrl);

  const text = [
    `${batch.brandName} — DROP NOW LIVE`,
    "",
    `${batch.title} (${versionBadge})`,
    batch.artistAttribution ? `Attribution: ${batch.artistAttribution}` : null,
    `Base Price: ${priceLabel}`,
    `Edition: ${capLabel} · ${batch.chipTier}`,
    `Highlight: ${auctionHighlight}`,
    "",
    `Shop the drop: ${dropUrl}`,
    "",
    `Unsubscribe from these alerts: ${unsubscribeUrl}`,
  ]
    .filter((line) => line !== null)
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#1A1A1A;color:#F9F9F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#1A1A1A;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:#121212;border:1px solid rgba(204,85,0,0.4);border-radius:20px;overflow:hidden;box-shadow:0 24px 48px rgba(0,0,0,0.65);">
          <tr>
            <td style="padding:28px 32px 20px 32px;border-bottom:1px solid rgba(255,255,255,0.08);">
              <div style="display:inline-block;padding:4px 12px;border-radius:9999px;background-color:rgba(204,85,0,0.18);border:1px solid rgba(204,85,0,0.5);margin-bottom:14px;">
                <span style="font-family:monospace;font-size:11px;font-weight:700;color:#fb923c;letter-spacing:1px;text-transform:uppercase;">
                  ${safeBrand} · ${safeVersion}
                </span>
              </div>
              <h1 style="margin:0;font-size:24px;font-weight:800;line-height:1.25;color:#F9F9F9;letter-spacing:-0.4px;">
                ${safeTitle}
              </h1>
              ${
                safeAttr
                  ? `<p style="margin:8px 0 0 0;font-family:monospace;font-size:12px;color:#fdba74;">${safeAttr}</p>`
                  : ""
              }
            </td>
          </tr>

          <tr>
            <td style="padding:24px 32px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#1A1A1A;border:1px solid rgba(255,255,255,0.08);border-radius:14px;margin-bottom:20px;">
                <tr>
                  <td style="padding:14px 18px;border-bottom:1px solid rgba(255,255,255,0.06);">
                    <span style="font-family:monospace;font-size:11px;color:#A1A1AA;text-transform:uppercase;">Base Price</span>
                    <div style="font-family:monospace;font-size:20px;font-weight:800;color:#F9F9F9;margin-top:2px;">${safePrice}</div>
                  </td>
                  <td style="padding:14px 18px;border-bottom:1px solid rgba(255,255,255,0.06);text-align:right;">
                    <span style="font-family:monospace;font-size:11px;color:#A1A1AA;text-transform:uppercase;">Edition Spec</span>
                    <div style="font-family:monospace;font-size:13px;font-weight:700;color:#22D3EE;margin-top:4px;">${safeCap}</div>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding:12px 18px;font-family:monospace;font-size:12px;color:#E4E4E7;">
                    <strong style="color:#CC5500;">LIVE:</strong> ${safeAuction} · ${safeTier}
                  </td>
                </tr>
              </table>

              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin:0 0 22px 0;">
                <tr>
                  <td align="center">
                    <a href="${safeDropUrl}" style="display:inline-block;background:linear-gradient(135deg,#CC5500 0%,#9A3D00 100%);color:#FFFFFF;text-decoration:none;padding:14px 30px;border-radius:12px;font-family:monospace;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">
                      Enter Live Drop &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-family:monospace;font-size:11px;color:#71717A;line-height:1.5;word-break:break-all;">
                Direct link: <a href="${safeDropUrl}" style="color:#22D3EE;text-decoration:underline;">${safeDropUrl}</a>
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:16px 32px;background-color:#0D0D0D;border-top:1px solid rgba(255,255,255,0.08);text-align:center;">
              <p style="margin:0;font-family:monospace;font-size:11px;color:#71717A;">
                Makerverse Drop Alerts · SunShade Systems &nbsp;|&nbsp;
                <a href="${safeUnsubUrl}" style="color:#A1A1AA;text-decoration:underline;">One-Click Unsubscribe</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}
