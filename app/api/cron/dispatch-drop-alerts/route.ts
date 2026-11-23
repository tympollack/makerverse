// app/api/cron/dispatch-drop-alerts/route.ts
import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { dispatchPendingDropAlerts } from "@/lib/email/dropAlerts";

function constantTimeMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function isAuthorizedCronRequest(request: NextRequest): {
  authorized: boolean;
  configured: boolean;
} {
  const expectedSecrets = [
    process.env.CRON_SECRET,
    process.env.INTERNAL_WEBHOOK_TOKEN,
  ].filter((v): v is string => typeof v === "string" && v.trim().length > 0);

  if (expectedSecrets.length === 0) {
    return { authorized: false, configured: false };
  }

  const authHeader = request.headers.get("authorization") || "";
  const bearerToken = authHeader.startsWith("Bearer ")
    ? authHeader.substring(7).trim()
    : "";
  const headerToken = (request.headers.get("x-cron-secret") || "").trim();
  const provided = bearerToken || headerToken;

  if (!provided) {
    return { authorized: false, configured: true };
  }

  const matched = expectedSecrets.some((secret) =>
    constantTimeMatch(provided, secret.trim()),
  );
  return { authorized: matched, configured: true };
}

export async function POST(request: NextRequest) {
  const auth = isAuthorizedCronRequest(request);
  if (!auth.configured) {
    return NextResponse.json(
      { error: "CRON_SECRET or INTERNAL_WEBHOOK_TOKEN is not configured" },
      { status: 503 },
    );
  }

  if (!auth.authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase service role client is not configured" },
      { status: 503 },
    );
  }

  try {
    let batchId: string | undefined;
    const rawBody = await request.text();
    if (rawBody.trim()) {
      const parsed = JSON.parse(rawBody) as { batchId?: unknown };
      if (typeof parsed.batchId === "string" && parsed.batchId.trim()) {
        batchId = parsed.batchId.trim();
      }
    }

    const result = await dispatchPendingDropAlerts({
      supabase,
      batchId,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to dispatch drop alerts";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
