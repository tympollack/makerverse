// app/(shop)/actions/followActions.ts
"use server";

import { headers } from "next/headers";
import { getSupabaseServerClient, getSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { IS_MOCK_ENABLED } from "@/lib/mock/adminData";

export type DropSubscriptionTargetType = "brand" | "product_line" | "batch";

const VALID_TARGET_TYPES = new Set<DropSubscriptionTargetType>([
  "brand",
  "product_line",
  "batch",
]);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface DropSubscriptionInput {
  email?: string | null;
  targetType: DropSubscriptionTargetType;
  targetId: string;
  isActive?: boolean;
  authToken?: string;
}

export interface DropSubscriptionResult {
  success: boolean;
  persistedToDb: boolean;
  subscribed: boolean;
  requiresEmail?: boolean;
  email?: string;
  subscriptionId?: string;
  unsubscribeToken?: string;
  error?: string;
}

async function resolveBearerToken(explicitToken?: string): Promise<string> {
  if (explicitToken && explicitToken.trim()) {
    return explicitToken.trim();
  }
  try {
    const hdrs = await headers();
    const authHeader = hdrs.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      return authHeader.substring(7).trim();
    }
  } catch {
    // Called outside Next.js request context (e.g. unit tests)
  }
  return "";
}

async function resolveAuthenticatedUser(
  supabase: NonNullable<ReturnType<typeof getSupabaseServiceRoleClient>>,
  explicitToken?: string,
): Promise<{ userId: string | null; userEmail: string | null }> {
  const token = await resolveBearerToken(explicitToken);
  if (!token) {
    return { userId: null, userEmail: null };
  }

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (!error && data?.user?.id) {
      return {
        userId: data.user.id,
        userEmail: data.user.email ? data.user.email.trim().toLowerCase() : null,
      };
    }
  } catch {
    // Invalid or expired token -> treat as guest
  }

  return { userId: null, userEmail: null };
}

/**
 * Upserts a user or guest email into `makerverse.drop_subscriptions`
 * for brand follows, product_line follows, or batch Notify-Me alerts.
 */
export async function upsertDropSubscription(
  input: DropSubscriptionInput,
): Promise<DropSubscriptionResult> {
  if (!VALID_TARGET_TYPES.has(input.targetType)) {
    return {
      success: false,
      persistedToDb: false,
      subscribed: false,
      error: "INVALID_TARGET_TYPE",
    };
  }

  const targetId = typeof input.targetId === "string" ? input.targetId.trim() : "";
  if (!targetId) {
    return {
      success: false,
      persistedToDb: false,
      subscribed: false,
      error: "MISSING_TARGET_ID",
    };
  }

  const isActive = input.isActive ?? true;
  const supabase = getSupabaseServiceRoleClient() || getSupabaseServerClient();

  let verifiedUserId: string | null = null;
  let verifiedUserEmail: string | null = null;

  if (supabase) {
    const auth = await resolveAuthenticatedUser(supabase as any, input.authToken);
    verifiedUserId = auth.userId;
    verifiedUserEmail = auth.userEmail;
  }

  const suppliedEmail =
    typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const effectiveEmail = verifiedUserEmail || suppliedEmail;

  if (!effectiveEmail || !EMAIL_REGEX.test(effectiveEmail)) {
    return {
      success: false,
      persistedToDb: false,
      subscribed: false,
      requiresEmail: true,
      error: "EMAIL_REQUIRED",
    };
  }

  if (supabase) {
    const { data, error } = await (supabase.from("drop_subscriptions" as any) as any)
      .upsert(
        {
          email: effectiveEmail,
          user_id: verifiedUserId,
          target_type: input.targetType,
          target_id: targetId,
          is_active: isActive,
        },
        {
          onConflict: "email,target_type,target_id",
        },
      )
      .select("id, unsubscribe_token, is_active")
      .maybeSingle();

    if (error) {
      return {
        success: false,
        persistedToDb: false,
        subscribed: false,
        error: error.message,
      };
    }

    return {
      success: true,
      persistedToDb: true,
      subscribed: data?.is_active ?? isActive,
      email: effectiveEmail,
      subscriptionId: data?.id,
      unsubscribeToken: data?.unsubscribe_token,
    };
  }

  if (!IS_MOCK_ENABLED) {
    return {
      success: false,
      persistedToDb: false,
      subscribed: false,
      error: "DATABASE_NOT_CONFIGURED",
    };
  }

  return {
    success: true,
    persistedToDb: false,
    subscribed: isActive,
    email: effectiveEmail,
  };
}

/**
 * Deactivates an active drop subscription when a user unfollows or un-arms an alert.
 */
export async function deactivateDropSubscription(
  input: Omit<DropSubscriptionInput, "isActive">,
): Promise<DropSubscriptionResult> {
  if (!VALID_TARGET_TYPES.has(input.targetType)) {
    return {
      success: false,
      persistedToDb: false,
      subscribed: false,
      error: "INVALID_TARGET_TYPE",
    };
  }

  const targetId = typeof input.targetId === "string" ? input.targetId.trim() : "";
  if (!targetId) {
    return {
      success: false,
      persistedToDb: false,
      subscribed: false,
      error: "MISSING_TARGET_ID",
    };
  }

  const supabase = getSupabaseServiceRoleClient() || getSupabaseServerClient();
  const suppliedEmail =
    typeof input.email === "string" ? input.email.trim().toLowerCase() : "";

  if (supabase) {
    const auth = await resolveAuthenticatedUser(supabase as any, input.authToken);
    const effectiveEmail = auth.userEmail || suppliedEmail;

    if (!effectiveEmail && !auth.userId) {
      return {
        success: true,
        persistedToDb: false,
        subscribed: false,
      };
    }

    let query = (supabase.from("drop_subscriptions" as any) as any)
      .update({ is_active: false })
      .eq("target_type", input.targetType)
      .eq("target_id", targetId);

    if (effectiveEmail) {
      query = query.eq("email", effectiveEmail);
    } else if (auth.userId) {
      query = query.eq("user_id", auth.userId);
    }

    const { error } = await query;
    if (error) {
      return {
        success: false,
        persistedToDb: false,
        subscribed: false,
        error: error.message,
      };
    }

    return {
      success: true,
      persistedToDb: true,
      subscribed: false,
      email: effectiveEmail || undefined,
    };
  }

  return {
    success: true,
    persistedToDb: false,
    subscribed: false,
    email: suppliedEmail || undefined,
  };
}
