// lib/auth/adminAuth.ts
import { NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export interface AdminAuthResult {
  authorized: boolean;
  error?: string;
  status?: number;
  userId?: string;
  role?: string;
}

/**
 * Validates admin/vendor authentication for administrative routes.
 * Accepts:
 *  - Authorization: Bearer <service_key | admin_token>
 *  - x-admin-key: <key>
 */
export async function verifyAdminAuth(request: NextRequest): Promise<AdminAuthResult> {
  const authHeader = request.headers.get("authorization");
  const adminKeyHeader = request.headers.get("x-admin-key");

  let token = "";
  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.substring(7).trim();
  } else if (adminKeyHeader) {
    token = adminKeyHeader.trim();
  }

  if (!token) {
    return {
      authorized: false,
      status: 401,
      error: "Unauthorized: Missing administrative credentials",
    };
  }

  // 1. Direct match with configured service role key or admin secret
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const adminSecret = process.env.ADMIN_API_KEY;
  const isTest = process.env.NODE_ENV === "test";

  if (
    (serviceKey && token === serviceKey) ||
    (adminSecret && token === adminSecret) ||
    (isTest && (token === "demo_service_key" || token === "admin_mock_key"))
  ) {
    return {
      authorized: true,
      userId: "service_role",
      role: "admin",
    };
  }

  // 2. Validate token via Supabase Auth if client available
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        // Enforce secure app_metadata role; never trust user-editable user_metadata (SEC_0006)
        const role = user.app_metadata?.role;
        // Strictly restrict administrative routes to platform admins and service roles (SEC_0007)
        if (role === "admin" || role === "service_role") {
          return {
            authorized: true,
            userId: user.id,
            role,
          };
        }
        return {
          authorized: false,
          status: 403,
          error: "Forbidden: Administrative privileges required",
        };
      }
    } catch {
      // Fall through to unauthorized
    }
  }

  return {
    authorized: false,
    status: 401,
    error: "Unauthorized: Invalid administrative credentials",
  };
}
