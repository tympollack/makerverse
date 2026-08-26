// app/api/holds/release/route.ts
import { NextRequest, NextResponse } from "next/server";
import { releaseCartHold } from "@/lib/redis/holdEngine";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { holdId, reason = "user_cancelled" } = body;

    if (!holdId) {
      return NextResponse.json({ error: "Missing holdId" }, { status: 400 });
    }

    const releaseResult = await releaseCartHold(holdId, reason);

    // Sync with Supabase staging database
    const supabase = getSupabaseServiceRoleClient();
    if (supabase) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(holdId);
      if (isUuid) {
        try {
          await (supabase as any).rpc("execute_hold_release", {
            p_hold_id: holdId,
          });
        } catch (dbErr) {
          console.warn("[holds/release] Staging DB release fallback:", dbErr);
        }
      }
    }

    return NextResponse.json(releaseResult);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to release hold" }, { status: 500 });
  }
}
