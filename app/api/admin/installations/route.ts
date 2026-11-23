// app/api/admin/installations/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdminInstallations } from "@/lib/db/admin";
import { verifyAdminAuth } from "@/lib/auth/adminAuth";

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
  }

  const installations = await getAdminInstallations();
  return NextResponse.json({ installations });
}
