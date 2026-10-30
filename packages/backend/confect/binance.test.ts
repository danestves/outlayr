/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { internal } from "../convex/_generated/api";
import schema from "../convex/schema";

const modules = import.meta.glob("../convex/**/*.ts");

const sellAd = (price: number, userType: "merchant" | "user") => ({
    advertiser: { monthOrderCount: 120, nickName: "seller", userType },
    asset: "USDT",
    fiat: "VES",
    price,
});

function stubAdList(items: unknown[]) {
    const fetchMock = vi.fn((_input: URL, _init?: RequestInit) =>
        Promise.resolve(Response.json({ code: "000000", data: { items }, success: true }))
    );
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
}

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe("binance.fetchRates", () => {
    it("replaces the day's Binance row with the highest merchant bid", async () => {
        vi.useFakeTimers({ toFake: ["Date"] });
        vi.setSystemTime(new Date("2026-10-30T12:00:00Z"));
        const t = convexTest(schema, modules);
        await t.run((ctx) =>
            ctx.db.insert("exchangeRates", {
                date: "2026-10-30",
                fetchedAt: 1,
                quote: "VES",
                rate: 990,
                rateType: "binance",
                source: "cotizave",
            })
        );
        const fetchMock = stubAdList([
            sellAd(1000, "user"),
            sellAd(997.1, "merchant"),
            sellAd(998, "merchant"),
            { ...sellAd(1005, "merchant"), fiat: "COP" },
        ]);

        await t.action(internal.binance.fetchRates, {});

        expect(new URL(String(fetchMock.mock.calls[0]?.[0])).searchParams.get("tradeType")).toBe("SELL");
        const rows = await t.run((ctx) => ctx.db.query("exchangeRates").collect());
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({
            date: "2026-10-30",
            quote: "VES",
            rate: 998,
            rateType: "binance",
            source: "binance",
        });
    });

    it("keeps the prior row when no merchant ad is listed", async () => {
        vi.useFakeTimers({ toFake: ["Date"] });
        vi.setSystemTime(new Date("2026-10-30T12:00:00Z"));
        const t = convexTest(schema, modules);
        await t.run((ctx) =>
            ctx.db.insert("exchangeRates", {
                date: "2026-10-30",
                fetchedAt: 1,
                quote: "VES",
                rate: 996,
                rateType: "binance",
                source: "binance",
            })
        );
        const errorSpy = vi.spyOn(console, "error").mockReturnValue(undefined);
        stubAdList([sellAd(1000, "user"), sellAd(980.54, "user")]);

        await t.action(internal.binance.fetchRates, {});

        const rows = await t.run((ctx) => ctx.db.query("exchangeRates").collect());
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({ fetchedAt: 1, rate: 996 });
        expect(errorSpy).toHaveBeenCalledWith("Binance P2P response contained no merchant ads");
    });
});
