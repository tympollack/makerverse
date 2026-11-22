// lib/auth/shopperAuth.ts
import { NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export interface ShopperAuthResult {
  userId: string;
  isAuthenticated: boolean;
  isPrivileged: boolean;
  error?: string;
  status?: number;
}

/**
 * Resolves shopper identity securely from request context.
 * Strictly distinguishes verified authenticated identities (Bearer JWT or service key)
 * from unverified client-provided session identifiers (x-user-id / x-shopper-session).
 */
export async function resolveShopperIdentity(
  request: NextRequest,
  requestedUserId?: string
): Promise<ShopperAuthResult> {
  const authHeader = request.headers.get("authorization");
  const sessionHeader = request.headers.get("x-user-id") || request.headers.get("x-shopper-session");
  const isTest = process.env.NODE_ENV === "test";

  // 1. If Bearer token provided, check Supabase auth / service role
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (
      (serviceKey && token === serviceKey) ||
      (isTest && token === "demo_service_key")
    ) {
      return {
        userId: requestedUserId || "service_role",
        isAuthenticated: true,
        isPrivileged: true,
      };
    }

    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (!error && user) {
          const role = user.app_metadata?.role;
          const isPrivileged = role === "admin" || role === "service_role";

          return {
            userId: user.id,
            isAuthenticated: true,
            isPrivileged,
          };
        }
      } catch {
        // Fall through
      }
    }
  }

  // 2. Check for administrative override key
  const adminKey = request.headers.get("x-admin-key");
  if (
    adminKey &&
    (adminKey === process.env.ADMIN_API_KEY || (isTest && adminKey === "admin_mock_key"))
  ) {
    return {
      userId: requestedUserId || "admin_override",
      isAuthenticated: true,
      isPrivileged: true,
    };
  }

  // 3. Client session header (unverified guest/session identifier)
  // NEVER mark unverified headers as isAuthenticated: true (SEC_0002)
  if (sessionHeader) {
    const trimmed = sessionHeader.trim();
    if (/^[a-zA-Z0-9_@.-]{1,64}$/.test(trimmed)) {
      return {
        userId: trimmed,
        isAuthenticated: false,
        isPrivileged: false,
      };
    }
  }

  // 4. If requestedUserId is passed in JSON body, validate format
  if (requestedUserId && requestedUserId !== "shopper_anon") {
    // Only allow if it's a valid anonymous shopper session tag
    if (/^shopper_[a-zA-Z0-9_.-]{1,50}$/.test(requestedUserId)) {
      return {
        userId: requestedUserId,
        isAuthenticated: false,
        isPrivileged: false,
      };
    }
  }

  // 5. Default fallback to anonymous shopper
  return {
    userId: "shopper_anon",
    isAuthenticated: false,
    isPrivileged: false,
  };
}
