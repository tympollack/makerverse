// lib/supabase/emailTypes.ts
import type { Json } from "./types";

export interface MakerverseEmailTables {
  drop_notify_subscriptions: {
    Row: {
      id: string;
      batch_id: string;
      user_id: string | null;
      email: string | null;
      verified: boolean;
      created_at: string;
    };
    Insert: {
      id?: string;
      batch_id: string;
      user_id?: string | null;
      email?: string | null;
      verified?: boolean;
      created_at?: string;
    };
    Update: {
      id?: string;
      batch_id?: string;
      user_id?: string | null;
      email?: string | null;
      verified?: boolean;
      created_at?: string;
    };
    Relationships: [];
  };
  drop_subscriptions: {
    Row: {
      id: string;
      email: string;
      user_id: string | null;
      target_type: "brand" | "product_line" | "batch";
      target_id: string;
      unsubscribe_token: string;
      is_active: boolean;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      email: string;
      user_id?: string | null;
      target_type: "brand" | "product_line" | "batch";
      target_id: string;
      unsubscribe_token?: string;
      is_active?: boolean;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      email?: string;
      user_id?: string | null;
      target_type?: "brand" | "product_line" | "batch";
      target_id?: string;
      unsubscribe_token?: string;
      is_active?: boolean;
      created_at?: string;
      updated_at?: string;
    };
    Relationships: [];
  };
  email_telemetry_events: {
    Row: {
      id: string;
      svix_id: string | null;
      resend_email_id: string;
      event_type: string;
      app_id: string;
      channel: string | null;
      brand_id: string | null;
      brand_slug: string | null;
      batch_id: string | null;
      recipient_email: string | null;
      subject: string | null;
      occurred_at: string;
      payload: Json;
      created_at: string;
    };
    Insert: {
      id?: string;
      svix_id?: string | null;
      resend_email_id: string;
      event_type: string;
      app_id?: string;
      channel?: string | null;
      brand_id?: string | null;
      brand_slug?: string | null;
      batch_id?: string | null;
      recipient_email?: string | null;
      subject?: string | null;
      occurred_at?: string;
      payload?: Json;
      created_at?: string;
    };
    Update: {
      id?: string;
      svix_id?: string | null;
      resend_email_id?: string;
      event_type?: string;
      app_id?: string;
      channel?: string | null;
      brand_id?: string | null;
      brand_slug?: string | null;
      batch_id?: string | null;
      recipient_email?: string | null;
      subject?: string | null;
      occurred_at?: string;
      payload?: Json;
      created_at?: string;
    };
    Relationships: [];
  };
}
