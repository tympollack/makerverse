// app/actions/pilotApplication.ts
"use server";

import { getSupabaseServiceRoleClient, getSupabaseServerClient } from "@/lib/supabase/server";
import { IS_MOCK_ENABLED } from "@/lib/mock/adminData";

export interface PilotApplicationInput {
  artistBrandName: string;
  mediumCraft:
    | "Visual Art"
    | "Apparel"
    | "Flow Props"
    | "Jewelry/Leather"
    | "3D/Hardware"
    | "Other";
  portfolioHandle: string;
  email: string;
  nextShowFestival?: string;
}

export interface PilotApplicationResult {
  success: boolean;
  persistedToDb: boolean;
  applicationId: string;
  message: string;
  error?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function submitPilotApplication(
  input: PilotApplicationInput,
): Promise<PilotApplicationResult> {
  const artistBrandName = (input.artistBrandName || "").trim();
  const mediumCraft = input.mediumCraft || "Visual Art";
  const portfolioHandle = (input.portfolioHandle || "").trim();
  const email = (input.email || "").trim().toLowerCase();
  const nextShowFestival = (input.nextShowFestival || "").trim() || null;

  if (!artistBrandName || !portfolioHandle || !email) {
    return {
      success: false,
      persistedToDb: false,
      applicationId: "",
      message: "Please complete Artist / Brand Name, Portfolio Handle, and Email.",
      error: "VALIDATION_ERROR",
    };
  }

  if (!EMAIL_REGEX.test(email)) {
    return {
      success: false,
      persistedToDb: false,
      applicationId: "",
      message: "Please enter a valid email address.",
      error: "VALIDATION_ERROR",
    };
  }

  const fallbackId = `MV-WAVE1-${Date.now().toString(36).toUpperCase()}`;
  const supabase = getSupabaseServiceRoleClient() || getSupabaseServerClient();

  if (supabase) {
    try {
      const { data, error } = await (
        supabase.from("pilot_applications" as any) as any
      )
        .insert({
          artist_brand_name: artistBrandName,
          medium_craft: mediumCraft,
          portfolio_handle: portfolioHandle,
          email,
          next_show_festival: nextShowFestival,
          status: "PENDING_REVIEW",
        })
        .select("id")
        .maybeSingle();

      if (error) {
        console.warn("[submitPilotApplication] DB insert error:", error.message);
        return {
          success: false,
          persistedToDb: false,
          applicationId: "",
          error: error.message,
          message: "Unable to save your application right now. Please try again.",
        };
      }

      return {
        success: true,
        persistedToDb: true,
        applicationId: data?.id || fallbackId,
        message: `Founding Maker application registered for ${artistBrandName}. Our studio team will reach out to ${email}.`,
      };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Database request failed";
      console.warn("[submitPilotApplication] DB insert exception:", errMsg);
      return {
        success: false,
        persistedToDb: false,
        applicationId: "",
        error: errMsg,
        message: "Unable to save your application right now. Please try again.",
      };
    }
  }

  if (!IS_MOCK_ENABLED) {
    return {
      success: false,
      persistedToDb: false,
      applicationId: "",
      error: "STORAGE_UNAVAILABLE",
      message: "Application storage is currently unavailable. Please try again shortly.",
    };
  }

  return {
    success: true,
    persistedToDb: false,
    applicationId: fallbackId,
    message: `Application queued for Founding Cohort · Wave 1 (${artistBrandName}). Our onboarding team will contact ${email}.`,
  };
}
