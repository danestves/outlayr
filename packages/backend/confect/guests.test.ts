/// <reference types="vite/client" />

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
    vi.unstubAllGlobals();
});

async function guestWithPro() {
    const t = convexTest(schema, modules);
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

    it("still drops the guest's mirror when RevenueCat refuses the erase", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => Response.json({}, { status: 500 }))
        );
        const { guest, t } = await guestWithPro();

        await t.action(internal.guests.retire, { guestId: guest.userId });

        await expect(t.run((ctx) => runEdge(isPro(ctx, guest.userId)))).resolves.toBeFalsy();
    });
});
