/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import type { FunctionArgs } from "convex/server";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { components, internal } from "../convex/_generated/api";
import schema from "../convex/schema";
import { seedAuthUser } from "./test.helpers";

const modules = import.meta.glob("../convex/**/*.ts");

afterEach(() => {
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
});

describe("a policy notice", () => {
    it("reaches each verified account once, in its language, and retries only the sends that failed", async () => {
        const t = convexTest(schema, modules);
        const ana = await seedAuthUser(t);
        const ben = await seedAuthUser(t);
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
        let benReachable = false;
        const sent = stubCloudflare((to) => to === ben.email && !benReachable);
        const notify = () => t.action(internal.mailDelivery.notifyPolicy, { document: "privacy" });

        await expect(notify()).resolves.toStrictEqual({ failed: 1, sent: 1 });
        benReachable = true;
        await expect(notify()).resolves.toStrictEqual({ failed: 0, sent: 1 });
        await expect(notify()).resolves.toStrictEqual({ failed: 0, sent: 0 });

        expect(sent).toStrictEqual([
            { subject: "Cambios en nuestra Política de privacidad", to: ana.email },
            { subject: "Updates to our Privacy Policy", to: ben.email },
        ]);
    });
});
