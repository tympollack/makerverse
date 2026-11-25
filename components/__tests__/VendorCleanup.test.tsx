// components/__tests__/VendorCleanup.test.tsx
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  usePathname: () => "/vendor",
}));

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    aside: ({ children, className, ...props }: any) => (
      <aside className={className} {...props}>{children}</aside>
    ),
    div: ({ children, className, ...props }: any) => (
      <div className={className} {...props}>{children}</div>
    ),
    span: ({ children, className, ...props }: any) => (
      <span className={className} {...props}>{children}</span>
    ),
    button: ({ children, className, ...props }: any) => (
      <button className={className} {...props}>{children}</button>
    ),
  },
}));

import VendorLayout from "@/app/(admin)/vendor/layout";
import { VendorDashboardClient } from "@/components/admin/VendorDashboardClient";
import { getProducts } from "@/lib/db/products";
import { getShoppablePosts } from "@/lib/db/posts";

describe("TASK-MKR-PURGE-FORGE-COLLECTIVE: Merchant Cleanup & Zero-State Fidelity", () => {
  it("never renders hardcoded 'The Forge Collective' or '0x4f3E...9aB2' in VendorLayout sidebar", () => {
    render(
      <VendorLayout>
        <div>Child Content</div>
      </VendorLayout>,
    );

    expect(screen.queryByText(/The Forge Collective/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/0x4f3E/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/LIVE TELEMETRY/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/us-west-pdx-01/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/node_status/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/makerverse_sdk/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/SDK v0\.1\.0/i)).not.toBeInTheDocument();
    expect(screen.getByText("Merchant Studio")).toBeInTheDocument();
  });

  it("renders clean zero states in VendorDashboardClient without gateway diagnostics clutter", () => {
    render(
      <VendorDashboardClient
        inventory={[]}
        holds={[]}
        transactions={[]}
        batches={[]}
      />,
    );

    expect(screen.getByText(/Merchant Studio Overview/i)).toBeInTheDocument();
    expect(screen.queryByText(/Ecosystem Gateway Online/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Gateway Diagnostics/i)).not.toBeInTheDocument();
    expect(screen.getByText(/No active cart holds right now/i)).toBeInTheDocument();
    expect(screen.getByText(/No POS transactions recorded yet/i)).toBeInTheDocument();
    expect(screen.getByText(/No SKUs registered yet/i)).toBeInTheDocument();
    expect(screen.queryByText(/The Forge Collective/i)).not.toBeInTheDocument();
  });

  it("does not default getProducts() or getShoppablePosts() to forge-collective when brandHandle is omitted", async () => {
    const products = await getProducts();
    const posts = await getShoppablePosts();
    expect(products).toEqual([]);
    expect(posts).toEqual([]);
  });
});
