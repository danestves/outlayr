import { buildRateTable } from "@outlayr/money/valuation";
import { describe, expect, it } from "vite-plus/test";

import { marketRateFor, rateTypeOptions, transferRateOptions } from "./transfer-rate-options";

const RATES = buildRateTable([
    { date: "2026-08-01", quote: "VES", rate: 40.12 },
    { date: "2026-08-01", quote: "BRL", rate: 5.423 },
]);
const DAY = new Date(Date.UTC(2026, 7, 9));

describe("rateTypeOptions", () => {
    it("offers the EUR reference only for bolívares", () => {
        expect(rateTypeOptions("VES")).toContain("eur_reference");
    });

    it("withholds the EUR reference from every other currency, because resolveEntryRate rejects them", () => {
        expect(rateTypeOptions("BRL")).not.toContain("eur_reference");
        expect(rateTypeOptions("EUR")).not.toContain("eur_reference");
    });
});

describe("transferRateOptions", () => {
    it("offers the Binance reference between dollars and bolívares, in either direction, before my rate", () => {
        expect(transferRateOptions("USD", "VES")).toStrictEqual(["official", "eur_reference", "binance", "custom"]);
        expect(transferRateOptions("VES", "USD")).toStrictEqual(["official", "binance", "custom"]);
    });

    it("offers no Binance reference on any other pair", () => {
        expect(transferRateOptions("USD", "MXN")).not.toContain("binance");
        expect(transferRateOptions("EUR", "VES")).not.toContain("binance");
        expect(transferRateOptions("VES", "VES")).not.toContain("binance");
    });
});

describe("marketRateFor", () => {
    it("converts one unit of the source currency into the destination", () => {
        expect(marketRateFor("USD", "VES", DAY, RATES)).toBeCloseTo(40.12, 6);
    });

    it("crosses two non-USD currencies through their USD legs", () => {
        const rate = marketRateFor("BRL", "VES", DAY, RATES);
        expect(rate).toBeCloseTo(40.12 / 5.423, 6);
    });

    it("returns null when a currency has no rate that day", () => {
        expect(marketRateFor("USD", "JPY", DAY, RATES)).toBeNull();
    });

    it("returns null rather than a zero or negative rate", () => {
        const broken = buildRateTable([{ date: "2026-08-01", quote: "ZWL", rate: 0 }]);
        expect(marketRateFor("USD", "ZWL", DAY, broken)).toBeNull();
    });
});
