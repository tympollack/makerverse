// app/api/admin/raffle/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdminRaffles } from "@/lib/db/admin";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";

export async function GET() {
  const raffles = await getAdminRaffles();
  return NextResponse.json({ attempts: raffles });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = getSupabaseServiceRoleClient();

    if (supabase) {
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

      if (!error && data) {
        return NextResponse.json({ success: true, attempt: data });
      }
    }

    return NextResponse.json({ success: true, attempt: body });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to record raffle attempt" }, { status: 500 });
  }
}
