// app/api/products/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getProducts } from "@/lib/db/products";

export async function GET(request: NextRequest) {
  const brand = request.nextUrl.searchParams.get("brand") || "forge-collective";
  const products = await getProducts(brand);
  return NextResponse.json({ products });
}
