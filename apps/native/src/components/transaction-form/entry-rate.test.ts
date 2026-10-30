import { describe, expect, it } from "vite-plus/test";

import { entryRateOf, NO_RATE, rateAfter, seededRate } from "./entry-rate";
import type { RateSnapshot } from "./entry-rate";

const SUGGESTED = 36.123456789;

const suggested: RateSnapshot = { entry: seededRate("VES", SUGGESTED), fromSuggestion: true, type: "official" };
const typed: RateSnapshot = { entry: { seed: null, text: "40" }, fromSuggestion: false, type: "custom" };

describe("rateAfter", () => {
    it("drops a provider rate when the date moves, but keeps one the user typed", () => {
        expect(rateAfter(suggested, "VES", { kind: "date", moved: true })).toStrictEqual({
            entry: NO_RATE,
            fromSuggestion: false,
        });
        expect(rateAfter(typed, "VES", { kind: "date", moved: true })).toStrictEqual({ fromSuggestion: false });
        expect(rateAfter(suggested, "VES", { kind: "date", moved: false })).toStrictEqual({ fromSuggestion: true });
    });

    it("clears the rate on a currency change and keeps it on the same currency", () => {
        expect(rateAfter(typed, "VES", { kind: "currency", next: "COP" })).toStrictEqual({
            entry: NO_RATE,
            fromSuggestion: false,
        });
        expect(rateAfter(suggested, "VES", { kind: "currency", next: "VES" })).toStrictEqual({ fromSuggestion: true });
        expect(rateAfter(typed, "VES", { kind: "currency", next: "USD" })).toStrictEqual({
            entry: NO_RATE,
            fromSuggestion: false,
            type: null,
        });
    });

    it("falls back to official when the type cannot follow the new currency", () => {
        const euro: RateSnapshot = { ...suggested, type: "eur_reference" };
        expect(rateAfter(euro, "VES", { kind: "currency", next: "COP" }).type).toBe("official");
        const fromUsd: RateSnapshot = { entry: NO_RATE, fromSuggestion: false, type: null };
        expect(rateAfter(fromUsd, "USD", { kind: "currency", next: "VES" }).type).toBe("official");
    });

    it("turns a suggested rate into a custom one once the user types over it", () => {
        expect(rateAfter(suggested, "VES", { kind: "text", text: "37" })).toStrictEqual({
            entry: { seed: null, text: "37" },
            fromSuggestion: false,
            type: "custom",
        });
    });
});

describe("entryRateOf", () => {
    it("keeps a seeded rate's precision until its text changes", () => {
        const seeded = seededRate("VES", SUGGESTED);
        expect(entryRateOf(seeded, "VES")).toBe(SUGGESTED);
        expect(entryRateOf({ ...seeded, text: "40" }, "VES")).toBe(entryRateOf({ seed: null, text: "40" }, "VES"));
        expect(entryRateOf(NO_RATE, "VES")).toBeNull();
    });
});
