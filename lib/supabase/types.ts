// lib/supabase/types.ts
/**
 * Comprehensive TypeScript database definitions mapped to the `makerverse` schema in Supabase.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type HardwareTier = "QR_REGISTRY" | "NTAG213_SERIALIZED" | "NTAG424_DNA_CMAC" | "NTAG215_SERIALIZED";
export type ChipLockStatus = "UNLOCKED" | "PASSWORD_PROTECTED" | "LOCKED_BITS";
export type MintStatus = "UNCLAIMED" | "MINTED_INITIAL" | "RESOLD";
export type HoldStatus = "ACTIVE_HOLD" | "PAYMENT_RETRYING" | "EXPIRED_RELEASE" | "FULFILLED";

export interface MakerverseTables {
  brands: {
    Row: {
      id: string;
      owner_id: string | null;
      name: string;
      slug: string;
      logo_url: string | null;
      banner_url: string | null;
      bio: string | null;
      verified_badge: boolean;
      total_royalties_cents: number;
      ledger_address: string | null;
      studio_location: string | null;
      tags: string[];
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      owner_id?: string | null;
      name: string;
      slug: string;
      logo_url?: string | null;
      banner_url?: string | null;
      bio?: string | null;
      verified_badge?: boolean;
      total_royalties_cents?: number;
      ledger_address?: string | null;
      studio_location?: string | null;
      tags?: string[];
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      owner_id?: string | null;
      name?: string;
      slug?: string;
      logo_url?: string | null;
      banner_url?: string | null;
      bio?: string | null;
      verified_badge?: boolean;
      total_royalties_cents?: number;
      ledger_address?: string | null;
      studio_location?: string | null;
      tags?: string[];
      created_at?: string;
      updated_at?: string;
    };
    Relationships: [];
  };
  product_lines: {
    Row: {
      id: string;
      brand_id: string;
      title: string;
      description: string | null;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      brand_id: string;
      title: string;
      description?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      brand_id?: string;
      title?: string;
      description?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Relationships: [];
  };
  products: {
    Row: {
      id: string;
      product_line_id: string;
      title: string;
      sku: string;
      price_cents: number;
      stock_quantity: number;
      max_stock: number;
      hardware_tier: HardwareTier;
      secondary_royalty_pct: number;
      co_sign_required: boolean;
      image_url: string | null;
      description: string | null;
      materials: string[];
      maker_notes: string | null;
      hardware_spec: Json;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      product_line_id: string;
      title: string;
      sku: string;
      price_cents: number;
      stock_quantity: number;
      max_stock?: number;
      hardware_tier?: HardwareTier;
      secondary_royalty_pct?: number;
      co_sign_required?: boolean;
      image_url?: string | null;
      description?: string | null;
      materials?: string[];
      maker_notes?: string | null;
      hardware_spec?: Json;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      product_line_id?: string;
      title?: string;
      sku?: string;
      price_cents?: number;
      stock_quantity?: number;
      max_stock?: number;
      hardware_tier?: HardwareTier;
      secondary_royalty_pct?: number;
      co_sign_required?: boolean;
      image_url?: string | null;
      description?: string | null;
      materials?: string[];
      maker_notes?: string | null;
      hardware_spec?: Json;
      created_at?: string;
      updated_at?: string;
    };
    Relationships: [];
  };
  physical_chips: {
    Row: {
      uid: string;
      product_id: string | null;
      cmac_secret_key: string | null;
      lock_status: ChipLockStatus;
      current_owner_id: string | null;
      mint_status: MintStatus;
      metadata: Json;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      uid: string;
      product_id?: string | null;
      cmac_secret_key?: string | null;
      lock_status?: ChipLockStatus;
      current_owner_id?: string | null;
      mint_status?: MintStatus;
      metadata?: Json;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      uid?: string;
      product_id?: string | null;
      cmac_secret_key?: string | null;
      lock_status?: ChipLockStatus;
      current_owner_id?: string | null;
      mint_status?: MintStatus;
      metadata?: Json;
      created_at?: string;
      updated_at?: string;
    };
    Relationships: [];
  };
  cart_holds: {
    Row: {
      id: string;
      product_id: string;
      user_id: string | null;
      quantity: number;
      status: HoldStatus;
      expires_at: string;
      idempotency_key: string | null;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      product_id: string;
      user_id?: string | null;
      quantity?: number;
      status?: HoldStatus;
      expires_at: string;
      idempotency_key?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      product_id?: string;
      user_id?: string | null;
      quantity?: number;
      status?: HoldStatus;
      expires_at?: string;
      idempotency_key?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Relationships: [];
  };
  demand_signals: {
    Row: {
      id: string;
      product_id: string;
      user_id: string;
      created_at: string;
    };
    Insert: {
      id?: string;
      product_id: string;
      user_id: string;
      created_at?: string;
    };
    Update: {
      id?: string;
      product_id?: string;
      user_id?: string;
      created_at?: string;
    };
    Relationships: [];
  };
  shoppable_posts: {
    Row: {
      id: string;
      brand_id: string;
      image_url: string;
      caption: string;
      location: string;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      brand_id: string;
      image_url: string;
      caption: string;
      location: string;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      brand_id?: string;
      image_url?: string;
      caption?: string;
      location?: string;
      created_at?: string;
      updated_at?: string;
    };
    Relationships: [];
  };
  shoppable_pins: {
    Row: {
      id: string;
      post_id: string;
      product_id: string;
      x_percent: number;
      y_percent: number;
      label: string | null;
      created_at: string;
    };
    Insert: {
      id?: string;
      post_id: string;
      product_id: string;
      x_percent: number;
      y_percent: number;
      label?: string | null;
      created_at?: string;
    };
    Update: {
      id?: string;
      post_id?: string;
      product_id?: string;
      x_percent?: number;
      y_percent?: number;
      label?: string | null;
      created_at?: string;
    };
    Relationships: [];
  };
  booth_installations: {
    Row: {
      id: string;
      brand_id: string;
      name: string;
      installation_type: string;
      chip_count: number;
      status: "ONLINE" | "OFFLINE" | "DEGRADED";
      last_ping_at: string;
      location: string;
      trigger_count: number;
      hardware_uid: string;
      station_ip: string;
      reader_model: string;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      brand_id: string;
      name: string;
      installation_type: string;
      chip_count?: number;
      status?: "ONLINE" | "OFFLINE" | "DEGRADED";
      last_ping_at?: string;
      location: string;
      trigger_count?: number;
      hardware_uid: string;
      station_ip: string;
      reader_model: string;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      brand_id?: string;
      name?: string;
      installation_type?: string;
      chip_count?: number;
      status?: "ONLINE" | "OFFLINE" | "DEGRADED";
      last_ping_at?: string;
      location?: string;
      trigger_count?: number;
      hardware_uid?: string;
      station_ip?: string;
      reader_model?: string;
      created_at?: string;
      updated_at?: string;
    };
    Relationships: [];
  };
  guestbook_entries: {
    Row: {
      id: string;
      installation_id: string;
      attendee_handle: string;
      attendee_name: string;
      avatar_initials: string;
      verified_tier: string;
      comment: string;
      tap_type: string;
      tap_count: number;
      badge_earned: string | null;
      created_at: string;
    };
    Insert: {
      id?: string;
      installation_id: string;
      attendee_handle: string;
      attendee_name: string;
      avatar_initials: string;
      verified_tier?: string;
      comment: string;
      tap_type?: string;
      tap_count?: number;
      badge_earned?: string | null;
      created_at?: string;
    };
    Update: {
      id?: string;
      installation_id?: string;
      attendee_handle?: string;
      attendee_name?: string;
      avatar_initials?: string;
      verified_tier?: string;
      comment?: string;
      tap_type?: string;
      tap_count?: number;
      badge_earned?: string | null;
      created_at?: string;
    };
    Relationships: [];
  };
  raffle_attempts: {
    Row: {
      id: string;
      installation_id: string;
      attendee_handle: string;
      outcome: "WIN" | "LOSS";
      prize_won: string | null;
      reward_code: string | null;
      discount_percent: number | null;
      dispatch_status: "CLAIMED" | "DISPATCHED" | "EXPIRED";
      qr_payload: string | null;
      created_at: string;
    };
    Insert: {
      id?: string;
      installation_id: string;
      attendee_handle: string;
      outcome: "WIN" | "LOSS";
      prize_won?: string | null;
      reward_code?: string | null;
      discount_percent?: number | null;
      dispatch_status?: "CLAIMED" | "DISPATCHED" | "EXPIRED";
      qr_payload?: string | null;
      created_at?: string;
    };
    Update: {
      id?: string;
      installation_id?: string;
      attendee_handle?: string;
      outcome?: "WIN" | "LOSS";
      prize_won?: string | null;
      reward_code?: string | null;
      discount_percent?: number | null;
      dispatch_status?: "CLAIMED" | "DISPATCHED" | "EXPIRED";
      qr_payload?: string | null;
      created_at?: string;
    };
    Relationships: [];
  };
  pos_transactions: {
    Row: {
      id: string;
      brand_id: string;
      product_id: string | null;
      sku: string;
      product_title: string;
      price_cents: number;
      mode: "HIGH_TOUCH" | "LOW_TOUCH";
      buyer_handle: string | null;
      chip_uid: string;
      status: "MINT_PENDING" | "MINT_COMPLETE" | "UNCLAIMED" | "BATCH_QUEUED";
      nfc_tapped: boolean;
      qr_scanned: boolean;
      created_at: string;
    };
    Insert: {
      id?: string;
      brand_id: string;
      product_id?: string | null;
      sku: string;
      product_title: string;
      price_cents: number;
      mode?: "HIGH_TOUCH" | "LOW_TOUCH";
      buyer_handle?: string | null;
      chip_uid: string;
      status?: "MINT_PENDING" | "MINT_COMPLETE" | "UNCLAIMED" | "BATCH_QUEUED";
      nfc_tapped?: boolean;
      qr_scanned?: boolean;
      created_at?: string;
    };
    Update: {
      id?: string;
      brand_id?: string;
      product_id?: string | null;
      sku?: string;
      product_title?: string;
      price_cents?: number;
      mode?: "HIGH_TOUCH" | "LOW_TOUCH";
      buyer_handle?: string | null;
      chip_uid?: string;
      status?: "MINT_PENDING" | "MINT_COMPLETE" | "UNCLAIMED" | "BATCH_QUEUED";
      nfc_tapped?: boolean;
      qr_scanned?: boolean;
      created_at?: string;
    };
    Relationships: [];
  };
}

export interface MakerverseFunctions {
  signal_product_interest: {
    Args: {
      p_product_id: string;
    };
    Returns: {
      success: boolean;
      product_id: string;
      user_id: string;
      newly_signaled: boolean;
      total_demand_signals: number;
    };
  };
  execute_hold_release: {
    Args: {
      p_hold_id: string;
    };
    Returns: {
      success: boolean;
      hold_id: string;
      product_id: string;
      quantity_released: number;
      restored_stock_quantity: number;
      status: string;
    };
  };
  create_cart_hold: {
    Args: {
      p_product_id: string;
      p_quantity?: number;
      p_ttl_seconds?: number;
      p_idempotency_key?: string;
    };
    Returns: {
      success: boolean;
      hold_id: string;
      product_id: string;
      quantity: number;
      status: string;
      expires_at: string;
      is_idempotent_replay: boolean;
    };
  };
}

export interface Database {
  makerverse: {
    Tables: MakerverseTables;
    Views: Record<string, never>;
    Functions: MakerverseFunctions;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
