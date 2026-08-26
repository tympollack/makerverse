// app/api/brands/[handle]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getBrand } from "@/lib/db/brands";
import { getProducts } from "@/lib/db/products";
import { getShoppablePosts } from "@/lib/db/posts";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ handle: string }> | { handle: string } }
) {
  const resolved = context.params instanceof Promise ? await context.params : context.params;
  const handle = resolved.handle;

  const brand = await getBrand(handle);
  if (!brand) {
    return NextResponse.json({ error: `Brand '${handle}' not found` }, { status: 404 });
  }

  const products = await getProducts(brand.handle);
  const posts = await getShoppablePosts(brand.handle);

  return NextResponse.json({
    brand,
    products,
    posts,
  });
}
