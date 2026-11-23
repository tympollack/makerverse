// app/api/__tests__/drop_subscriptions.test.tsx
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextRequest } from "next/server";

const mockGetServiceRoleClient = vi.fn();
const mockGetServerClient = vi.fn();
const mockGetBrowserClient = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServiceRoleClient: () => mockGetServiceRoleClient(),
  getSupabaseServerClient: () => mockGetServerClient(),
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseBrowserClient: () => mockGetBrowserClient(),
  isSupabaseConfigured: () => false,
}));

import {
  getUserDropSubscriptions,
  upsertDropSubscription,
  deactivateDropSubscription,
} from "@/app/(shop)/actions/followActions";
import { GET as getUnsubscribe, POST as postUnsubscribe } from "@/app/api/unsubscribe/route";
import { POST as postDropNotify } from "@/app/api/drops/notify/route";
import { FollowToggle } from "@/components/ui/FollowToggle";
import { UpcomingDropCard } from "@/components/shop/UpcomingDropCard";

describe("TASK-MKR-DROP-SUBSCRIPTIONS-SCHEMA: Follow Actions, UI & Unsubscribe", () => {
  beforeEach(() => {
    mockGetServiceRoleClient.mockReset();
    mockGetServerClient.mockReset();
    mockGetBrowserClient.mockReset();
  });

  it("requires an email when guest has no session and upserts guest email into drop_subscriptions", async () => {
    const upsertMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            id: "sub-1",
            unsubscribe_token: "11111111-1111-4111-8111-111111111111",
            is_active: true,
          },
          error: null,
        }),
      }),
    });

    mockGetServiceRoleClient.mockReturnValue({
      auth: { getUser: vi.fn() },
      from: vi.fn().mockReturnValue({ upsert: upsertMock }),
    });

    const missingEmail = await upsertDropSubscription({
      targetType: "brand",
      targetId: "b0000001-0000-0000-0000-000000000001",
    });
    expect(missingEmail.success).toBe(false);
    expect(missingEmail.requiresEmail).toBe(true);

    const guestOk = await upsertDropSubscription({
      email: "  Collector@Example.COM ",
      targetType: "brand",
      targetId: "b0000001-0000-0000-0000-000000000001",
    });
    expect(guestOk.success).toBe(true);
    expect(guestOk.persistedToDb).toBe(true);
    expect(guestOk.email).toBe("collector@example.com");
    expect("unsubscribeToken" in guestOk).toBe(false);
    expect(upsertMock).toHaveBeenCalledWith(
      {
        email: "collector@example.com",
        user_id: null,
        target_type: "brand",
        target_id: "b0000001-0000-0000-0000-000000000001",
        is_active: true,
      },
      { onConflict: "email,target_type,target_id", ignoreDuplicates: true },
    );

    const guestDeactivate = await deactivateDropSubscription({
      email: "collector@example.com",
      targetType: "brand",
      targetId: "b0000001-0000-0000-0000-000000000001",
    });
    expect(guestDeactivate.success).toBe(false);
    expect(guestDeactivate.requiresAuthOrEmailLink).toBe(true);
    expect(guestDeactivate.error).toContain("unsubscribe link");
  });

  it("automatically captures logged-in user email and deactivates on unfollow", async () => {
    const upsertMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            id: "sub-2",
            unsubscribe_token: "22222222-2222-4222-8222-222222222222",
            is_active: true,
          },
          error: null,
        }),
      }),
    });

    const orMock = vi.fn().mockResolvedValue({ error: null });
    const updateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          or: orMock,
        }),
      }),
    });

    mockGetServiceRoleClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
              email: "member@sunshade.icu",
            },
          },
          error: null,
        }),
      },
      from: vi.fn().mockImplementation(() => ({
        upsert: upsertMock,
        update: updateMock,
      })),
    });

    const res = await upsertDropSubscription({
      targetType: "product_line",
      targetId: "prod-line-1",
      authToken: "jwt-token-123",
    });

    expect(res.success).toBe(true);
    expect(res.email).toBe("member@sunshade.icu");
    expect(upsertMock).toHaveBeenCalledWith(
      {
        email: "member@sunshade.icu",
        user_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        target_type: "product_line",
        target_id: "prod-line-1",
        is_active: true,
      },
      { onConflict: "email,target_type,target_id" },
    );

    const offRes = await deactivateDropSubscription({
      targetType: "product_line",
      targetId: "prod-line-1",
      authToken: "jwt-token-123",
    });
    expect(offRes.success).toBe(true);
    expect(offRes.subscribed).toBe(false);
    expect(orMock).toHaveBeenCalledWith(
      "user_id.eq.aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa,email.eq.member@sunshade.icu",
    );
  });

  it("renders read-only confirm page on GET and unsubscribes on POST /api/unsubscribe", async () => {
    const validToken = "33333333-3333-4333-8333-333333333333";
    const maybeSingleUpdateMock = vi.fn().mockResolvedValue({
      data: {
        id: "sub-3",
        target_type: "brand",
        target_id: "get-bent",
        is_active: false,
      },
      error: null,
    });
    const updateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          maybeSingle: maybeSingleUpdateMock,
        }),
      }),
    });
    const selectMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            id: "sub-3",
            target_type: "brand",
            is_active: true,
          },
          error: null,
        }),
      }),
    });

    mockGetServiceRoleClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: selectMock,
        update: updateMock,
      }),
    });

    const invalidRes = await getUnsubscribe(
      new NextRequest("http://localhost:3000/api/unsubscribe?token=bad-token"),
    );
    expect(invalidRes.status).toBe(400);

    const okGet = await getUnsubscribe(
      new NextRequest(`http://localhost:3000/api/unsubscribe?token=${validToken}`),
    );
    expect(okGet.status).toBe(200);
    const html = await okGet.text();
    expect(html).toContain("Confirm Unsubscribe");
    expect(html).toContain('method="POST"');
    expect(html).toContain("#1A1A1A");
    expect(updateMock).not.toHaveBeenCalled();

    const okPost = await postUnsubscribe(
      new NextRequest(`http://localhost:3000/api/unsubscribe?token=${validToken}`, {
        method: "POST",
      }),
    );
    expect(okPost.status).toBe(200);
    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(await okPost.json()).toEqual({
      success: true,
      unsubscribed: true,
      targetType: "brand",
    });

    const browserPost = await postUnsubscribe(
      new NextRequest(`http://localhost:3000/api/unsubscribe?token=${validToken}`, {
        method: "POST",
        headers: { accept: "text/html" },
      }),
    );
    expect(browserPost.status).toBe(200);
    expect(await browserPost.text()).toContain("You&#039;ve Been Unsubscribed");
  });

  it("upserts into drop_subscriptions when /api/drops/notify receives a valid batch subscription", async () => {
    const batchId = "44444444-4444-4444-8444-444444444444";
    const upsertDropSub = vi.fn().mockResolvedValue({ error: null });
    const insertNotifySub = vi.fn().mockResolvedValue({ error: null });

    mockGetServiceRoleClient.mockReturnValue({
      auth: { getUser: vi.fn() },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "product_batches") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: batchId,
                    is_published: true,
                    is_public_teaser: true,
                    goes_live_at: new Date(Date.now() + 3_600_000).toISOString(),
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "drop_notify_subscriptions") return { insert: insertNotifySub };
        if (table === "drop_subscriptions") return { upsert: upsertDropSub };
        return {};
      }),
    });

    const res = await postDropNotify(
      new NextRequest("http://localhost:3000/api/drops/notify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ batchId, email: "fan@studio.com" }),
      }),
    );
    expect(res.status).toBe(200);
    expect(insertNotifySub).toHaveBeenCalledTimes(1);
    expect(upsertDropSub).toHaveBeenCalledWith(
      {
        email: "fan@studio.com",
        user_id: null,
        target_type: "batch",
        target_id: batchId,
        is_active: true,
      },
      { onConflict: "email,target_type,target_id", ignoreDuplicates: true },
    );
  });

  it("blocks anonymous shopper sessions from claiming ownership or reversing opt-outs", async () => {
    const batchId = "66666666-6666-4666-8666-666666666666";
    const upsertDropSub = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    });
    const upsertNotifySub = vi.fn().mockResolvedValue({ error: null });
    const insertNotifySub = vi.fn().mockResolvedValue({ error: null });

    mockGetServiceRoleClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: "anon-uuid-1234",
              email: null,
              is_anonymous: true,
            },
          },
          error: null,
        }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "product_batches") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: batchId,
                    is_published: true,
                    is_public_teaser: true,
                    goes_live_at: new Date(Date.now() + 3_600_000).toISOString(),
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "drop_notify_subscriptions") return { insert: insertNotifySub };
        if (table === "drop_subscriptions") {
          return {
            upsert: (row: unknown, opts: unknown) => {
              upsertNotifySub(row, opts);
              return upsertDropSub(row, opts);
            },
          };
        }
        return {};
      }),
    });

    const anonUpsert = await upsertDropSubscription({
      email: "victim@example.com",
      targetType: "brand",
      targetId: "b0000001-0000-0000-0000-000000000001",
      authToken: "anon-jwt",
    });
    expect(anonUpsert.success).toBe(true);
    expect(upsertNotifySub).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "victim@example.com",
        user_id: null,
      }),
      { onConflict: "email,target_type,target_id", ignoreDuplicates: true },
    );

    const anonDeactivate = await deactivateDropSubscription({
      email: "victim@example.com",
      targetType: "brand",
      targetId: "b0000001-0000-0000-0000-000000000001",
      authToken: "anon-jwt",
    });
    expect(anonDeactivate.success).toBe(false);
    expect(anonDeactivate.requiresAuthOrEmailLink).toBe(true);

    const notifyRes = await postDropNotify(
      new NextRequest("http://localhost:3000/api/drops/notify", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer anon-jwt",
        },
        body: JSON.stringify({ batchId, email: "victim@example.com" }),
      }),
    );
    expect(notifyRes.status).toBe(200);
    expect(upsertNotifySub).toHaveBeenLastCalledWith(
      expect.objectContaining({
        email: "victim@example.com",
        user_id: null,
      }),
      { onConflict: "email,target_type,target_id", ignoreDuplicates: true },
    );
  });

  it("prompts guest inline on FollowToggle and auto-captures logged-in user on UpcomingDropCard", async () => {
    const user = userEvent.setup();
    const upsertMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: "sub-ui", unsubscribe_token: "tok-ui", is_active: true },
          error: null,
        }),
      }),
    });
    mockGetServiceRoleClient.mockReturnValue({
      auth: { getUser: vi.fn() },
      from: vi.fn().mockReturnValue({ upsert: upsertMock }),
    });
    mockGetBrowserClient.mockReturnValue(null);

    render(
      <FollowToggle
        target="brand"
        targetType="brand"
        targetId="brand-get-bent"
      />,
    );

    await user.click(screen.getByRole("button", { name: /Follow Brand Line/i }));
    await user.type(screen.getByLabelText(/Follow alert email/i), "guest@maker.io");
    await user.click(screen.getByRole("button", { name: /^Follow$/i }));

    await waitFor(() => {
      expect(screen.getByText(/Following Brand Line/i)).toBeInTheDocument();
    });
    expect(upsertMock).toHaveBeenCalledTimes(1);

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(
          JSON.stringify({ success: true, persistedToDb: true, subscribed: true }),
          { status: 200 },
        ),
      );

    mockGetBrowserClient.mockReturnValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: {
              access_token: "sess-tok",
              user: { email: "authed@sunshade.icu" },
            },
          },
        }),
      },
    });

    render(
      <UpcomingDropCard
        batch={{
          id: "55555555-5555-4555-8555-555555555555",
          brandId: "b1",
          brandHandle: "get-bent",
          title: "Batch 009: Stunt Drop",
          sku: "GB-009",
          batchNumber: 9,
          isPublished: true,
          goesLiveAt: new Date(Date.now() + 60_000).toISOString(),
          autoRetireAt: null,
          versionTag: "v2.0",
          isPublicTeaser: true,
          chipTier: "NTAG213_SERIALIZED",
          basePriceCents: 2500,
          maxCap: 100,
          mintedCount: 0,
          vanityAuctionEnabled: true,
        }}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Notify Me at Drop/i }));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/drops/notify",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer sess-tok",
          }),
          body: JSON.stringify({
            batchId: "55555555-5555-4555-8555-555555555555",
            email: "authed@sunshade.icu",
          }),
        }),
      );
    });

    fetchSpy.mockRestore();
  });

  it("restores signed-in FollowToggle state on fresh mount via getUserDropSubscriptions", async () => {
    const userId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const productLineId = "line-gb-heavy";

    mockGetBrowserClient.mockReturnValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: {
              access_token: "sess-jwt-restore",
              user: { id: userId, email: "member@sunshade.icu" },
            },
          },
        }),
      },
    });

    mockGetServiceRoleClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: { id: userId, email: "member@sunshade.icu" },
          },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            or: vi.fn().mockResolvedValue({
              data: [{ target_type: "product_line", target_id: productLineId }],
              error: null,
            }),
          }),
        }),
      }),
    });

    const subs = await getUserDropSubscriptions({ authToken: "sess-jwt-restore" });
    expect(subs.authenticated).toBe(true);
    expect(subs.targets).toEqual([
      { targetType: "product_line", targetId: productLineId },
    ]);

    render(
      <FollowToggle
        target="product"
        targetType="product_line"
        targetId={productLineId}
        initialFollowed={false}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/Following Line/i)).toBeInTheDocument();
    });
  });
});
