// app/api/admin/raffle/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdminRaffles } from "@/lib/db/admin";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { verifyAdminAuth } from "@/lib/auth/adminAuth";

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
  }

  const raffles = await getAdminRaffles();
  return NextResponse.json({ attempts: raffles });
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdminAuth(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    const body = await request.json();
    if (!body.attendeeHandle || !body.outcome) {
      return NextResponse.json(
        { error: "Missing required fields: attendeeHandle and outcome" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Database persistence not configured" },
        { status: 503 }
      );
    }

    const { data, error } = await supabase.from("raffle_attempts").insert({
      installation_id: body.stationId || "a0000001-0000-0000-0000-000000000001",
      attendee_handle: body.attendeeHandle,
      outcome: body.outcome,
      prize_won: body.prizeWon || null,
      reward_code: body.rewardCode || null,
      discount_percent: body.discountPercent || null,
      dispatch_status: body.dispatchStatus || "CLAIMED",
      qr_payload: body.qrPayload || null,
    } as any).select().single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, attempt: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to record raffle attempt" }, { status: 500 });
  }
}
