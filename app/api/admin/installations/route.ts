// app/api/admin/installations/route.ts
import { NextResponse } from "next/server";
import { getAdminInstallations } from "@/lib/db/admin";

export async function GET() {
  const installations = await getAdminInstallations();
  return NextResponse.json({ installations });
}
