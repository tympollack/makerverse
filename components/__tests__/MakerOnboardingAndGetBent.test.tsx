// components/__tests__/MakerOnboardingAndGetBent.test.tsx
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { submitPilotApplication } from "@/app/actions/pilotApplication";
import MakerOnboardingLandingPage from "@/app/page";
import GetBentFlagshipDropPage from "@/app/(shop)/get-bent/page";
import { InventoryManager } from "@/components/admin/InventoryManager";
import { HoldEngineMonitor } from "@/components/admin/HoldEngineMonitor";
import { POSTerminal } from "@/components/admin/POSTerminal";

describe("Task 1: Zero-State Rendering in Admin Modules", () => {
  it("renders clean zero-state cards in InventoryManager when empty", () => {
    render(<InventoryManager initialItems={[]} initialChips={[]} />);
    expect(
      screen.getAllByText(/Register your first physical piece or batch/i).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText(/No NFC chips queued for encoding/i),
    ).toBeInTheDocument();
  });

  it("renders clean zero-state card in HoldEngineMonitor when empty", () => {
    render(<HoldEngineMonitor initialHolds={[]} initialEvents={[]} />);
    expect(
      screen.getByText(/No active 10-minute holds/i),
    ).toBeInTheDocument();
  });

  it("renders clean zero-state card in POSTerminal ledger when empty", () => {
    render(<POSTerminal initialTransactions={[]} />);
    expect(
      screen.getByText(/No POS transactions recorded yet/i),
    ).toBeInTheDocument();
  });
});

describe("Task 2: Public Maker & Artist Onboarding Page (app/page.tsx)", () => {
  it("renders simplified hero, live drops showcase, creator-first pricing, and 3-card how-it-works grid", () => {
    render(<MakerOnboardingLandingPage />);

    // Top Nav
    expect(screen.getAllByText("MAKERVERSE").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/FOUNDING COHORT · WAVE 1/i).length,
    ).toBeGreaterThan(0);

    // Hero Headline & Subheadline
    expect(
      screen.getByText(
        /Your Art Doesn't End at the Booth\. Give Every Piece a Living Passport\./i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Run timed 24-hour drops, sell in-person at your booth, and give every piece a tap-to-verify digital passport/i,
      ),
    ).toBeInTheDocument();

    // Live Drops Showcase
    expect(
      screen.getByText(/See Real Maker Drops Running on Makerverse/i),
    ).toBeInTheDocument();

    // 3-Card How It Works Grid (plain-language)
    expect(screen.getByText("Tap-to-Verify Tags")).toBeInTheDocument();
    expect(
      screen.getByText(/Timed Drops & Custom Serials/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Direct Collector Updates & Booth Pins/i),
    ).toBeInTheDocument();

    // Locked Fee Economics
    expect(
      screen.getByText(/\$0 \/ month Storefront & Drop Hosting/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/2% Base Platform Fee \(\$0\.05 minimum\)/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/80 \/ 20 Auction & Vanity Surplus Split/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/5%–10% Automated Secondary Royalties/i),
    ).toBeInTheDocument();
  });

  it("cycles plain-language NFC Passport Simulator states when 'Simulate NFC Tap' is clicked", async () => {
    const user = userEvent.setup();
    render(<MakerOnboardingLandingPage />);

    expect(
      screen.getByText("Studio Mint · Ready for First Buyer"),
    ).toBeInTheDocument();

    const tapBtn = screen.getByRole("button", { name: /Simulate NFC Tap/i });
    await user.click(tapBtn);

    expect(
      screen.getByText("Collector Claimed · Proof of Authenticity"),
    ).toBeInTheDocument();

    await user.click(tapBtn);
    expect(
      screen.getByText("Resold Later · Automatic Creator Royalty"),
    ).toBeInTheDocument();
  });

  it("submits Founding Cohort Application Form (#apply) with graceful confirmation", async () => {
    const user = userEvent.setup();
    render(<MakerOnboardingLandingPage />);

    await user.type(
      screen.getByLabelText(/Artist \/ Brand Name/i),
      "Get Bent Clothing",
    );
    await user.selectOptions(
      screen.getByLabelText(/Medium \/ Craft/i),
      "Apparel",
    );
    await user.type(
      screen.getByLabelText(/Instagram \/ Portfolio Handle/i),
      "@get-bent",
    );
    await user.type(screen.getByLabelText(/Email/i), "founder@getbent.studio");

    const submitBtn = screen.getByRole("button", {
      name: /Submit Founding Cohort Application/i,
    });
    await user.click(submitBtn);

    expect(
      await screen.findByText(/Application Confirmed/i),
    ).toBeInTheDocument();
  });

  it("opens inline Founding Maker modal when 'Claim a Founding Maker Shop' is clicked and submits to intake", async () => {
    const user = userEvent.setup();
    render(<MakerOnboardingLandingPage />);

    const ctaBtn = screen.getByRole("button", {
      name: /Claim a Founding Maker Shop/i,
    });
    await user.click(ctaBtn);

    const modal = screen.getByTestId("founding-maker-modal");
    const modalScope = within(modal);

    expect(
      modalScope.getByRole("button", { name: /Submit Founding Shop Claim/i }),
    ).toBeInTheDocument();

    await user.type(
      modalScope.getByLabelText(/Artist \/ Brand Name/i),
      "Solstice Glassworks",
    );
    await user.selectOptions(
      modalScope.getByLabelText(/Medium \/ Craft/i),
      "Visual Art",
    );
    await user.type(
      modalScope.getByLabelText(/Instagram \/ Portfolio Handle/i),
      "@solsticeglass",
    );
    await user.type(
      modalScope.getByLabelText(/Email/i),
      "studio@solsticeglass.art",
    );

    await user.click(
      modalScope.getByRole("button", { name: /Submit Founding Shop Claim/i }),
    );

    expect(
      await modalScope.findByText(/Application Confirmed/i),
    ).toBeInTheDocument();

    await user.click(modalScope.getByRole("button", { name: "Close" }));
    expect(
      screen.queryByTestId("founding-maker-modal"),
    ).not.toBeInTheDocument();
  });

  it("rejects malformed email addresses cleanly in submitPilotApplication", async () => {
    const res = await submitPilotApplication({
      artistBrandName: "Test Studio",
      mediumCraft: "Visual Art",
      portfolioHandle: "@teststudio",
      email: "not-an-email",
    });

    expect(res.success).toBe(false);
    expect(res.error).toBe("VALIDATION_ERROR");
  });
});

describe("Task 3: Live 24-Hour Anti-Black Friday Flagship Drop (/get-bent)", () => {
  it("renders urgency header, pure-typography shirt preview, and dual-track checkout", async () => {
    const user = userEvent.setup();
    render(<GetBentFlagshipDropPage />);

    // Brand & Urgency Header
    expect(screen.getByText("GET BENT CLOTHING")).toBeInTheDocument();
    expect(screen.getByText("VERIFIED FOUNDER STORE")).toBeInTheDocument();
    expect(
      screen.getByText(
        /BLACK FRIDAY BOYCOTT POOL: 114 SHIRTS MINTED SO FAR — NEVER REPRINTED/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /BLACK FRIDAY DEAL: \$25\.00 \| FAKE MARKDOWN: \$0\.00 \(0% BS\)/i,
      ),
    ).toBeInTheDocument();

    // Pure-Typography Back Print (default) and toggle to Front View
    expect(
      screen.getByText(/I BOUGHT THIS SHIRT/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/#069 \/ N — AUCTION EDITION/i),
    ).toBeInTheDocument();

    const frontViewBtn = screen.getByRole("button", { name: /Front View/i });
    await user.click(frontViewBtn);
    expect(screen.getByText("GET BENT // BF-2026")).toBeInTheDocument();

    // Track A & Track B rules and vanity serials
    expect(
      screen.getByText(/10-Minute Popcorn Anti-Snipe Rule Active/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Every runner-up automatically converts to a sequential hopper edition/i,
      ),
    ).toBeInTheDocument();

    // Claim Vanity #007
    const vanity007 = screen.getByRole("button", { name: /#007 \/ N/i });
    await user.click(vanity007);

    const claimBtn = screen.getByRole("button", {
      name: /Claim Vanity Serial #007 \/ N/i,
    });
    await user.click(claimBtn);

    // Pool counter increments to 115
    expect(
      screen.getByText(
        /BLACK FRIDAY BOYCOTT POOL: 115 SHIRTS MINTED SO FAR — NEVER REPRINTED/i,
      ),
    ).toBeInTheDocument();
  });
});
