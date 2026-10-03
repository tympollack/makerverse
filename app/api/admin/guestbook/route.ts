// app/api/admin/guestbook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdminGuestbook } from "@/lib/db/admin";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";

export async function GET() {
  const entries = await getAdminGuestbook();
  return NextResponse.json({ entries });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = getSupabaseServiceRoleClient();

    if (supabase) {
      const { data, error } = await supabase.from("guestbook_entries").insert({
        installation_id: body.stationId || "a0000001-0000-0000-0000-000000000001",
        attendee_handle: body.attendeeHandle,
        attendee_name: body.attendeeName,
        avatar_initials: body.avatarInitials,
        verified_tier: body.verifiedTier || "GUEST",
        comment: body.comment,
        tap_type: body.tapType || "NTAG424_TAP",
        tap_count: body.tapCount || 1,
        badge_earned: body.badgeEarned || null,
      } as any).select().single();

      if (!error && data) {
        return NextResponse.json({ success: true, entry: data });
      }
    }

    return NextResponse.json({ success: true, entry: body });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to record guestbook entry" }, { status: 500 });
  }
}
