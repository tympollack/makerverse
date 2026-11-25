// components/onboarding/FoundingMakerModal.tsx
"use client";

import { Sparkles, ShieldCheck } from "lucide-react";
import { ModalShell } from "@digitalcanopy/ui";
import { FoundingApplicationFields } from "@/components/onboarding/FoundingApplicationForm";

interface FoundingMakerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FoundingMakerModal({ isOpen, onClose }: FoundingMakerModalProps) {
  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      testID="founding-maker-modal"
      title="Claim Your Founding Maker Shop"
      subtitle="Founding Cohort · Wave 1 — Locked 2% Base Fee & 25 Free Starter Tags"
      icon={<Sparkles className="w-4 h-4 text-[#CC5500]" />}
      footer={
        <div className="w-full flex items-center justify-between text-[11px] font-mono text-white/45">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#22D3EE]" />
            <span>$0/mo · Zero listing fees</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-white/8 hover:bg-white/15 text-white/85 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      }
      className="w-full max-w-2xl rounded-2xl bg-[#141414] border border-white/15 shadow-[0_0_50px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col"
      headerClassName="px-6 py-4 border-b border-white/10 bg-[#181818]"
      footerClassName="px-6 py-3 border-t border-white/10 bg-[#181818]"
      bodyClassName="p-6 max-h-[78vh] overflow-y-auto space-y-5"
    >
      <p className="text-xs sm:text-sm text-white/70 leading-relaxed">
        Reserve your Founding Maker storefront in under a minute. Our onboarding team reviews applications directly from Supabase and ships starter tags before your next drop or show.
      </p>

      <FoundingApplicationFields
        idPrefix="modal-apply"
        submitLabel="Submit Founding Shop Claim"
      />
    </ModalShell>
  );
}
