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
  requiresAuthOrEmailLink?: boolean;
  email?: string;
  subscriptionId?: string;
  error?: string;
}

export interface UserActiveDropSubscriptionsResult {
  authenticated: boolean;
  email?: string;
  targets: Array<{
    targetType: DropSubscriptionTargetType;
    targetId: string;
  }>;
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
): Promise<{ userId: string | null; userEmail: string | null; isAnonymous: boolean }> {
  const token = await resolveBearerToken(explicitToken);
  if (!token) {
    return { userId: null, userEmail: null, isAnonymous: true };
  }

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (!error && data?.user?.id) {
      const normalizedEmail = data.user.email
        ? data.user.email.trim().toLowerCase()
        : null;
      const isAnonymous = Boolean(data.user.is_anonymous || !normalizedEmail);
      return {
        userId: data.user.id,
        userEmail: normalizedEmail,
        isAnonymous,
      };
    }
  } catch {
    // Invalid or expired token -> treat as guest
  }

  return { userId: null, userEmail: null, isAnonymous: true };
}

/**
 * Fetches active drop subscriptions strictly for the verified authenticated user.
 * Never looks up preferences by unverified guest email or anonymous shopper sessions.
 */
export async function getUserDropSubscriptions(input?: {
  authToken?: string;
}): Promise<UserActiveDropSubscriptionsResult> {
  const supabase = getSupabaseServiceRoleClient() || getSupabaseServerClient();
  if (!supabase) {
    return { authenticated: false, targets: [] };
  }

  const auth = await resolveAuthenticatedUser(supabase as any, input?.authToken);
  if (!auth.userId || auth.isAnonymous || !auth.userEmail) {
    return { authenticated: false, targets: [] };
  }

  let query = (supabase.from("drop_subscriptions" as any) as any)
    .select("target_type, target_id")
    .eq("is_active", true);

  if (auth.userEmail) {
    query = query.or(`user_id.eq.${auth.userId},email.eq.${auth.userEmail}`);
  } else {
    query = query.eq("user_id", auth.userId);
  }

  const { data, error } = await query;
  if (error || !Array.isArray(data)) {
    return {
      authenticated: true,
      email: auth.userEmail ?? undefined,
      targets: [],
    };
  }

  return {
    authenticated: true,
    email: auth.userEmail ?? undefined,
    targets: data
      .filter(
        (row: any) =>
          VALID_TARGET_TYPES.has(row.target_type) &&
          typeof row.target_id === "string",
      )
      .map((row: any) => ({
        targetType: row.target_type as DropSubscriptionTargetType,
        targetId: row.target_id as string,
      })),
  };
}

/**
 * Upserts a verified user's email or inserts a new guest email into `makerverse.drop_subscriptions`.
 * Unauthenticated guest requests use `ignoreDuplicates: true` so callers cannot reactivate
 * an opted-out recipient's row or overwrite another user's ownership, and `unsubscribe_token`
 * is never returned to the caller.
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
  let isAnonymousSession = true;

  if (supabase) {
    const auth = await resolveAuthenticatedUser(supabase as any, input.authToken);
    verifiedUserId = auth.userId;
    verifiedUserEmail = auth.userEmail;
    isAnonymousSession = auth.isAnonymous;
  }

  const canManageOwnership = Boolean(
    verifiedUserId && verifiedUserEmail && !isAnonymousSession,
  );

  if (!canManageOwnership && !isActive) {
    return {
      success: false,
      persistedToDb: false,
      subscribed: true,
      requiresAuthOrEmailLink: true,
      error: "Use the unsubscribe link in your alert email or sign in to manage alerts.",
    };
  }

  const suppliedEmail =
    typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const effectiveEmail = canManageOwnership ? verifiedUserEmail! : suppliedEmail;

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
    const upsertOptions = canManageOwnership
      ? { onConflict: "email,target_type,target_id" }
      : { onConflict: "email,target_type,target_id", ignoreDuplicates: true };

    const { data, error } = await (supabase.from("drop_subscriptions" as any) as any)
      .upsert(
        {
          email: effectiveEmail,
          user_id: canManageOwnership ? verifiedUserId : null,
          target_type: input.targetType,
          target_id: targetId,
          is_active: isActive,
        },
        upsertOptions,
      )
      .select("id, is_active")
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
 * Deactivates an active drop subscription exclusively for a verified signed-in user.
 * Unauthenticated guests must use their tokenized one-click email unsubscribe link.
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
  if (!supabase) {
    return {
      success: true,
      persistedToDb: false,
      subscribed: false,
    };
  }

  const auth = await resolveAuthenticatedUser(supabase as any, input.authToken);
  if (!auth.userId || auth.isAnonymous || !auth.userEmail) {
    return {
      success: false,
      persistedToDb: false,
      subscribed: true,
      requiresAuthOrEmailLink: true,
      error: "Use the unsubscribe link in your alert email or sign in to unfollow.",
    };
  }

  let query = (supabase.from("drop_subscriptions" as any) as any)
    .update({ is_active: false })
    .eq("target_type", input.targetType)
    .eq("target_id", targetId);

  if (auth.userEmail) {
    query = query.or(`user_id.eq.${auth.userId},email.eq.${auth.userEmail}`);
  } else {
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
    email: auth.userEmail ?? undefined,
  };
}
