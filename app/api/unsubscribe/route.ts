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

function renderConfirmationHtml(options: {
  title: string;
  badge: string;
  heading: string;
  body: string;
  success: boolean;
}): string {
  const accent = options.success ? "#CC5500" : "#EF4444";
  const badgeColor = options.success ? "#fb923c" : "#fca5a5";
  const badgeBg = options.success ? "rgba(204,85,0,0.16)" : "rgba(239,68,68,0.16)";
  const badgeBorder = options.success ? "rgba(204,85,0,0.45)" : "rgba(239,68,68,0.45)";

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
    <a href="/" style="display:inline-block;padding:12px 24px;border-radius:12px;background:${accent};color:#FFFFFF;text-decoration:none;font-family:monospace;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;">
      Return to Makerverse
    </a>
  </main>
</body>
</html>`;
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

  // Prefer SECURITY DEFINER RPC when available; fallback to direct service-role update.
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

export async function GET(request: NextRequest) {
  const token = (request.nextUrl.searchParams.get("token") || "").trim();
  const result = await deactivateByToken(token);

  if (!result.ok) {
    const html = renderConfirmationHtml({
      title: "Unsubscribe Error · Makerverse",
      badge: "Unsubscribe Failed",
      heading: result.status === 404 ? "Subscription Not Found" : "Invalid Unsubscribe Link",
      body:
        result.error ||
        "This unsubscribe link is invalid or has already expired. No further action is required.",
      success: false,
    });
    return new NextResponse(html, {
      status: result.status,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const targetLabel =
    result.targetType === "brand"
      ? "brand line drop alerts"
      : result.targetType === "product_line"
        ? "product line drop alerts"
        : "drop launch alerts";

  const html = renderConfirmationHtml({
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

/**
 * RFC 8058 One-Click POST endpoint invoked by mail clients supporting List-Unsubscribe-Post.
 */
export async function POST(request: NextRequest) {
  const token = (request.nextUrl.searchParams.get("token") || "").trim();
  const result = await deactivateByToken(token);

  if (!result.ok) {
    return NextResponse.json(
      { success: false, unsubscribed: false, error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({
    success: true,
    unsubscribed: true,
    targetType: result.targetType,
  });
}
