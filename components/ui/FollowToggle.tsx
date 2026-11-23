// components/ui/FollowToggle.tsx
"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Mail, Plus, Radio } from "lucide-react";
import {
  deactivateDropSubscription,
  getUserDropSubscriptions,
  upsertDropSubscription,
  type DropSubscriptionTargetType,
} from "@/app/(shop)/actions/followActions";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export type FollowTarget = "brand" | "product";

export interface FollowToggleProps {
  target: FollowTarget;
  initialFollowed?: boolean;
  label?: string;
  followingLabel?: string;
  onToggle?: (isFollowed: boolean) => void;
  targetType?: DropSubscriptionTargetType;
  targetId?: string;
  userEmail?: string | null;
  onSubscriptionChange?: (state: { followed: boolean; email?: string }) => void;
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "ghost" | "chip";
  showIcon?: boolean;
}

export function FollowToggle({
  target,
  initialFollowed = false,
  label,
  followingLabel,
  onToggle,
  targetType,
  targetId,
  userEmail,
  onSubscriptionChange,
  className,
  size = "md",
  variant = "primary",
  showIcon = true,
}: FollowToggleProps) {
  const [followed, setFollowed] = useState(initialFollowed);
  const [prevInitialFollowed, setPrevInitialFollowed] = useState(initialFollowed);
  const [showEmailPrompt, setShowEmailPrompt] = useState(false);
  const [guestEmail, setGuestEmail] = useState(userEmail ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [statusNote, setStatusNote] = useState<string | null>(null);

  if (prevInitialFollowed !== initialFollowed) {
    setPrevInitialFollowed(initialFollowed);
    setFollowed(initialFollowed);
  }

  // Restore saved subscription state on fresh mount for signed-in shoppers
  useEffect(() => {
    if (!targetType || !targetId || initialFollowed) return;
    const sb = getSupabaseBrowserClient();
    if (!sb) return;

    let active = true;
    async function restoreSignedInPreference() {
      try {
        const { data } = await sb!.auth.getSession();
        const accessToken = data?.session?.access_token;
        if (!accessToken) return;

        const saved = await getUserDropSubscriptions({ authToken: accessToken });
        if (!active || !saved.authenticated) return;

        if (saved.email) {
          setGuestEmail(saved.email);
        }

        const isSaved = saved.targets.some(
          (t) => t.targetType === targetType && t.targetId === targetId,
        );
        if (isSaved) {
          setFollowed(true);
        }
      } catch {
        // Non-blocking fallback
      }
    }

    void restoreSignedInPreference();
    return () => {
      active = false;
    };
  }, [targetType, targetId, initialFollowed]);

  const persistSubscription = async (
    nextFollowed: boolean,
    explicitEmail?: string,
    authToken?: string,
  ) => {
    if (!targetType || !targetId) return;
    setSubmitting(true);
    try {
      const res = nextFollowed
        ? await upsertDropSubscription({
            email: explicitEmail,
            targetType,
            targetId,
            isActive: true,
            authToken,
          })
        : await deactivateDropSubscription({
            email: explicitEmail,
            targetType,
            targetId,
            authToken,
          });

      if (nextFollowed && res.requiresEmail) {
        setShowEmailPrompt(true);
        setStatusNote(null);
        return;
      }

      if (!nextFollowed && res.requiresAuthOrEmailLink) {
        // Local UI toggle resets for guest session while instructing email-link opt-out
        setFollowed(false);
        setStatusNote(res.error || "Use the unsubscribe link in your email to stop future alerts.");
        onToggle?.(false);
        return;
      }

      if (res.success) {
        setFollowed(nextFollowed);
        setShowEmailPrompt(false);
        if (res.email) setGuestEmail(res.email);
        setStatusNote(
          nextFollowed
            ? `Drop alerts armed${res.email ? ` for ${res.email}` : ""}.`
            : null,
        );
        onToggle?.(nextFollowed);
        onSubscriptionChange?.({ followed: nextFollowed, email: res.email });
      } else {
        setStatusNote(res.error || "Unable to update alert preference.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!targetType || !targetId) {
      const next = !followed;
      setFollowed(next);
      onToggle?.(next);
      return;
    }

    let sessionEmail = (userEmail || guestEmail || "").trim().toLowerCase();
    let accessToken: string | undefined;

    const sb = getSupabaseBrowserClient();
    if (sb) {
      try {
        const { data } = await sb.auth.getSession();
        const sessionUser = data?.session?.user;
        const hasVerifiedEmailSession = Boolean(
          data?.session?.access_token &&
            sessionUser?.email &&
            !sessionUser?.is_anonymous,
        );
        if (hasVerifiedEmailSession) {
          accessToken = data?.session?.access_token;
          sessionEmail = sessionUser!.email!.trim().toLowerCase();
        }
      } catch {
        // Non-blocking fallback to guest flow
      }
    }

    if (followed) {
      await persistSubscription(false, sessionEmail || undefined, accessToken);
      return;
    }

    if (sessionEmail && sessionEmail.includes("@")) {
      await persistSubscription(true, sessionEmail, accessToken);
      return;
    }

    setShowEmailPrompt((prev) => !prev);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const cleaned = guestEmail.trim().toLowerCase();
    if (!cleaned || !cleaned.includes("@")) {
      setStatusNote("Please enter a valid email address.");
      return;
    }
    await persistSubscription(true, cleaned);
  };

  const sizeClasses = {
    sm: "h-7 px-2.5 text-xs gap-1.5",
    md: "h-8 px-3.5 text-xs gap-2",
    lg: "h-10 px-5 text-sm gap-2.5 font-medium",
  };

  const defaultUnfollowedLabel =
    target === "brand" ? "Follow Brand Line" : "Follow Line";
  const defaultFollowedLabel =
    target === "brand" ? "Following Brand Line" : "Following Line";

  const currentLabel = followed
    ? followingLabel ?? defaultFollowedLabel
    : label ?? defaultUnfollowedLabel;

  return (
    <div className={cn("inline-flex flex-col gap-1.5", className)}>
      <motion.button
        type="button"
        disabled={submitting}
        onClick={(e) => void handleToggle(e)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.96 }}
        transition={{ type: "spring", stiffness: 450, damping: 25 }}
        className={cn(
          "relative inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 cursor-pointer select-none overflow-hidden",
          sizeClasses[size],
          followed
            ? "border border-[#CC5500]/50 bg-[#CC5500]/15 text-orange-200 shadow-[0_0_20px_rgba(204,85,0,0.25)] hover:bg-[#CC5500]/25"
            : variant === "primary"
              ? "bg-[#CC5500] hover:bg-[#E0621A] text-[#F9F9F9] shadow-[0_0_20px_rgba(204,85,0,0.3)] border border-[#CC5500]/50"
              : "border border-white/15 bg-white/5 text-white/70 hover:border-white/30 hover:text-white hover:bg-white/10",
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          {followed ? (
            <motion.span
              key="followed"
              initial={{ opacity: 0, y: 6, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="flex items-center gap-1.5"
            >
              {showIcon && (
                <motion.span
                  initial={{ rotate: -45, scale: 0 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 600, damping: 20 }}
                >
                  <Check className="w-3.5 h-3.5 text-orange-400 stroke-[2.5]" />
                </motion.span>
              )}
              <span>{currentLabel}</span>
            </motion.span>
          ) : (
            <motion.span
              key="unfollowed"
              initial={{ opacity: 0, y: 6, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="flex items-center gap-1.5"
            >
              {showIcon && (
                <motion.span
                  initial={{ rotate: 45, scale: 0 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 600, damping: 20 }}
                >
                  {target === "brand" ? (
                    <Radio className="w-3.5 h-3.5" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                </motion.span>
              )}
              <span>{currentLabel}</span>
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {showEmailPrompt && !followed && (
        <form
          onSubmit={(e) => void handleEmailSubmit(e)}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1.5"
        >
          <div className="relative flex-1 min-w-[160px]">
            <Mail className="w-3 h-3 text-white/35 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              required
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              placeholder="you@studio.com"
              aria-label="Follow alert email"
              className="w-full pl-7 pr-2 py-1 rounded-lg bg-white/5 border border-white/15 font-mono text-[11px] text-white placeholder:text-white/30 focus:outline-none focus:border-[#CC5500]"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="px-2.5 py-1 rounded-lg bg-[#CC5500]/25 hover:bg-[#CC5500]/40 border border-[#CC5500]/50 font-mono text-[10px] font-bold text-orange-200 cursor-pointer"
          >
            {submitting ? "..." : "Follow"}
          </button>
        </form>
      )}

      {statusNote && (
        <p className="font-mono text-[10px] text-emerald-300">{statusNote}</p>
      )}
    </div>
  );
}
