// components/shop/UpcomingDropCard.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Lock, Sparkles, Clock, CheckCircle2, Mail, ArrowRight, BellRing, Check } from "lucide-react";
import { FrostedCard } from "@/components/ui/FrostedCard";
import { CountdownTimer } from "@/components/ui/CountdownTimer";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  isBatchCheckoutUnlocked,
  type ProductBatch,
} from "@/lib/drops/lifecycle";
import { formatCents } from "@/lib/utils";

interface UpcomingDropCardProps {
  batch: ProductBatch;
  onUnlock?: (batchId: string) => void;
}

export function UpcomingDropCard({ batch, onUnlock }: UpcomingDropCardProps) {
  const goesLiveMs = Date.parse(batch.goesLiveAt);
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() =>
    isBatchCheckoutUnlocked(batch),
  );
  const [emailInput, setEmailInput] = useState("");
  const [showEmailPrompt, setShowEmailPrompt] = useState(false);
  const [notified, setNotified] = useState(false);
  const [notifyCount, setNotifyCount] = useState(batch.notifyCount ?? 0);
  const [submitting, setSubmitting] = useState(false);
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const [errorNote, setErrorNote] = useState<string | null>(null);

  const isV2 = batch.versionTag.toLowerCase().startsWith("v2");
  const versionLabel = isV2
    ? `${batch.versionTag.toUpperCase()} ARTIST EDITION`
    : `${batch.versionTag.toUpperCase()} PURE-TYPE`;

  const liveDropHref = `/${batch.brandHandle}?batch=${encodeURIComponent(batch.sku)}#catalog`;

  const handleCountdownExpire = () => {
    setIsUnlocked(true);
    onUnlock?.(batch.id);
  };

  const submitNotifySubscription = async (email: string, accessToken?: string) => {
    setSubmitting(true);
    setErrorNote(null);
    setStatusNote(null);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }
      const res = await fetch("/api/drops/notify", {
        method: "POST",
        headers,
        body: JSON.stringify({ batchId: batch.id, email }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.subscribed) {
        setNotified(true);
        setNotifyCount((c) => c + 1);
        setShowEmailPrompt(false);
        setStatusNote(
          data.persistedToDb
            ? `Launch alert saved for ${email}.`
            : `Preview alert armed for ${email}.`,
        );
      } else {
        setErrorNote(data.error || "Unable to register launch alert. Please retry.");
      }
    } catch {
      setErrorNote("Network error saving launch alert. Please retry.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleNotifyClick = async () => {
    if (notified) return;

    let sessionEmail = "";
    let accessToken: string | undefined;
    const sb = getSupabaseBrowserClient();
    if (sb) {
      try {
        const { data } = await sb.auth.getSession();
        accessToken = data?.session?.access_token;
        if (data?.session?.user?.email) {
          sessionEmail = data.session.user.email.trim().toLowerCase();
        }
      } catch {
        // Fallback to inline guest email prompt
      }
    }

    const effectiveEmail = emailInput.trim() || sessionEmail;
    if (effectiveEmail && effectiveEmail.includes("@")) {
      setEmailInput(effectiveEmail);
      await submitNotifySubscription(effectiveEmail, accessToken);
    } else {
      setErrorNote(null);
      setShowEmailPrompt((prev) => !prev);
    }
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim() || !emailInput.includes("@")) {
      setErrorNote("Please enter a valid email address.");
      return;
    }
    void submitNotifySubscription(emailInput.trim());
  };

  return (
    <FrostedCard
      glowOnHover
      className="p-5 flex flex-col justify-between gap-4 border border-white/10 hover:border-[#22D3EE]/40 transition-all"
    >
      <div className="space-y-3">
        {/* Top Row: Version Badge + Status */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span
            className={
              isV2
                ? "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/35 font-mono text-[10px] font-bold text-purple-200"
                : "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/10 border border-white/15 font-mono text-[10px] font-bold text-white/80"
            }
          >
            <Sparkles className="w-3 h-3 text-[#CC5500]" />
            <span>{versionLabel}</span>
          </span>

          {isUnlocked ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#CC5500]/20 border border-[#CC5500]/50 font-mono text-[10px] font-bold text-orange-200">
              <CheckCircle2 className="w-3 h-3 text-[#CC5500]" />
              <span>LIVE NOW</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/15 border border-[#22D3EE]/40 font-mono text-[10px] font-bold text-[#22D3EE]">
              <Lock className="w-3 h-3" />
              <span>LOCKED UNTIL LAUNCH</span>
            </span>
          )}
        </div>

        {/* Title & One-liner */}
        <div className="space-y-1">
          <h3 className="text-base font-bold text-white leading-snug">{batch.title}</h3>
          {batch.artistAttribution && (
            <p className="font-mono text-[11px] text-orange-300">
              {batch.artistAttribution}
            </p>
          )}
          <p className="text-xs text-white/60 leading-relaxed">
            {batch.metadata?.oneLiner ||
              "Serialized physical drop with hardware provenance."}
          </p>
        </div>

        {/* Pricing + Cap Strip */}
        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-black/40 border border-white/8 font-mono text-[11px]">
          <span className="text-white/60">
            BASE:{" "}
            <strong className="text-white">{formatCents(batch.basePriceCents)}</strong>
          </span>
          <span className="text-[#22D3EE]">
            {batch.maxCap ? `1-of-${batch.maxCap} CAP` : "UNCAPPED 1-OF-N"}
          </span>
        </div>
      </div>

      {/* Bottom: Countdown + Notify-Me OR Live Checkout CTA */}
      <div className="space-y-3 pt-2 border-t border-white/10">
        {isUnlocked ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between font-mono text-[11px] text-emerald-300">
              <span>RELEASE WINDOW OPEN</span>
              <span>CHECKOUT UNLOCKED</span>
            </div>
            <Link
              href={liveDropHref}
              className="w-full py-2.5 px-4 rounded-xl bg-[#CC5500] hover:bg-[#e0621a] text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors shadow-[0_0_20px_rgba(204,85,0,0.35)]"
            >
              <span>Enter Live Drop Checkout</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2 font-mono text-xs">
              <span className="inline-flex items-center gap-1.5 text-white/50 text-[11px]">
                <Clock className="w-3.5 h-3.5 text-[#22D3EE]" />
                <span>DROPS IN:</span>
              </span>
              <CountdownTimer
                expiresAt={goesLiveMs}
                format="drop"
                expiredLabel="LIVE"
                onExpire={handleCountdownExpire}
                className="text-sm font-bold text-[#22D3EE]"
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleNotifyClick}
                disabled={notified || submitting}
                className={
                  notified
                    ? "flex-1 h-8 px-3.5 rounded-xl border border-[#CC5500]/50 bg-[#CC5500]/15 text-orange-200 font-medium text-xs inline-flex items-center justify-center gap-1.5"
                    : "flex-1 h-8 px-3.5 rounded-xl bg-[#CC5500] hover:bg-[#E0621A] text-[#F9F9F9] border border-[#CC5500]/50 shadow-[0_0_20px_rgba(204,85,0,0.3)] font-medium text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                }
              >
                {notified ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-orange-400" />
                    <span>Drop Alert Armed</span>
                  </>
                ) : (
                  <>
                    <BellRing className="w-3.5 h-3.5" />
                    <span>Notify Me at Drop</span>
                  </>
                )}
              </button>
              {notifyCount > 0 && (
                <span className="font-mono text-[10px] text-white/45 whitespace-nowrap">
                  {notifyCount} queued
                </span>
              )}
            </div>

            {showEmailPrompt && !notified && (
              <form onSubmit={handleEmailSubmit} className="flex items-center gap-1.5">
                <div className="relative flex-1">
                  <Mail className="w-3 h-3 text-white/35 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="you@studio.com"
                    aria-label="Drop alert email"
                    className="w-full pl-7 pr-2 py-1.5 rounded-lg bg-white/5 border border-white/15 font-mono text-[11px] text-white placeholder:text-white/30 focus:outline-none focus:border-[#22D3EE]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-2.5 py-1.5 rounded-lg bg-[#22D3EE]/20 hover:bg-[#22D3EE]/30 border border-[#22D3EE]/40 font-mono text-[10px] font-bold text-[#22D3EE] cursor-pointer"
                >
                  {submitting ? "..." : "Arm"}
                </button>
              </form>
            )}

            {statusNote && (
              <p className="font-mono text-[10px] text-emerald-300">{statusNote}</p>
            )}
            {errorNote && (
              <p className="font-mono text-[10px] text-red-300">{errorNote}</p>
            )}
          </div>
        )}
      </div>
    </FrostedCard>
  );
}
