// app/api/__tests__/signals_api.test.ts
import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { POST as signalInterest } from "../products/signal/route";

describe("Product Demand Signals API (/api/products/signal)", () => {
  it("rejects unauthenticated requests with 401 (Issue 18)", async () => {
    const req = new NextRequest("http://localhost:3000/api/products/signal", {
      method: "POST",
      body: JSON.stringify({ productId: "prod_001", count: 1 }),
    });

    const res = await signalInterest(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toContain("Authentication required");
  });

  it("accepts bundled product IDs like prod_001 without UUID restriction (Issue 13)", async () => {
    const req = new NextRequest("http://localhost:3000/api/products/signal", {
      method: "POST",
      headers: { "x-user-id": "shopper_bob" },
      body: JSON.stringify({ productId: "prod_001", count: 10, active: true }),
    });

    const res = await signalInterest(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.productId).toBe("prod_001");
    expect(data.demandSignals).toBe(11);
    expect(data.active).toBe(true);
  });

  it("handles unsignaling when active is false (Issue 1)", async () => {
    const req = new NextRequest("http://localhost:3000/api/products/signal", {
      method: "POST",
      headers: { "x-user-id": "shopper_bob" },
      body: JSON.stringify({ productId: "prod_001", count: 10, active: false }),
    });

    const res = await signalInterest(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.productId).toBe("prod_001");
    expect(data.demandSignals).toBe(9);
    expect(data.active).toBe(false);
  });
});
