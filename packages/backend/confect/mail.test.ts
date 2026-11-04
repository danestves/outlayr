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
