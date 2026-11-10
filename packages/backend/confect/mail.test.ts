/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import type { FunctionArgs } from "convex/server";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { components, internal } from "../convex/_generated/api";
import schema from "../convex/schema";
import type { PolicyNotice } from "./legal";
import { authComponent } from "./lib/betterAuth";
import { seedAuthUser } from "./test.helpers";

const modules = import.meta.glob("../convex/**/*.ts");

const DAY = Date.UTC(2026, 10, 4);

vi.mock(import("./legal"), async (original) => {
    const legal = await original();
    const changes = { en: [], es: [], fr: [], pt: [] };
    return {
        ...legal,
        POLICY_NOTICES: [
            { changes, document: "terms", effectiveAtMs: Date.UTC(2026, 10, 3) },
            { changes, document: "privacy", effectiveAtMs: DAY },
            { changes, document: "terms", effectiveAtMs: DAY },
        ] satisfies PolicyNotice[],
    };
});

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
});

function stubCloudflare(refuse: (to: string) => boolean = () => false) {
    const sent: { subject: string; to: string }[] = [];
    vi.stubGlobal(
        "fetch",
        vi.fn(async (_url: string, init?: RequestInit) => {
            const { subject, to }: { subject: string; to: string } = JSON.parse(String(init?.body));
            if (refuse(to)) {
                return new Response("busy", { status: 502 });
            }
            sent.push({ subject, to });
            return Response.json({ errors: [], success: true });
        })
    );
    return sent;
}

describe("the Pro email", () => {
    it("goes out once per account, however often activation fires, and never for a sandbox purchase", async () => {
        vi.useFakeTimers();
        const t = convexTest(schema, modules);
        const owner = await seedAuthUser(t);
        const sent = stubCloudflare();
        const activation: FunctionArgs<typeof internal.mail.claimPro> = {
            appUserId: owner.userId,
            entitlementId: "pro",
            expiresAtMs: Date.UTC(2027, 9, 30),
            isSandbox: false,
            productId: "outlayr_pro:yearly",
            sourceEventType: "INITIAL_PURCHASE",
            store: "PLAY_STORE",
        };

        await t.mutation(internal.mail.claimPro, { ...activation, isSandbox: true });
        await t.mutation(internal.mail.claimPro, activation);
        await t.mutation(internal.mail.claimPro, { ...activation, sourceEventType: "SYNC" });
        await t.finishAllScheduledFunctions(vi.runAllTimers);

        expect(sent).toStrictEqual([{ subject: "Outlayr Pro is on", to: owner.email }]);
    });

    it("is skipped, not crashed, when the RevenueCat app user ID is not an auth user ID", async () => {
        const t = convexTest(schema, modules);
        vi.spyOn(authComponent, "getAnyUserById").mockRejectedValue(
            new Error("Unable to decode ID: Invalid ID length 39")
        );
        vi.spyOn(console, "warn").mockReturnValue(undefined);

        await expect(
            t.query(internal.mail.recipient, { userId: "not-a-convex-id-but-a-revenuecat-alias" })
        ).resolves.toBeNull();
    });
});

describe("the trial reminder", () => {
    it("goes out two days before a web trial's first charge, and not once the trial is cancelled", async () => {
        const startedAt = Date.UTC(2027, 1, 1, 12);
        const chargeAt = startedAt + 7 * 86_400_000;
        vi.useFakeTimers({ now: startedAt });
        const t = convexTest(schema, modules);
        const keeps = await seedAuthUser(t);
        const cancels = await seedAuthUser(t);
        const sent: { at: number; subject: string; to: string }[] = [];
        const subscriber = (cancelled: boolean) => ({
            entitlements: {
                pro: { expires_date: new Date(chargeAt).toISOString(), product_identifier: "price_yearly" },
            },
            subscriptions: {
                price_yearly: {
                    period_type: "trial",
                    price: { amount: 49.99, currency: "USD" },
                    store: "stripe",
                    unsubscribe_detected_at: cancelled ? new Date(startedAt).toISOString() : null,
                },
            },
        });
        vi.stubGlobal(
            "fetch",
            vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
                const url = String(input instanceof Request ? input.url : input);
                if (url.includes("revenuecat.com")) {
                    return Response.json({ subscriber: subscriber(url.includes(cancels.userId)) });
                }
                if (url.includes("api.stripe.com")) {
                    return new Response("unavailable", { status: 503 });
                }
                const { subject, to }: { subject: string; to: string } = JSON.parse(String(init?.body));
                sent.push({ at: Date.now(), subject, to });
                return Response.json({ errors: [], success: true });
            })
        );
        const activation = {
            entitlementId: "pro",
            expiresAtMs: chargeAt,
            isSandbox: false,
            productId: "price_yearly",
            sourceEventType: "INITIAL_PURCHASE",
            store: "STRIPE" as const,
        };

        await t.mutation(internal.mail.claimPro, { ...activation, appUserId: keeps.userId });
        await t.mutation(internal.mail.claimPro, { ...activation, appUserId: cancels.userId });
        await t.finishAllScheduledFunctions(vi.runAllTimers);

        const reminders = sent.filter(({ subject }) => subject.includes("trial"));
        expect(reminders).toStrictEqual([
            {
                at: chargeAt - 2 * 86_400_000,
                subject: "Your Outlayr Pro trial ends on 8 February 2027",
                to: keeps.email,
            },
        ]);
    });
});

describe("a policy notice", () => {
    it("sends one email per account for every document changing that day, skipping ones it already got, and retries failures", async () => {
        const t = convexTest(schema, modules);
        const ana = await seedAuthUser(t);
        const ben = await seedAuthUser(t);
        const cleo = await seedAuthUser(t);
        await t.run((ctx) =>
            ctx.runMutation(components.betterAuth.adapter.create, {
                input: {
                    data: {
                        createdAt: 0,
                        email: "unverified@example.com",
                        emailVerified: false,
                        name: "",
                        updatedAt: 0,
                    },
                    model: "user",
                },
            })
        );
        await t.mutation(internal.mail.rememberLanguage, { language: "es", userId: ana.userId });
        await t.mutation(internal.mail.recordNotice, {
            keys: [`privacy:${DAY}`],
            language: "en",
            userId: cleo.userId,
        });
        let benReachable = false;
        const sent = stubCloudflare((to) => to === ben.email && !benReachable);
        const notify = () => t.action(internal.mailDelivery.notifyPolicy, {});

        await expect(notify()).resolves.toStrictEqual({ failed: 1, sent: 2 });
        benReachable = true;
        await expect(notify()).resolves.toStrictEqual({ failed: 0, sent: 1 });
        await expect(notify()).resolves.toStrictEqual({ failed: 0, sent: 0 });

        expect(sent).toStrictEqual([
            { subject: "Cambios en nuestra Política de privacidad y nuestros Términos de uso", to: ana.email },
            { subject: "Updates to our Terms of Use", to: cleo.email },
            { subject: "Updates to our Privacy Policy and Terms of Use", to: ben.email },
        ]);
    });
});
