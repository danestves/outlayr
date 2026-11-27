/// <reference types="vite/client" />

import workpoolTest from "@convex-dev/workpool/test";
import { convexTest } from "convex-test";
import type { FunctionArgs } from "convex/server";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { components, internal } from "../convex/_generated/api";
import schema from "../convex/schema";
import type { PolicyNotice } from "./legal";
import { authComponent } from "./lib/betterAuth";
import { seedAuthUser } from "./test.helpers";

const modules = import.meta.glob("../convex/**/*.ts");

const DAY = vi.hoisted(() => Date.UTC(2026, 10, 4));

vi.mock(import("./legal"), async (original) => {
    const legal = await original();
    const changes = { de: [], en: [], es: [], fr: [], pt: [] };
    return {
        ...legal,
        POLICY_NOTICES: [
            { changes, document: "terms", effectiveAtMs: Date.UTC(2026, 10, 3), postedAtMs: Date.UTC(2026, 10, 3) },
            { changes, document: "privacy", effectiveAtMs: DAY, postedAtMs: DAY },
            { changes, document: "terms", effectiveAtMs: DAY, postedAtMs: DAY },
        ] satisfies PolicyNotice[],
    };
});

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.useRealTimers();
});

function mailTest() {
    const t = convexTest(schema, modules);
    workpoolTest.register(t, "emailPool");
    workpoolTest.register(t, "noticePool");
    return t;
}

function stubCloudflare(refuse: (to: string) => boolean = () => false, bounce: (to: string) => boolean = () => false) {
    const sent: { subject: string; to: string }[] = [];
    vi.stubGlobal(
        "fetch",
        vi.fn(async (_url: string, init?: RequestInit) => {
            const {
                subject,
                to: [to = ""],
            }: { subject: string; to: string[] } = JSON.parse(String(init?.body));
            if (refuse(to)) {
                return new Response("busy", { status: 502 });
            }
            if (bounce(to)) {
                return Response.json({ result: { delivered: [], permanent_bounces: [to] }, success: true });
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
        const t = mailTest();
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
        const t = mailTest();
        vi.spyOn(authComponent, "getAnyUserById").mockRejectedValue(
            new Error("Unable to decode ID: Invalid ID length 39")
        );
        vi.spyOn(console, "warn").mockReturnValue(undefined);

        await expect(
            t.query(internal.mail.recipient, { userId: "not-a-convex-id-but-a-revenuecat-alias" })
        ).resolves.toBeNull();
    });
});

describe("a sign-in code", () => {
    it("leaves the outbox when it expires, even before its send starts", async () => {
        vi.useFakeTimers();
        const t = mailTest();
        stubCloudflare();

        await t.mutation(internal.emailOutbox.enqueue, {
            expiresAt: Date.now() + 1000,
            subject: "Your code",
            text: "123456",
            to: "code@example.com",
        });
        await vi.advanceTimersByTimeAsync(1001);

        await expect(t.run((ctx) => ctx.db.query("outboundEmails").collect())).resolves.toStrictEqual([]);
    });
});

describe("a retried email", () => {
    it("carries the same idempotency key on every try", async () => {
        vi.useFakeTimers();
        vi.stubEnv("EMAIL_PROVIDER", "resend");
        vi.stubEnv("RESEND_API_KEY", "re_test");
        const t = mailTest();
        const keys: (string | null)[] = [];
        vi.stubGlobal(
            "fetch",
            vi.fn(async (_url: string, init?: RequestInit) => {
                keys.push(new Headers(init?.headers).get("Idempotency-Key"));
                return keys.length === 1 ? new Response("busy", { status: 502 }) : Response.json({ id: "sent" });
            })
        );

        await t.mutation(internal.emailOutbox.enqueue, { subject: "Welcome", text: "Hi", to: "new@example.com" });
        await t.finishAllScheduledFunctions(vi.runAllTimers);

        expect(keys).toHaveLength(2);
        expect(keys[0]).toBeTruthy();
        expect(keys[1]).toBe(keys[0]);
    });

    it("is never sent once its code expired, even before the expiry job deletes it", async () => {
        vi.stubEnv("EMAIL_PROVIDER", "resend");
        vi.stubEnv("RESEND_API_KEY", "re_test");
        const t = mailTest();
        const send = vi.fn(async () => Response.json({ id: "sent" }));
        vi.stubGlobal("fetch", send);
        const emailId = await t.run((ctx) =>
            ctx.db.insert("outboundEmails", {
                expiresAt: Date.now() - 1,
                subject: "Your code",
                text: "123456",
                to: "late@example.com",
            })
        );

        await t.action(internal.mailDelivery.deliver, { emailId });

        expect(send).not.toHaveBeenCalled();
    });
});

describe("a policy notice", () => {
    it("queues one email per account for every document changing that day, and again only for a bounced one", async () => {
        vi.useFakeTimers();
        const t = mailTest();
        const ana = await seedAuthUser(t);
        const ben = await seedAuthUser(t);
        const cleo = await seedAuthUser(t);
        const dana = await seedAuthUser(t);
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
        await t.run((ctx) =>
            ctx.db.insert("mailState", {
                language: "en",
                notices: [`privacy:${DAY}`],
                proSentAt: null,
                welcomedAt: null,
                userId: cleo.userId,
            })
        );
        let benRefused = false;
        const bounced: string[] = [];
        const sent = stubCloudflare(
            (to) => {
                const refuse = to === ben.email && !benRefused;
                benRefused ||= refuse;
                return refuse;
            },
            (to) => {
                const bounce = to === dana.email;
                if (bounce) {
                    bounced.push(to);
                }
                return bounce;
            }
        );
        const notify = () => t.action(internal.mailDelivery.notifyPolicy, {});

        await expect(notify()).resolves.toStrictEqual({ failed: 0, sent: 4 });
        await expect(notify()).rejects.toThrow("still sending");
        await expect(
            t.mutation(internal.emailOutbox.enqueue, {
                notice: { keys: [`privacy:${DAY}`, `terms:${DAY}`], language: "en", userId: ana.userId },
                subject: "stale run",
                text: "stale run",
                to: ana.email,
            })
        ).resolves.toBeFalsy();
        await t.finishAllScheduledFunctions(vi.runAllTimers);

        expect(sent).toHaveLength(3);
        expect(sent).toStrictEqual(
            expect.arrayContaining([
                { subject: "Cambios en nuestra Política de privacidad y nuestros Términos de uso", to: ana.email },
                { subject: "Updates to our Terms of Use", to: cleo.email },
                { subject: "Updates to our Privacy Policy and Terms of Use", to: ben.email },
            ])
        );
        expect(bounced).toStrictEqual([dana.email]);
        await expect(t.run((ctx) => ctx.db.query("outboundEmails").collect())).resolves.toStrictEqual([]);
        await expect(notify()).resolves.toStrictEqual({ failed: 0, sent: 1 });
    });
});
