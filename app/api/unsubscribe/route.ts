// app/api/unsubscribe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient, getSupabaseServiceRoleClient } from "@/lib/supabase/server";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderPageHtml(options: {
  title: string;
  badge: string;
  heading: string;
  body: string;
  success: boolean;
  confirmActionUrl?: string;
}): string {
  const accent = options.success ? "#CC5500" : "#EF4444";
  const badgeColor = options.success ? "#fb923c" : "#fca5a5";
  const badgeBg = options.success ? "rgba(204,85,0,0.16)" : "rgba(239,68,68,0.16)";
  const badgeBorder = options.success ? "rgba(204,85,0,0.45)" : "rgba(239,68,68,0.45)";

  const actionMarkup = options.confirmActionUrl
    ? `<form method="POST" action="${escapeHtml(options.confirmActionUrl)}" style="margin:0 0 14px 0;">
         <button type="submit" style="display:inline-block;padding:12px 26px;border:none;border-radius:12px;background:#CC5500;color:#FFFFFF;cursor:pointer;font-family:monospace;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;">
           Confirm Unsubscribe
         </button>
       </form>
       <a href="/" style="display:inline-block;font-family:monospace;font-size:11px;color:#A1A1AA;text-decoration:underline;">
         Keep alerts active &amp; return to Makerverse
       </a>`
    : `<a href="/" style="display:inline-block;padding:12px 24px;border-radius:12px;background:${accent};color:#FFFFFF;text-decoration:none;font-family:monospace;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;">
         Return to Makerverse
       </a>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(options.title)}</title>
</head>
<body style="margin:0;padding:32px 16px;background-color:#1A1A1A;color:#F9F9F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;">
  <main style="max-width:480px;width:100%;background-color:#121212;border:1px solid rgba(255,255,255,0.12);border-radius:20px;padding:32px;box-shadow:0 24px 48px rgba(0,0,0,0.6);text-align:center;">
    <div style="display:inline-block;padding:4px 12px;border-radius:9999px;background:${badgeBg};border:1px solid ${badgeBorder};font-family:monospace;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${badgeColor};margin-bottom:18px;">
      ${escapeHtml(options.badge)}
    </div>
    <h1 style="margin:0 0 12px 0;font-size:22px;font-weight:800;letter-spacing:-0.4px;color:#F9F9F9;">
      ${escapeHtml(options.heading)}
    </h1>
    <p style="margin:0 0 24px 0;font-size:14px;line-height:1.6;color:#A1A1AA;">
      ${escapeHtml(options.body)}
    </p>
    ${actionMarkup}
  </main>
</body>
</html>`;
}

function getTargetLabel(targetType?: string): string {
  if (targetType === "brand") return "brand line drop alerts";
  if (targetType === "product_line") return "product line drop alerts";
  return "drop launch alerts";
}

async function lookupByToken(token: string): Promise<{
  ok: boolean;
  status: number;
  targetType?: string;
  isActive?: boolean;
  error?: string;
}> {
  if (!UUID_REGEX.test(token)) {
    return { ok: false, status: 400, error: "Invalid unsubscribe token." };
  }

  const supabase = getSupabaseServiceRoleClient() || getSupabaseServerClient();
  if (!supabase) {
    return { ok: false, status: 503, error: "Subscription service unavailable." };
  }

  const { data, error } = await (supabase.from("drop_subscriptions" as any) as any)
    .select("id, target_type, is_active")
    .eq("unsubscribe_token", token)
    .maybeSingle();

  if (error) {
    return { ok: false, status: 500, error: "Unable to verify unsubscribe link." };
  }
  if (!data) {
    return { ok: false, status: 404, error: "Subscription not found." };
  }

  return {
    ok: true,
    status: 200,
    targetType: data.target_type,
    isActive: Boolean(data.is_active),
  };
}

async function deactivateByToken(token: string): Promise<{
  ok: boolean;
  status: number;
  found: boolean;
  targetType?: string;
  error?: string;
}> {
  if (!UUID_REGEX.test(token)) {
    return { ok: false, status: 400, found: false, error: "Invalid unsubscribe token." };
  }

  const supabase = getSupabaseServiceRoleClient() || getSupabaseServerClient();
  if (!supabase) {
    return {
      ok: false,
      status: 503,
      found: false,
      error: "Subscription service unavailable.",
    };
  }

  const { data: updatedRow, error: updateErr } = await (
    supabase.from("drop_subscriptions" as any) as any
  )
    .update({ is_active: false })
    .eq("unsubscribe_token", token)
    .select("id, target_type, target_id, is_active")
    .maybeSingle();

  if (!updateErr && updatedRow) {
    return {
      ok: true,
      status: 200,
      found: true,
      targetType: updatedRow.target_type,
    };
  }

  if (updateErr) {
    const { data: rpcData, error: rpcErr } = await (supabase.rpc as any)(
      "unsubscribe_drop_subscription",
      { p_token: token },
    );
    if (!rpcErr && rpcData) {
      if (!rpcData.found) {
        return { ok: false, status: 404, found: false, error: "Subscription not found." };
      }
      return {
        ok: true,
        status: 200,
        found: true,
        targetType: rpcData.target_type,
      };
    }

    return {
      ok: false,
      status: 500,
      found: false,
      error: "Unable to process unsubscribe request.",
    };
  }

  return { ok: false, status: 404, found: false, error: "Subscription not found." };
}

/**
 * Safe read-only GET handler so mail link scanners never deactivate alerts on prefetch.
 * Renders a confirmation form that submits POST /api/unsubscribe?token=...
 */
export async function GET(request: NextRequest) {
  const token = (request.nextUrl.searchParams.get("token") || "").trim();
  const lookup = await lookupByToken(token);

  if (!lookup.ok) {
    const html = renderPageHtml({
      title: "Unsubscribe Error · Makerverse",
      badge: "Unsubscribe Failed",
      heading: lookup.status === 404 ? "Subscription Not Found" : "Invalid Unsubscribe Link",
      body:
        lookup.error ||
        "This unsubscribe link is invalid or has already expired. No further action is required.",
      success: false,
    });
    return new NextResponse(html, {
      status: lookup.status,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const targetLabel = getTargetLabel(lookup.targetType);

  if (!lookup.isActive) {
    const html = renderPageHtml({
      title: "Already Unsubscribed · Makerverse Drop Alerts",
      badge: "Already Inactive",
      heading: "You're Already Unsubscribed",
      body: `Alerts for these ${targetLabel} are already disabled.`,
      success: true,
    });
    return new NextResponse(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const html = renderPageHtml({
    title: "Confirm Unsubscribe · Makerverse Drop Alerts",
    badge: "Drop Alert Preferences",
    heading: "Unsubscribe from Drop Alerts?",
    body: `Click below to confirm stopping ${targetLabel} for this subscription.`,
    success: true,
    confirmActionUrl: `/api/unsubscribe?token=${encodeURIComponent(token)}`,
  });

  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

/**
 * Handles both explicit browser confirmation form POST and RFC 8058 mail-client
 * one-click POST requests to deactivate the subscription.
 */
export async function POST(request: NextRequest) {
  const token = (request.nextUrl.searchParams.get("token") || "").trim();
  const result = await deactivateByToken(token);
  const accept = request.headers.get("accept") || "";
  const wantsHtml = accept.includes("text/html");

  if (!result.ok) {
    if (wantsHtml) {
      const html = renderPageHtml({
        title: "Unsubscribe Error · Makerverse",
        badge: "Unsubscribe Failed",
        heading: result.status === 404 ? "Subscription Not Found" : "Invalid Unsubscribe Link",
        body: result.error || "Unable to process unsubscribe request.",
        success: false,
      });
      return new NextResponse(html, {
        status: result.status,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }
    return NextResponse.json(
      { success: false, unsubscribed: false, error: result.error },
      { status: result.status },
    );
  }

  if (wantsHtml) {
    const targetLabel = getTargetLabel(result.targetType);
    const html = renderPageHtml({
      title: "Unsubscribed · Makerverse Drop Alerts",
      badge: "Preferences Updated",
      heading: "You've Been Unsubscribed",
      body: `You will no longer receive ${targetLabel} for this subscription. You can re-enable alerts anytime on Makerverse.`,
      success: true,
    });
    return new NextResponse(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  return NextResponse.json({
    success: true,
    unsubscribed: true,
    targetType: result.targetType,
  });
}
