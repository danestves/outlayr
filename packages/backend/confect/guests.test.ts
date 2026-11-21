/// <reference types="vite/client" />

import rateLimiterTest from "@convex-dev/rate-limiter/test";
import revenuecatTest from "convex-revenuecat/test";
import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { internal } from "../convex/_generated/api";
import schema from "../convex/schema";
import { runEdge } from "./lib/runEdge";
import { isPro } from "./revenuecat";
import { grantPro, seedAuthUser } from "./test.helpers";

const modules = import.meta.glob("../convex/**/*.ts");

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
});

async function guestWithPro() {
    const t = convexTest(schema, modules);
    rateLimiterTest.register(t);
    revenuecatTest.register(t);
    const guest = await seedAuthUser(t);
    await grantPro(t, guest);
    return { guest, t };
}

describe("retiring a guest", () => {
    it("erases the guest's RevenueCat customer so the receipt can follow the account", async () => {
        const fetchMock = vi.fn(async (_input: URL, _init?: RequestInit) => Response.json({}, { status: 200 }));
        vi.stubGlobal("fetch", fetchMock);
        const { guest, t } = await guestWithPro();

        await t.action(internal.guests.retire, { guestId: guest.userId });

        expect(fetchMock.mock.calls.map(([input, init]) => [init?.method, String(input)])).toContainEqual([
            "DELETE",
            `https://api.revenuecat.com/v1/subscribers/${guest.userId}`,
        ]);
        await expect(t.run((ctx) => runEdge(isPro(ctx, guest.userId)))).resolves.toBeFalsy();
    });

    it("stops retrying once RevenueCat reports the customer gone, then sweeps a late transfer's mirror", async () => {
        vi.useFakeTimers();
        vi.stubGlobal(
            "fetch",
            vi.fn(async (input: URL) =>
                String(input).includes("revenuecat")
                    ? Response.json({}, { status: 404 })
                    : Response.json({ deletion_errors: [] }, { status: 200 })
            )
        );
        const { guest, t } = await guestWithPro();

        await t.action(internal.guests.retire, { guestId: guest.userId });

        const scheduled = await t.run((ctx) => ctx.db.system.query("_scheduled_functions").collect());
        expect(scheduled.filter(({ name }) => name.includes("retire"))).toHaveLength(0);

        await grantPro(t, guest);
        await t.finishAllScheduledFunctions(vi.runAllTimers);
        await expect(t.run((ctx) => runEdge(isPro(ctx, guest.userId)))).resolves.toBeFalsy();
    });

    it("drops the guest's mirror at once and retries a refused erase later", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => Response.json({}, { status: 500 }))
        );
        const { guest, t } = await guestWithPro();

        await t.action(internal.guests.retire, { guestId: guest.userId });

        await expect(t.run((ctx) => runEdge(isPro(ctx, guest.userId)))).resolves.toBeFalsy();
        const scheduled = await t.run((ctx) => ctx.db.system.query("_scheduled_functions").collect());
        expect(scheduled.filter(({ name }) => name.includes("retire")).map(({ args }) => args[0])).toStrictEqual([
            { attempt: 1, guestId: guest.userId },
        ]);
    });

    it("alerts without the guest id once backoff runs out, and keeps retrying daily", async () => {
        vi.stubEnv("POSTHOG_PROJECT_TOKEN", "phc_test");
        const fetchMock = vi.fn(async (input: URL, _init?: RequestInit) =>
            String(input).includes("/i/v0/e/") ? Response.json({}, { status: 200 }) : Response.json({}, { status: 500 })
        );
        vi.stubGlobal("fetch", fetchMock);
        const { guest, t } = await guestWithPro();

        await t.action(internal.guests.retire, { attempt: 19, guestId: guest.userId });

        const captured = fetchMock.mock.calls
            .filter(([input]) => String(input).includes("/i/v0/e/"))
            .map(([, init]) => JSON.parse(String(init?.body)));
        expect(captured.map(({ event, properties }) => ({ event, properties }))).toStrictEqual([
            {
                event: "guest_retirement_stuck",
                properties: { $process_person_profile: false, analytics: false, customer: false },
            },
        ]);
        const scheduled = await t.run((ctx) => ctx.db.system.query("_scheduled_functions").collect());
        expect(scheduled.filter(({ name }) => name.includes("retire")).map(({ args }) => args[0])).toStrictEqual([
            { attempt: 20, guestId: guest.userId },
        ]);
    });
});
