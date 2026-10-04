// components/__tests__/ProvenanceBadge.test.tsx
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProvenanceBadge, TIER_CONFIG } from "@/components/ui/ProvenanceBadge";
import type { ChipTier } from "@/lib/mock/shopData";

describe("ProvenanceBadge Component", () => {
  const TIERS: ChipTier[] = [
    "QR_REGISTRY",
    "NTAG213_SERIALIZED",
    "NTAG215_SERIALIZED",
    "NTAG424_DNA",
  ];

  it.each(TIERS)("renders correct label, sublabel, and security level for tier %s in standard mode", (tier) => {
    const config = TIER_CONFIG[tier];
    render(<ProvenanceBadge tier={tier} />);

    expect(screen.getByText(config.label)).toBeInTheDocument();
    expect(screen.getByText(config.sublabel)).toBeInTheDocument();
    expect(screen.getByText(config.securityLevel)).toBeInTheDocument();
  });

  it.each(TIERS)("renders compact version with short label for tier %s", (tier) => {
    const config = TIER_CONFIG[tier];
    render(<ProvenanceBadge tier={tier} compact={true} />);

    expect(screen.getByText(config.shortLabel)).toBeInTheDocument();
  });

  it("handles user clicks when onClick prop is provided", async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<ProvenanceBadge tier="NTAG424_DNA" compact={true} onClick={handleClick} />);

    const button = screen.getByRole("button");
    await user.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("displays interactive tooltip on hover in compact interactive mode", async () => {
    render(<ProvenanceBadge tier="NTAG424_DNA" compact={true} interactive={true} />);

    const button = screen.getByRole("button");

    // Hover to reveal tooltip
    fireEvent.mouseEnter(button);

    const description = await screen.findByText(TIER_CONFIG.NTAG424_DNA.description);
    expect(description).toBeInTheDocument();
    expect(screen.getByText(TIER_CONFIG.NTAG424_DNA.hardwareLevel)).toBeInTheDocument();

    // Mouse leave hides tooltip
    fireEvent.mouseLeave(button);
  });

  it("applies custom classNames properly", () => {
    const { container } = render(
      <ProvenanceBadge tier="QR_REGISTRY" className="custom-test-class" />
    );
    expect(container.firstChild).toHaveClass("custom-test-class");
  });

  it("renders status dot when showStatusDot is true and hides when false", () => {
    const { container: withDot } = render(
      <ProvenanceBadge tier="NTAG424_DNA" compact={false} showStatusDot={true} />
    );
    expect(withDot.querySelector(".bg-violet-400")).toBeInTheDocument();

    const { container: withoutDot } = render(
      <ProvenanceBadge tier="NTAG424_DNA" compact={false} showStatusDot={false} />
    );
    expect(withoutDot.querySelector(".-top-1")).toBeNull();
  });
});
