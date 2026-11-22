// app/api/drops/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getScheduledTeasers, getVendorBatches } from "@/lib/db/batches";
import { verifyAdminAuth } from "@/lib/auth/adminAuth";

export async function GET(request: NextRequest) {
  const brandHandle = request.nextUrl.searchParams.get("brand") || undefined;
  const mode = request.nextUrl.searchParams.get("mode") || "teasers";

  if (mode === "all") {
    const auth = await verifyAdminAuth(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error || "Unauthorized" },
        { status: auth.status || 401 },
      );
    }
    const batches = await getVendorBatches(brandHandle);
    return NextResponse.json({ batches });
  }

  const teasers = await getScheduledTeasers(brandHandle);
  return NextResponse.json({ teasers });
}
