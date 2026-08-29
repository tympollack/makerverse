// components/__tests__/VersionReleaseBadge.test.tsx
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VersionReleaseBadge } from "@/components/admin/VersionReleaseBadge";

describe("VersionReleaseBadge Component", () => {
  it("renders pill variant displaying release v0.1.0", () => {
    render(<VersionReleaseBadge variant="pill" />);
    expect(screen.getByText("SDK v0.1.0")).toBeInTheDocument();
    expect(screen.getByText("Release")).toBeInTheDocument();
  });

  it("renders badge and subtle variants", () => {
    const { unmount } = render(<VersionReleaseBadge variant="badge" />);
    expect(screen.getByText("v0.1.0")).toBeInTheDocument();
    unmount();

    render(<VersionReleaseBadge variant="subtle" />);
    expect(screen.getByText("v0.1.0")).toBeInTheDocument();
  });

  it("renders banner variant with gateway diagnostics trigger", () => {
    render(<VersionReleaseBadge variant="banner" />);
    expect(screen.getByText("Ecosystem Gateway Online")).toBeInTheDocument();
    expect(screen.getByText("v0.1.0 RELEASE")).toBeInTheDocument();
    expect(screen.getByText("Gateway Diagnostics")).toBeInTheDocument();
  });

  it("opens modal on click and displays handshake info and feature gates", async () => {
    const user = userEvent.setup();
    render(<VersionReleaseBadge variant="pill" />);

    const badgeBtn = screen.getByRole("button", { name: /SDK v0.1.0/i });
    await user.click(badgeBtn);

    // Modal elements
    expect(screen.getByText("Makerverse Ecosystem Version")).toBeInTheDocument();
    expect(screen.getByText("makerverse_sdk v0.1.0")).toBeInTheDocument();
    expect(screen.getByText("Gateway Handshake Status")).toBeInTheDocument();
    expect(screen.getByText("COMPATIBLE")).toBeInTheDocument();
    expect(screen.getByText("Client SDK Version")).toBeInTheDocument();
    expect(screen.getByText("^0.1.0")).toBeInTheDocument();

    // Feature gates
    expect(screen.getByText("REDIS_STREAM_V2_ENVELOPE")).toBeInTheDocument();
    expect(screen.getByText("CART_EXPIRY_RECOVERY")).toBeInTheDocument();
    expect(screen.getByText("NFC_DYNAMIC_TAP_V2")).toBeInTheDocument();

    // Close button
    const closeBtn = screen.getByRole("button", { name: "Close" });
    await user.click(closeBtn);
    expect(screen.queryByText("Makerverse Ecosystem Version")).not.toBeInTheDocument();
  });
});
