// components/onboarding/FoundingApplicationForm.tsx
"use client";

import { useState } from "react";
import {
  Sparkles,
  CheckCircle2,
  Send,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import {
  submitPilotApplication,
  type PilotApplicationInput,
  type PilotApplicationResult,
} from "@/app/actions/pilotApplication";

const MEDIUM_OPTIONS: PilotApplicationInput["mediumCraft"][] = [
  "Visual Art",
  "Apparel",
  "Flow Props",
  "Jewelry/Leather",
  "3D/Hardware",
  "Other",
];

interface FoundingApplicationFieldsProps {
  idPrefix?: string;
  submitLabel?: string;
  onSuccess?: (result: PilotApplicationResult) => void;
  className?: string;
}

export function FoundingApplicationFields({
  idPrefix = "apply",
  submitLabel = "Submit Founding Cohort Application",
  onSuccess,
  className = "",
}: FoundingApplicationFieldsProps) {
  const [artistBrandName, setArtistBrandName] = useState("");
  const [mediumCraft, setMediumCraft] =
    useState<PilotApplicationInput["mediumCraft"]>("Visual Art");
  const [portfolioHandle, setPortfolioHandle] = useState("");
  const [email, setEmail] = useState("");
  const [nextShowFestival, setNextShowFestival] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<PilotApplicationResult | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setResult(null);

    try {
      const res = await submitPilotApplication({
        artistBrandName,
        mediumCraft,
        portfolioHandle,
        email,
        nextShowFestival,
      });
      setResult(res);
      if (res.success) {
        setArtistBrandName("");
        setPortfolioHandle("");
        setEmail("");
        setNextShowFestival("");
        onSuccess?.(res);
      }
    } catch {
      setResult({
        success: false,
        persistedToDb: false,
        applicationId: "",
        error: "NETWORK_ERROR",
        message: "Network error submitting application. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 ${className}`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor={`${idPrefix}-brand-name`}
            className="block font-mono text-xs text-white/70 uppercase mb-1.5"
          >
            Artist / Brand Name *
          </label>
          <input
            id={`${idPrefix}-brand-name`}
            type="text"
            required
            value={artistBrandName}
            onChange={(e) => setArtistBrandName(e.target.value)}
            placeholder="e.g. Get Bent Clothing / Astraea Studio"
            className="w-full rounded-xl bg-black/50 border border-white/15 px-3.5 py-2.5 text-sm text-[#F9F9F9] placeholder:text-white/30 focus:outline-none focus:border-[#CC5500]"
          />
        </div>

        <div>
          <label
            htmlFor={`${idPrefix}-medium`}
            className="block font-mono text-xs text-white/70 uppercase mb-1.5"
          >
            Medium / Craft *
          </label>
          <select
            id={`${idPrefix}-medium`}
            value={mediumCraft}
            onChange={(e) =>
              setMediumCraft(
                e.target.value as PilotApplicationInput["mediumCraft"],
              )
            }
            className="w-full rounded-xl bg-black/50 border border-white/15 px-3.5 py-2.5 text-sm font-mono text-[#F9F9F9] focus:outline-none focus:border-[#CC5500] cursor-pointer"
          >
            {MEDIUM_OPTIONS.map((opt) => (
              <option key={opt} value={opt} className="bg-[#1A1A1A]">
                {opt}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor={`${idPrefix}-portfolio`}
            className="block font-mono text-xs text-white/70 uppercase mb-1.5"
          >
            Instagram / Portfolio Handle *
          </label>
          <input
            id={`${idPrefix}-portfolio`}
            type="text"
            required
            value={portfolioHandle}
            onChange={(e) => setPortfolioHandle(e.target.value)}
            placeholder="@yourhandle or portfolio.com"
            className="w-full rounded-xl bg-black/50 border border-white/15 px-3.5 py-2.5 text-sm font-mono text-[#F9F9F9] placeholder:text-white/30 focus:outline-none focus:border-[#CC5500]"
          />
        </div>

        <div>
          <label
            htmlFor={`${idPrefix}-email`}
            className="block font-mono text-xs text-white/70 uppercase mb-1.5"
          >
            Email *
          </label>
          <input
            id={`${idPrefix}-email`}
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="artist@studio.com"
            className="w-full rounded-xl bg-black/50 border border-white/15 px-3.5 py-2.5 text-sm font-mono text-[#F9F9F9] placeholder:text-white/30 focus:outline-none focus:border-[#CC5500]"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor={`${idPrefix}-festival`}
          className="block font-mono text-xs text-white/70 uppercase mb-1.5"
        >
          Next Show / Festival (Optional)
        </label>
        <input
          id={`${idPrefix}-festival`}
          type="text"
          value={nextShowFestival}
          onChange={(e) => setNextShowFestival(e.target.value)}
          placeholder="e.g. Electric Forest, Renegade Craft Fair, Black Friday Drop"
          className="w-full rounded-xl bg-black/50 border border-white/15 px-3.5 py-2.5 text-sm text-[#F9F9F9] placeholder:text-white/30 focus:outline-none focus:border-[#CC5500]"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3.5 px-6 rounded-xl bg-[#CC5500] hover:bg-[#e0621a] text-[#F9F9F9] font-mono text-xs sm:text-sm font-bold uppercase tracking-wider shadow-[0_0_24px_rgba(204,85,0,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
      >
        <Send className="w-4 h-4" />
        <span>
          {isSubmitting ? "Registering Founding Maker Application..." : submitLabel}
        </span>
      </button>

      {result && (
        <div
          role="status"
          className={`p-4 rounded-xl border font-mono text-xs flex items-start gap-3 ${
            result.success
              ? "bg-emerald-500/10 border-emerald-500/35 text-emerald-300"
              : "bg-red-500/10 border-red-500/35 text-red-300"
          }`}
        >
          {result.success ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          )}
          <div className="space-y-1">
            <p className="font-bold">
              {result.success
                ? `Application Confirmed · Ref ${result.applicationId}`
                : "Submission Error"}
            </p>
            <p className="text-white/80">{result.message}</p>
          </div>
        </div>
      )}
    </form>
  );
}

export function FoundingApplicationForm() {
  return (
    <section id="apply" className="scroll-mt-24">
      <div className="bg-white/5 backdrop-blur-md border border-white/10 shadow-2xl rounded-xl p-6 sm:p-10 relative overflow-hidden">
        <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[#CC5500]/15 blur-3xl" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left 5 cols: Cohort Benefits */}
          <div className="lg:col-span-5 space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#CC5500]/15 border border-[#CC5500]/35 font-mono text-xs text-orange-300">
              <Sparkles className="w-3.5 h-3.5 text-[#CC5500]" />
              <span>FOUNDING COHORT · WAVE 1</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold text-[#F9F9F9] tracking-tight">
              Claim Your Founding Maker Shop
            </h2>

            <p className="text-sm text-white/65 leading-relaxed">
              Apply for Wave 1 to receive 25 free pre-encoded starter tags, locked 2% base fees, and dedicated drop onboarding for your next gallery opening, festival booth, or 24-hour release.
            </p>

            <div className="space-y-2.5 font-mono text-xs text-white/75 pt-2">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-[#22D3EE] flex-shrink-0" />
                <span>25 Free Pre-Encoded NTAG213 / QR Passport Tags</span>
              </div>
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-[#CC5500] flex-shrink-0" />
                <span>Locked 2% ($0.05 min) Base + 80/20 Surplus Split</span>
              </div>
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Instant Booth POS &amp; Timed Drop Scheduler</span>
              </div>
            </div>
          </div>

          {/* Right 7 cols: Shared Intake Form */}
          <FoundingApplicationFields idPrefix="apply" className="lg:col-span-7" />
        </div>
      </div>
    </section>
  );
}
