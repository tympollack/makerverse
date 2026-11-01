// app/api/admin/guestbook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdminGuestbook } from "@/lib/db/admin";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { verifyAdminAuth } from "@/lib/auth/adminAuth";

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
  }

  const entries = await getAdminGuestbook();
  return NextResponse.json({ entries });
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdminAuth(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    const body = await request.json();
    if (!body.attendeeHandle || !body.comment) {
      return NextResponse.json(
        { error: "Missing required fields: attendeeHandle and comment" },
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

    const { data, error } = await supabase.from("guestbook_entries").insert({
      installation_id: body.stationId || "a0000001-0000-0000-0000-000000000001",
      attendee_handle: body.attendeeHandle,
      attendee_name: body.attendeeName || body.attendeeHandle,
      avatar_initials: body.avatarInitials || body.attendeeHandle.slice(0, 2).toUpperCase(),
      verified_tier: body.verifiedTier || "GUEST",
      comment: body.comment,
      tap_type: body.tapType || "NTAG424_TAP",
      tap_count: body.tapCount || 1,
      badge_earned: body.badgeEarned || null,
    } as any).select().single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, entry: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to record guestbook entry" }, { status: 500 });
  }
}
