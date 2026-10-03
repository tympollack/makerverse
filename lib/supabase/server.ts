// lib/supabase/server.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

let serverClient: SupabaseClient<Database, "makerverse"> | null = null;
let serviceRoleClient: SupabaseClient<Database, "makerverse"> | null = null;

/**
 * Server-side Supabase client using anon key.
 */
export function getSupabaseServerClient(): SupabaseClient<Database, "makerverse"> | null {
  if (serverClient) {
    return serverClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey || !url.startsWith("http")) {
    return null;
  }

  serverClient = createClient<Database, "makerverse">(url, anonKey, {
    db: {
      schema: "makerverse",
    },
    auth: {
      persistSession: false,
    },
  });

  return serverClient;
}

/**
 * Server-side Supabase client using Service Role key for atomic backend operations.
 */
export function getSupabaseServiceRoleClient(): SupabaseClient<Database, "makerverse"> | null {
  if (serviceRoleClient) {
    return serviceRoleClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !serviceKey || !url.startsWith("http")) {
    return null;
  }

  serviceRoleClient = createClient<Database, "makerverse">(url, serviceKey, {
    db: {
      schema: "makerverse",
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return serviceRoleClient;
}
