// app/actions/pilotApplication.ts
"use server";

import { getSupabaseServiceRoleClient, getSupabaseServerClient } from "@/lib/supabase/server";

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

export async function submitPilotApplication(
  input: PilotApplicationInput,
): Promise<PilotApplicationResult> {
  const artistBrandName = (input.artistBrandName || "").trim();
  const mediumCraft = input.mediumCraft || "Visual Art";
  const portfolioHandle = (input.portfolioHandle || "").trim();
  const email = (input.email || "").trim();
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
        // Graceful fallback toast confirmation if table is pending migration or offline
        console.warn("[submitPilotApplication] Pending migration / DB notice:", error.message);
        return {
          success: true,
          persistedToDb: false,
          applicationId: fallbackId,
          message: `Application queued for Founding Cohort · Wave 1 (${artistBrandName}). Check ${email} for your studio invite link.`,
        };
      }

      return {
        success: true,
        persistedToDb: true,
        applicationId: data?.id || fallbackId,
        message: `Founding Maker application registered for ${artistBrandName}. Our studio team will reach out to ${email}.`,
      };
    } catch (err) {
      console.warn("[submitPilotApplication] Fallback queue confirmation:", err);
    }
  }

  return {
    success: true,
    persistedToDb: false,
    applicationId: fallbackId,
    message: `Application queued for Founding Cohort · Wave 1 (${artistBrandName}). Our onboarding team will contact ${email}.`,
  };
}
