// app/api/admin/email-telemetry/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/auth/adminAuth";
import { getVendorEmailTelemetry } from "@/lib/db/emailTelemetry";

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
  }

  const brandHandle = request.nextUrl.searchParams.get("brand")?.trim() || undefined;
  const telemetry = await getVendorEmailTelemetry({ brandHandle });
  return NextResponse.json({ telemetry });
}
