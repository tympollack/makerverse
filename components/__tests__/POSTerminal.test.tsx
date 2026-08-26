// components/__tests__/POSTerminal.test.tsx
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { POSTerminal } from "@/components/admin/POSTerminal";

describe("POSTerminal Dual-Tier Component", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders header and mode switcher defaulting to High-Touch Mode", () => {
    render(<POSTerminal />);

    expect(screen.getByText("Dual-Tier Point-of-Sale (POS) Terminal")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /High-Touch Mode/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Low-Touch Mode/i })).toBeInTheDocument();
    expect(screen.getByText("Step 1: Select High-Value Craft Item")).toBeInTheDocument();
  });

  it("switches modes between High-Touch and Low-Touch flows", () => {
    render(<POSTerminal />);

    // Switch to Low-Touch
    const lowTouchBtn = screen.getByRole("button", { name: /Low-Touch Mode/i });
    fireEvent.click(lowTouchBtn);
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.getByText("Volume Goods Batch Counter")).toBeInTheDocument();
    expect(screen.getByText(/Unclaimed Physical Tag Advisory Notice/i)).toBeInTheDocument();

    // Switch back to High-Touch
    const highTouchBtn = screen.getByRole("button", { name: /High-Touch Mode/i });
    fireEvent.click(highTouchBtn);
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.getByText("Step 1: Select High-Value Craft Item")).toBeInTheDocument();
  });

  it("simulates full 5-step High-Touch transaction flow (Select -> QR -> NFC -> Confirm -> Minted)", () => {
    render(<POSTerminal />);

    // Step 1: Select item and click Continue
    expect(screen.getByText("Step 1: Select High-Value Craft Item")).toBeInTheDocument();
    const continueBtn = screen.getByRole("button", { name: /Continue with/i });
    fireEvent.click(continueBtn);
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Step 2: Scan Member QR
    expect(screen.getByText("Scan Customer's Cozy Member QR")).toBeInTheDocument();
    const scanBtn = screen.getByRole("button", { name: /Simulate QR Scan for/i });
    fireEvent.click(scanBtn);

    // Advance timer for scan simulation (1200ms) + animation (500ms)
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // Step 3: Tap NFC Chip
    expect(screen.getByText("Tap Physical NTAG424 DNA Chip")).toBeInTheDocument();
    const nfcBtn = screen.getByRole("button", { name: /Simulate Physical NFC Tap/i });
    fireEvent.click(nfcBtn);

    // Advance timer through all cryptographic handshake stages (2500ms) + animation
    act(() => {
      vi.advanceTimersByTime(3500);
    });

    // Step 4: Confirm Mint & Royalty Split
    expect(screen.getByText("Confirm Mint & Ownership Transfer")).toBeInTheDocument();
    expect(screen.getByText("Royalty Split Breakdown")).toBeInTheDocument();
    const executeMintBtn = screen.getByRole("button", { name: /Execute Mint & Ownership Transfer/i });
    fireEvent.click(executeMintBtn);
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Step 5: Minted Success State
    expect(screen.getByText("Ownership Successfully Minted")).toBeInTheDocument();
    expect(screen.getByText("MAKERVERSE PROVENANCE CERTIFICATE")).toBeInTheDocument();

    // Copy Tx Hash
    const copyBtns = screen.getAllByRole("button");
    const copyTxBtn = copyBtns.find((b) => b.querySelector(".lucide-copy"));
    if (copyTxBtn) {
      fireEvent.click(copyTxBtn);
      act(() => {
        vi.advanceTimersByTime(200);
      });
    }

    // Process new transaction resets flow back to Step 1
    const resetBtn = screen.getByRole("button", { name: /Process New Transaction/i });
    fireEvent.click(resetBtn);
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.getByText("Step 1: Select High-Value Craft Item")).toBeInTheDocument();
  });

  it("handles navigation back and cancel actions in High-Touch flow", () => {
    render(<POSTerminal />);

    // Step 1 -> Step 2
    fireEvent.click(screen.getByRole("button", { name: /Continue with/i }));
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Back on Step 2
    const backBtn = screen.getByRole("button", { name: /Back/i });
    fireEvent.click(backBtn);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByText("Step 1: Select High-Value Craft Item")).toBeInTheDocument();

    // Step 1 -> Step 2 -> Step 3
    fireEvent.click(screen.getByRole("button", { name: /Continue with/i }));
    act(() => {
      vi.advanceTimersByTime(500);
    });
    fireEvent.click(screen.getByRole("button", { name: /Simulate QR Scan for/i }));
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByText("Tap Physical NTAG424 DNA Chip")).toBeInTheDocument();

    // Back on Step 3 -> returns to Step 2
    fireEvent.click(screen.getByRole("button", { name: /Back/i }));
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByText("Scan Customer's Cozy Member QR")).toBeInTheDocument();
  });

  it("executes Low-Touch batch checkout with quantity adjustments and unclaimed tag state", () => {
    render(<POSTerminal />);

    // Switch to Low-Touch
    const lowTouchBtn = screen.getByRole("button", { name: /Low-Touch Mode/i });
    fireEvent.click(lowTouchBtn);
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Click plus and minus on items
    const plusButtons = screen.getAllByRole("button").filter((b) => b.querySelector(".lucide-plus"));
    const minusButtons = screen.getAllByRole("button").filter((b) => b.querySelector(".lucide-minus"));

    if (plusButtons.length > 0) {
      fireEvent.click(plusButtons[0]);
    }
    if (minusButtons.length > 0) {
      fireEvent.click(minusButtons[0]);
    }

    // Click instant checkout button
    const checkoutBtn = screen.getByRole("button", { name: /Instant Batch Checkout/i });
    expect(checkoutBtn).toBeInTheDocument();
    fireEvent.click(checkoutBtn);

    // Advance checkout timer (900ms) + animation (500ms)
    act(() => {
      vi.advanceTimersByTime(1600);
    });

    // Finalized banner
    expect(screen.getByText("Batch Sale Finalized")).toBeInTheDocument();
    expect(screen.getByText(/Tags registered as UNCLAIMED/i)).toBeInTheDocument();

    // Start new batch
    const newBatchBtn = screen.getByRole("button", { name: /Start New Batch/i });
    fireEvent.click(newBatchBtn);
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.getByText("Volume Goods Batch Counter")).toBeInTheDocument();
  });

  it("filters transaction ledger by mode and search term", () => {
    render(<POSTerminal />);

    expect(screen.getByText("In-Person POS Transaction Ledger")).toBeInTheDocument();

    // Filter by High-Touch
    const htFilterBtn = screen.getByRole("button", { name: "High-Touch" });
    fireEvent.click(htFilterBtn);

    expect(screen.getAllByText(/FC-BLT-K1-001|FC-LTH-KEY-FOB-019/).length).toBeGreaterThan(0);

    // Filter by Low-Touch
    const ltFilterBtn = screen.getByRole("button", { name: "Low-Touch" });
    fireEvent.click(ltFilterBtn);
    expect(screen.getAllByText(/FC-MTL-PNT-007|FC-D2-88-44/).length).toBeGreaterThan(0);

    // Filter by All Sales
    const allFilterBtn = screen.getByRole("button", { name: "All Sales" });
    fireEvent.click(allFilterBtn);

    // Search filter
    const searchInput = screen.getByPlaceholderText("Search UID, SKU...");
    fireEvent.change(searchInput, { target: { value: "FC-BLT-K1-001" } });

    expect(screen.getAllByText("Blackened Copper Keyring — Gen 1").length).toBeGreaterThan(0);
  });
});
