// app/api/drops/notify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceRoleClient, getSupabaseServerClient } from "@/lib/supabase/server";
import { IS_MOCK_ENABLED } from "@/lib/mock/adminData";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const batchId = typeof body.batchId === "string" ? body.batchId.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!batchId) {
      return NextResponse.json({ error: "Missing batchId" }, { status: 400 });
    }

    const supabase = getSupabaseServiceRoleClient() || getSupabaseServerClient();

    // Never trust client-supplied userId; resolve only from verified Bearer JWT
    let verifiedUserId: string | null = null;
    let verifiedUserEmail = "";
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ") && supabase) {
      const token = authHeader.substring(7).trim();
      if (token) {
        const { data: userRes, error: authErr } = await supabase.auth.getUser(token);
        if (!authErr && userRes?.user?.id) {
          verifiedUserId = userRes.user.id;
          verifiedUserEmail = userRes.user.email
            ? userRes.user.email.trim().toLowerCase()
            : "";
        }
      }
    }

    const effectiveEmail = email || verifiedUserEmail;

    if (!verifiedUserId && (!effectiveEmail || !effectiveEmail.includes("@"))) {
      return NextResponse.json(
        { error: "Valid email address or authenticated session required" },
        { status: 400 },
      );
    }

    if (supabase && UUID_REGEX.test(batchId)) {
      const { data: batch, error: batchErr } = await (supabase.from("product_batches" as any) as any)
        .select("id, is_published, is_public_teaser, goes_live_at")
        .eq("id", batchId)
        .maybeSingle();

      if (batchErr) {
        return NextResponse.json(
          { success: false, error: "Failed to verify drop window" },
          { status: 500 },
        );
      }

      if (!batch || !batch.is_published || !batch.is_public_teaser) {
        return NextResponse.json(
          { success: false, error: "Drop is not accepting launch alerts" },
          { status: 404 },
        );
      }

      if (Date.parse(batch.goes_live_at) <= Date.now()) {
        return NextResponse.json(
          { success: false, error: "Drop has already launched" },
          { status: 409 },
        );
      }

      const { error: insertErr } = await (
        supabase.from("drop_notify_subscriptions" as any) as any
      ).insert({
        batch_id: batchId,
        user_id: verifiedUserId,
        email: effectiveEmail || null,
        verified: Boolean(verifiedUserId),
      });

      // Ignore unique violation (23505) uniformly so membership is never leaked
      if (insertErr && insertErr.code !== "23505") {
        return NextResponse.json(
          { success: false, error: "Unable to register launch alert" },
          { status: 500 },
        );
      }

      if (effectiveEmail && effectiveEmail.includes("@")) {
        const { error: subErr } = await (
          supabase.from("drop_subscriptions" as any) as any
        ).upsert(
          {
            email: effectiveEmail,
            user_id: verifiedUserId,
            target_type: "batch",
            target_id: batchId,
            is_active: true,
          },
          { onConflict: "email,target_type,target_id" },
        );

        if (subErr) {
          return NextResponse.json(
            { success: false, error: "Unable to persist email alert subscription" },
            { status: 500 },
          );
        }
      }

      return NextResponse.json({
        success: true,
        persistedToDb: true,
        verified: Boolean(verifiedUserId),
        batchId,
        subscribed: true,
      });
    }

    if (!IS_MOCK_ENABLED) {
      return NextResponse.json(
        { success: false, error: "Drop notification storage is not configured" },
        { status: 503 },
      );
    }

    return NextResponse.json({
      success: true,
      persistedToDb: false,
      verified: false,
      batchId,
      subscribed: true,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to subscribe";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
