// components/__tests__/RouteLoaderAndSkeletons.test.tsx
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

const mockUsePathname = vi.fn(() => "/");
const mockUseSearchParams = vi.fn(() => new URLSearchParams());

vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
  useSearchParams: () => mockUseSearchParams(),
}));

import { RouteProgressBar } from "@/components/ui/RouteProgressBar";
import VendorDashboardLoading from "@/app/(admin)/vendor/loading";
import VendorInventoryLoading from "@/app/(admin)/vendor/inventory/loading";
import VendorScheduleLoading from "@/app/(admin)/vendor/schedule/loading";
import VendorHoldsLoading from "@/app/(admin)/vendor/holds/loading";
import VendorPosLoading from "@/app/(admin)/vendor/pos/loading";
import VendorInstallationsLoading from "@/app/(admin)/vendor/installations/loading";
import GetBentLoading from "@/app/(shop)/get-bent/loading";

describe("TASK-MKR-GLOBAL-ROUTE-LOADER: RouteProgressBar & Admin Route Skeletons", () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue("/");
    mockUseSearchParams.mockReturnValue(new URLSearchParams());
  });

  it("shows progress bar on internal link click and completes when pathname changes", async () => {
    const { rerender } = render(
      <div>
        <RouteProgressBar />
        <a href="/vendor/schedule" onClick={(e) => e.preventDefault()}>
          Schedule
        </a>
        <a href="https://example.com" target="_blank" rel="noreferrer">
          External
        </a>
        <a href="#apply">Anchor</a>
      </div>,
    );

    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();

    // Hash and external links must not trigger progress bar
    fireEvent.click(screen.getByText("Anchor"));
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("External"));
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();

    // Internal route click immediately starts progress bar
    fireEvent.click(screen.getByText("Schedule"));
    const bar = screen.getByRole("progressbar");
    expect(bar).toBeInTheDocument();
    expect(Number(bar.getAttribute("aria-valuenow"))).toBeGreaterThanOrEqual(18);

    // Pathname transition completes and hides bar after hold delay
    mockUsePathname.mockReturnValue("/vendor/schedule");
    rerender(
      <div>
        <RouteProgressBar />
        <a href="/vendor/schedule">Schedule</a>
      </div>,
    );

    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("100");

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));
    });
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("renders accessible loading skeletons for all /vendor routes and /get-bent", () => {
    const loaders = [
      { Component: VendorDashboardLoading, label: /Loading Vendor Dashboard/i },
      { Component: VendorInventoryLoading, label: /Loading Inventory/i },
      { Component: VendorScheduleLoading, label: /Loading Drop Schedule/i },
      { Component: VendorHoldsLoading, label: /Loading Cart Holds/i },
      { Component: VendorPosLoading, label: /Loading POS Terminal/i },
      { Component: VendorInstallationsLoading, label: /Loading Booth Installations/i },
      { Component: GetBentLoading, label: /Loading Drop Storefront/i },
    ];

    for (const { Component, label } of loaders) {
      const { unmount } = render(<Component />);
      const status = screen.getByRole("status", { name: label });
      expect(status).toHaveAttribute("aria-busy", "true");
      unmount();
    }
  });
});
