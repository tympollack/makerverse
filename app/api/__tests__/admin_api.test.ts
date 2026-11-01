// app/api/__tests__/admin_api.test.ts
import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { GET as getInventory, POST as postInventory } from "../admin/inventory/route";
import { GET as getInstallations } from "../admin/installations/route";
import { GET as getGuestbook, POST as postGuestbook } from "../admin/guestbook/route";
import { GET as getPos, POST as postPos } from "../admin/pos/route";
import { GET as getRaffle, POST as postRaffle } from "../admin/raffle/route";

describe("Admin API Security & Write Integrity", () => {
  const adminHeaders = {
    authorization: "Bearer demo_service_key",
    "content-type": "application/json",
  };

  describe("Authentication Gate (Issues 14 & 17)", () => {
    it("rejects unauthenticated GET requests across all admin routes", async () => {
      const routes = [
        () => getInventory(new NextRequest("http://localhost:3000/api/admin/inventory")),
        () => getInstallations(new NextRequest("http://localhost:3000/api/admin/installations")),
        () => getGuestbook(new NextRequest("http://localhost:3000/api/admin/guestbook")),
        () => getPos(new NextRequest("http://localhost:3000/api/admin/pos")),
        () => getRaffle(new NextRequest("http://localhost:3000/api/admin/raffle")),
      ];

      for (const call of routes) {
        const res = await call();
        expect(res.status).toBe(401);
        const data = await res.json();
        expect(data.error).toContain("Unauthorized");
      }
    });

    it("rejects unauthenticated POST requests across admin write routes", async () => {
      const routes = [
        () => postInventory(new NextRequest("http://localhost:3000/api/admin/inventory", { method: "POST", body: "{}" })),
        () => postGuestbook(new NextRequest("http://localhost:3000/api/admin/guestbook", { method: "POST", body: "{}" })),
        () => postPos(new NextRequest("http://localhost:3000/api/admin/pos", { method: "POST", body: "{}" })),
        () => postRaffle(new NextRequest("http://localhost:3000/api/admin/raffle", { method: "POST", body: "{}" })),
      ];

      for (const call of routes) {
        const res = await call();
        expect(res.status).toBe(401);
        const data = await res.json();
        expect(data.error).toContain("Unauthorized");
      }
    });

    it("allows authenticated administrative requests to GET endpoints", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/installations", {
        headers: adminHeaders,
      });
      const res = await getInstallations(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.installations)).toBe(true);
    });
  });

  describe("Write Error Reporting (Issue 8)", () => {
    it("reports an error status on unpersisted writes instead of acknowledging fake success", async () => {
      // POST inventory without database client configured in this test environment
      const req = new NextRequest("http://localhost:3000/api/admin/inventory", {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({
          title: "New Product",
          sku: "FC-NEW-001",
        }),
      });

      const res = await postInventory(req);
      // Must not report success: true when database persistence is unavailable
      expect(res.status).toBeGreaterThanOrEqual(400);
      const data = await res.json();
      expect(data.success).toBeUndefined();
      expect(data.error).toBeDefined();
    });

    it("validates missing required fields on POST", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/inventory", {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({ title: "Only Title" }),
      });

      const res = await postInventory(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("Missing required fields");
    });
  });
});
