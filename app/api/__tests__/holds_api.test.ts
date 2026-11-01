// app/api/__tests__/holds_api.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as createHold, GET as getHold } from "../holds/route";
import { POST as releaseHold } from "../holds/release/route";
import { InMemoryRedisClient, setHoldEngineRedisClient } from "@/lib/redis/holdEngine";

describe("Holds API Routes (/api/holds and /api/holds/release)", () => {
  let redis: InMemoryRedisClient;

  beforeEach(() => {
    redis = new InMemoryRedisClient();
    setHoldEngineRedisClient(redis);
  });

  describe("POST /api/holds", () => {
    it("creates a hold and seeds Redis pool from authoritative product stock", async () => {
      const req = new NextRequest("http://localhost:3000/api/holds", {
        method: "POST",
        headers: { "x-user-id": "shopper_alice" },
        body: JSON.stringify({
          productId: "prod_001",
          qty: 1,
          ttlSeconds: 300,
        }),
      });

      const res = await createHold(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.hold?.productId).toBe("prod_001");
      expect(data.hold?.userId).toBe("shopper_alice");
    });

    it("rejects invalid quantity parameters", async () => {
      const invalidQuantities = [0, -1, 1.5, 11];
      for (const qty of invalidQuantities) {
        const req = new NextRequest("http://localhost:3000/api/holds", {
          method: "POST",
          headers: { "x-user-id": "shopper_alice" },
          body: JSON.stringify({
            productId: "prod_001",
            qty,
            ttlSeconds: 300,
          }),
        });

        const res = await createHold(req);
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toContain("Invalid quantity");
      }
    });

    it("rejects invalid ttlSeconds parameters", async () => {
      const invalidTtls = [10, 2000, 30.5];
      for (const ttlSeconds of invalidTtls) {
        const req = new NextRequest("http://localhost:3000/api/holds", {
          method: "POST",
          headers: { "x-user-id": "shopper_alice" },
          body: JSON.stringify({
            productId: "prod_001",
            qty: 1,
            ttlSeconds,
          }),
        });

        const res = await createHold(req);
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toContain("Invalid ttlSeconds");
      }
    });

    it("prevents arbitrary user identity spoofing in request body", async () => {
      const req = new NextRequest("http://localhost:3000/api/holds", {
        method: "POST",
        headers: { "x-user-id": "shopper_verified" },
        body: JSON.stringify({
          productId: "prod_001",
          userId: "victim_user",
          qty: 1,
          ttlSeconds: 300,
        }),
      });

      const res = await createHold(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      // Must attribute to verified identity, not arbitrary target
      expect(data.hold?.userId).toBe("shopper_verified");
    });
  });

  describe("GET /api/holds", () => {
    it("allows the hold owner to inspect hold details", async () => {
      // 1. Create hold
      const createReq = new NextRequest("http://localhost:3000/api/holds", {
        method: "POST",
        headers: { "x-user-id": "shopper_bob" },
        body: JSON.stringify({ productId: "prod_001", qty: 1 }),
      });
      const createRes = await createHold(createReq);
      const holdData = await createRes.json();
      const holdId = holdData.hold.holdId;

      // 2. Read hold as owner
      const readReq = new NextRequest(`http://localhost:3000/api/holds?holdId=${holdId}`, {
        headers: { "x-user-id": "shopper_bob" },
      });
      const readRes = await getHold(readReq);
      expect(readRes.status).toBe(200);
      const readData = await readRes.json();
      expect(readData.hold?.holdId).toBe(holdId);
    });

    it("forbids unauthorized third-party callers from inspecting another shopper's hold", async () => {
      // 1. Create hold for Bob
      const createReq = new NextRequest("http://localhost:3000/api/holds", {
        method: "POST",
        headers: { "x-user-id": "shopper_bob" },
        body: JSON.stringify({ productId: "prod_001", qty: 1 }),
      });
      const createRes = await createHold(createReq);
      const holdData = await createRes.json();
      const holdId = holdData.hold.holdId;

      // 2. Read hold as Eve
      const readReq = new NextRequest(`http://localhost:3000/api/holds?holdId=${holdId}`, {
        headers: { "x-user-id": "shopper_eve" },
      });
      const readRes = await getHold(readReq);
      expect(readRes.status).toBe(403);
      const errorData = await readRes.json();
      expect(errorData.error).toContain("Forbidden");
    });
  });

  describe("POST /api/holds/release", () => {
    it("forbids unauthorized callers from cancelling another shopper's hold", async () => {
      // 1. Create hold for Bob
      const createReq = new NextRequest("http://localhost:3000/api/holds", {
        method: "POST",
        headers: { "x-user-id": "shopper_bob" },
        body: JSON.stringify({ productId: "prod_001", qty: 1 }),
      });
      const createRes = await createHold(createReq);
      const holdData = await createRes.json();
      const holdId = holdData.hold.holdId;

      // 2. Eve tries to cancel Bob's hold
      const cancelReq = new NextRequest("http://localhost:3000/api/holds/release", {
        method: "POST",
        headers: { "x-user-id": "shopper_eve" },
        body: JSON.stringify({ holdId }),
      });
      const cancelRes = await releaseHold(cancelReq);
      expect(cancelRes.status).toBe(403);
      const errorData = await cancelRes.json();
      expect(errorData.error).toContain("Forbidden");
    });

    it("allows the hold owner to release their own hold", async () => {
      // 1. Create hold
      const createReq = new NextRequest("http://localhost:3000/api/holds", {
        method: "POST",
        headers: { "x-user-id": "shopper_charlie" },
        body: JSON.stringify({ productId: "prod_001", qty: 1 }),
      });
      const createRes = await createHold(createReq);
      const holdData = await createRes.json();
      const holdId = holdData.hold.holdId;

      // 2. Charlie cancels their hold
      const cancelReq = new NextRequest("http://localhost:3000/api/holds/release", {
        method: "POST",
        headers: { "x-user-id": "shopper_charlie" },
        body: JSON.stringify({ holdId }),
      });
      const cancelRes = await releaseHold(cancelReq);
      expect(cancelRes.status).toBe(200);
      const cancelData = await cancelRes.json();
      expect(cancelData.success).toBe(true);
    });
  });
});
