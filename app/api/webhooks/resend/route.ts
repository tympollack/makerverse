// app/api/webhooks/resend/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";
import {
  extractWebhookHeaders,
  ingestResendWebhookEvent,
  verifyResendWebhookSignature,
  type ResendWebhookPayload,
} from "@/lib/email/telemetryWebhook";

export async function POST(request: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim() || "";
  if (!secret) {
    return NextResponse.json(
      { error: "RESEND_WEBHOOK_SECRET is not configured" },
      { status: 503 },
    );
  }

  let rawBody = "";
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json({ error: "Unable to read webhook body" }, { status: 400 });
  }

  const sigHeaders = extractWebhookHeaders(request.headers);
  const verification = verifyResendWebhookSignature({
    rawBody,
    headers: sigHeaders,
    secret,
  });

  if (!verification.ok) {
    return NextResponse.json(
      { error: verification.error || "Unauthorized webhook signature" },
      { status: 401 },
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON webhook payload" }, { status: 400 });
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    typeof (parsed as { type?: unknown }).type !== "string" ||
    !(parsed as { data?: unknown }).data ||
    typeof (parsed as { data?: unknown }).data !== "object"
  ) {
    return NextResponse.json(
      { error: "Invalid Resend webhook event structure" },
      { status: 400 },
    );
  }

  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase service role client is not configured" },
      { status: 503 },
    );
  }

  try {
    const result = await ingestResendWebhookEvent({
      supabase,
      payload: parsed as ResendWebhookPayload,
      svixId: sigHeaders.id || null,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to process Resend webhook event";
    const status = message === "MISSING_RESEND_EMAIL_ID" ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
