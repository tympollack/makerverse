// lib/db/posts.ts
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getPostsByBrandHandle, SHOPPABLE_POSTS, type ShoppablePost } from "@/lib/mock/shopData";

/**
 * Fetch shoppable spatial scenes with pinned product coordinates.
 */
export async function getShoppablePosts(brandHandle?: string): Promise<ShoppablePost[]> {
  const supabase = getSupabaseServerClient();
  const normalized = (brandHandle || "forge-collective").toLowerCase().replace(/^@/, "");

  if (supabase) {
    try {
      let query = (supabase.from("shoppable_posts" as any) as any).select(`
        id,
        brand_id,
        image_url,
        caption,
        location,
        created_at,
        shoppable_pins (
          id,
          post_id,
          product_id,
          x_percent,
          y_percent,
          label
        ),
        brands!inner (
          id,
          slug
        )
      `);

      if (normalized) {
        query = query.eq("brands.slug", normalized);
      }

      const { data, error } = await query;

      if (!error && data && data.length > 0) {
        return data.map((post: any) => ({
          id: post.id,
          brandId: post.brand_id,
          imageUrl: post.image_url,
          caption: post.caption,
          location: post.location,
          timestamp: post.created_at,
          pins: (post.shoppable_pins || []).map((pin: any) => ({
            id: pin.id,
            x: pin.x_percent,
            y: pin.y_percent,
            productId: pin.product_id,
            label: pin.label || "Craft Item",
          })),
        }));
      }
    } catch (err) {
      console.warn("[getShoppablePosts] Falling back to real local dataset:", err);
    }
  }

  return getPostsByBrandHandle(normalized);
}
