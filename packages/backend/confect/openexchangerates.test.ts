/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { internal } from "../convex/_generated/api";
import schema from "../convex/schema";

const modules = import.meta.glob("../convex/**/*.ts");

const PUBLISHED_AT = Date.parse("2026-09-28T22:00:00Z") / 1000;

function stubFetch(payload: unknown, ok = true) {
    const fetchMock = vi.fn((_input: URL, _init?: RequestInit) =>
        Promise.resolve(Response.json(payload, { status: ok ? 200 : 401 }))
    );
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
}

afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
});

describe("openexchangerates.fetchRates", () => {
    it("stores each quote as an official row on the day it was published", async () => {
        vi.stubEnv("OXR_APP_ID", "app-id");
        const t = convexTest(schema, modules);
        const fetchMock = stubFetch({
            base: "USD",
            rates: { BTC: 0.00001, EUR: 0.87958, USD: 1, VES: 854.188, XAU: "n/a", bad: 2 },
            timestamp: PUBLISHED_AT,
        });

        await t.action(internal.openexchangerates.fetchRates, {});

        expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
            "https://openexchangerates.org/api/latest.json?app_id=app-id"
        );
        const rows = await t.run((ctx) => ctx.db.query("exchangeRates").collect());
        expect(rows.map((row) => row.quote)).toStrictEqual(["BTC", "EUR", "VES"]);
        expect(rows.find((row) => row.quote === "EUR")).toMatchObject({
            date: "2026-09-28",
            rate: 0.87958,
            rateType: "official",
            source: "openexchangerates",
        });
    });

    it("writes nothing when the request fails", async () => {
        vi.stubEnv("OXR_APP_ID", "app-id");
        vi.spyOn(console, "error").mockReturnValue(undefined);
        const t = convexTest(schema, modules);
        stubFetch({ error: true, message: "invalid_app_id", status: 401 }, false);

        await t.action(internal.openexchangerates.fetchRates, {});

        await expect(t.run((ctx) => ctx.db.query("exchangeRates").collect())).resolves.toHaveLength(0);
    });

    it("writes nothing for a payload quoted against another base", async () => {
        vi.stubEnv("OXR_APP_ID", "app-id");
        vi.spyOn(console, "error").mockReturnValue(undefined);
        const t = convexTest(schema, modules);
        stubFetch({ base: "EUR", rates: { USD: 1.137 }, timestamp: PUBLISHED_AT });

        await t.action(internal.openexchangerates.fetchRates, {});

        await expect(t.run((ctx) => ctx.db.query("exchangeRates").collect())).resolves.toHaveLength(0);
    });
});
