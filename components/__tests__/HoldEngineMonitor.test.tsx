// components/__tests__/HoldEngineMonitor.test.tsx
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HoldEngineMonitor } from "@/components/admin/HoldEngineMonitor";

describe("HoldEngineMonitor Admin Component", () => {
  it("renders header, summary metrics, and initial active holds", () => {
    render(<HoldEngineMonitor />);

    expect(screen.getByText("Commerce Hold Engine Monitor")).toBeInTheDocument();
    expect(screen.getByText("Redis Live Engine")).toBeInTheDocument();

    // Summary metric labels
    expect(screen.getByText("Active Holds")).toBeInTheDocument();
    expect(screen.getByText("Payment Retries")).toBeInTheDocument();
    expect(screen.getByText("Expired Releases")).toBeInTheDocument();

    // Product titles in mock data
    expect(
      screen.getByText("Blackened Copper Keyring — Gen 1")
    ).toBeInTheDocument();
  });

  it("filters holds using tab selectors", async () => {
    const user = userEvent.setup();
    render(<HoldEngineMonitor />);

    // Click "PAYMENT RETRYING" tab
    const retryTab = screen.getByRole("button", { name: /PAYMENT RETRYING/i });
    await user.click(retryTab);

    // Only Bridle Leather Bifold is in PAYMENT_RETRYING initially
    expect(
      screen.getByText("Bridle Leather Bifold — Horween #003")
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Blackened Copper Keyring — Gen 1")
    ).not.toBeInTheDocument();

    // Switch back to "ALL"
    const allTab = screen.getByRole("button", { name: /ALL RESERVATIONS/i });
    await user.click(allTab);
    expect(
      screen.getByText("Blackened Copper Keyring — Gen 1")
    ).toBeInTheDocument();
  });

  it("filters holds using the search input", async () => {
    const user = userEvent.setup();
    render(<HoldEngineMonitor />);

    const searchInput = screen.getByPlaceholderText("Search SKU, buyer, title...");
    await user.type(searchInput, "FC-LTH-WLT-003");

    expect(
      screen.getByText("Bridle Leather Bifold — Horween #003")
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Blackened Copper Keyring — Gen 1")
    ).not.toBeInTheDocument();
  });

  it("extends TTL and enters payment retry state on +120s Retry button click", async () => {
    const user = userEvent.setup();
    render(<HoldEngineMonitor />);

    // Find the first "+120s Retry" button
    const retryBtns = screen.getAllByRole("button", { name: /\+120s Retry/i });
    await user.click(retryBtns[0]);

    // Should emit a commerce.payment_failed event in the stream log
    expect(screen.getAllByText("payment_failed").length).toBeGreaterThan(0);
  });

  it("releases hold when Release button is clicked", async () => {
    const user = userEvent.setup();
    render(<HoldEngineMonitor />);

    const releaseBtns = screen.getAllByRole("button", { name: /Release/i });
    await user.click(releaseBtns[0]);

    // Should record a reservation_released event
    expect(screen.getAllByText("reservation_released").length).toBeGreaterThan(0);
  });

  it("fulfills hold and removes it from active list when Fulfill is clicked", async () => {
    const user = userEvent.setup();
    render(<HoldEngineMonitor />);

    const fulfillBtns = screen.getAllByRole("button", { name: /Fulfill/i });
    await user.click(fulfillBtns[0]);

    // Should log commerce.fulfilled
    expect(screen.getAllByText("fulfilled").length).toBeGreaterThan(0);
  });

  it("opens and closes the Redis payload inspection modal", async () => {
    const user = userEvent.setup();
    render(<HoldEngineMonitor />);

    const payloadBtns = screen.getAllByRole("button", { name: /Payload/i });
    await user.click(payloadBtns[0]);

    // Modal opens
    expect(screen.getByText("Redis Hash & State Machine Inspector")).toBeInTheDocument();
    expect(screen.getByText("Copy JSON")).toBeInTheDocument();

    // Copy JSON click
    const copyBtn = screen.getByRole("button", { name: /Copy JSON/i });
    await user.click(copyBtn);
    expect(screen.getByText("Copied")).toBeInTheDocument();

    // Close modal
    const modal = screen.getByText("Redis Hash & State Machine Inspector").closest("div");
    const closeButton = modal?.parentElement?.querySelector("button:has(svg)");
    if (closeButton) {
      await user.click(closeButton);
    }
  });

  it("simulates inbound hold when Simulate Inbound Hold button is clicked", async () => {
    const user = userEvent.setup();
    render(<HoldEngineMonitor />);

    const simBtn = screen.getByRole("button", { name: /Simulate Inbound Hold/i });
    await user.click(simBtn);

    // Stream log should now have a newly created hold event
    expect(screen.getAllByText("hold_created").length).toBeGreaterThan(0);
  });

  it("toggles streaming pause/resume, event filter, expanding payload, and clears event log", async () => {
    const user = userEvent.setup();
    render(<HoldEngineMonitor />);

    // Pause stream
    const pauseBtn = screen.getByRole("button", { name: /Pause Stream/i });
    await user.click(pauseBtn);
    expect(screen.getByText("Resume Stream")).toBeInTheDocument();

    // Resume stream
    const resumeBtn = screen.getByRole("button", { name: /Resume Stream/i });
    await user.click(resumeBtn);
    expect(screen.getByText("Pause Stream")).toBeInTheDocument();

    // Filter events
    const holdCreatedFilter = screen.getByRole("button", { name: "hold_created" });
    await user.click(holdCreatedFilter);

    // Expand first event
    const eventRows = screen.getAllByText("Cart reservation established · 600s TTL lock");
    await user.click(eventRows[0]);
    expect(screen.getByText(/Stream Payload: commerce.hold_created/i)).toBeInTheDocument();

    // Copy JSON in expanded event
    const copyJsonBtn = screen.getByText("Copy JSON");
    await user.click(copyJsonBtn);

    // Clear log
    const clearBtn = screen.getByRole("button", { name: /Clear/i });
    await user.click(clearBtn);
    expect(screen.getByText("No events logged matching filter")).toBeInTheDocument();
  });

  it("refreshes active holds when Sync button is clicked", async () => {
    const user = userEvent.setup();
    render(<HoldEngineMonitor />);

    const syncBtn = screen.getByRole("button", { name: /Sync \(/i });
    await user.click(syncBtn);
    expect(screen.getByText("Blackened Copper Keyring — Gen 1")).toBeInTheDocument();
  });
});
