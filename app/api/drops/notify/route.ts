// app/api/drops/notify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceRoleClient, getSupabaseServerClient } from "@/lib/supabase/server";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const batchId = typeof body.batchId === "string" ? body.batchId.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const userId = typeof body.userId === "string" ? body.userId.trim() : null;

    if (!batchId) {
      return NextResponse.json({ error: "Missing batchId" }, { status: 400 });
    }

    if (!userId && (!email || !email.includes("@"))) {
      return NextResponse.json({ error: "Valid email or account required" }, { status: 400 });
    }

    const supabase = getSupabaseServiceRoleClient() || getSupabaseServerClient();
    if (supabase && UUID_REGEX.test(batchId)) {
      const { error } = await (supabase.from("drop_notify_subscriptions" as any) as any).insert({
        batch_id: batchId,
        user_id: userId && UUID_REGEX.test(userId) ? userId : null,
        email: email || null,
      });

      if (error) {
        console.warn("[drops/notify] DB notice:", error.message);
        return NextResponse.json({
          success: true,
          persistedToDb: false,
          batchId,
          subscribed: true,
        });
      }

      return NextResponse.json({
        success: true,
        persistedToDb: true,
        batchId,
        subscribed: true,
      });
    }

    return NextResponse.json({
      success: true,
      persistedToDb: false,
      batchId,
      subscribed: true,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to subscribe";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
