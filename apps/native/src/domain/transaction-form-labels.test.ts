import { describe, expect, it } from "@jest/globals";

import { EN } from "@/i18n/catalog";
import type { TranslateFn } from "@/i18n/context";
import { translate } from "@/i18n/translate";

import {
    leadLabel,
    namedWithCount,
    quotedByBcv,
    rateDeltaLine,
    rateNameKey,
    rateSourceWordKey,
    transactionWhenLabel,
} from "./transaction-form-labels";

const en: TranslateFn = (key, params) => translate(key, { catalog: EN, fallback: EN, params });

describe("rate names", () => {
    it("names the official rate after the BCV wherever a bolívar is priced", () => {
        expect(en(rateNameKey("official", quotedByBcv("VES")))).toBe("USD (BCV)");
        expect(en(rateSourceWordKey("official", quotedByBcv("VES")))).toBe("USD (BCV)");
    });

    it("keeps the official rate's name for every other currency", () => {
        expect(en(rateNameKey("official", quotedByBcv("EUR")))).toBe("Official");
        expect(en(rateSourceWordKey("official", quotedByBcv("USD", "COP")))).toBe("official");
    });

    it("leaves the other sources' names alone", () => {
        expect(en(rateNameKey("eur_reference", true))).toBe("EUR (BCV)");
    });
});

describe("rateDeltaLine", () => {
    const line = (code: string, difference: number) =>
        rateDeltaLine(en, { bcv: false, code, difference, language: "en", percent: 0.01 });

    it("names a difference only when it survives the currency's own rounding", () => {
        expect(line("JPY", 0.3)).toBe("Same as official");
        expect(line("JPY", 0.6)).toBe("Same as official · ¥1 more than at official");
        expect(line("USD", 0.3)).toBe("Same as official · $0.30 more than at official");
    });
});

describe("namedWithCount", () => {
    it("states every name that fits, and counts the rest", () => {
        expect(namedWithCount(["Development", "Subscription"])).toBe("Development, Subscription");
        expect(namedWithCount(["Development", "Subscription", "Work", "Tools"])).toBe("Development, Subscription +2");
        expect(namedWithCount(["A name longer than the whole chip allows", "Work"])).toBe(
            "A name longer than the whole chip allows +1"
        );
    });
});

describe("leadLabel", () => {
    it("reads Off for a null lead", () => {
        expect(leadLabel(en, null)).toBe("Off");
    });

    it("reads the same-day phrasing for a zero lead", () => {
        expect(leadLabel(en, 0)).toBe("On the day");
    });

    it("reads the singular day-before phrasing for a one-day lead", () => {
        expect(leadLabel(en, 1)).toBe("1 day before");
    });

    it("reads the counted phrasing for a two-day lead", () => {
        expect(leadLabel(en, 2)).toBe("2 days before");
    });

    it("reads the week-before phrasing for a seven-day lead", () => {
        expect(leadLabel(en, 7)).toBe("1 week before");
    });

    it("falls back to the counted phrasing for a lead the picker never offers", () => {
        expect(leadLabel(en, 14)).toBe("14 days before");
    });
});

describe("transactionWhenLabel", () => {
    const now = new Date(2026, 7, 18, 14, 30);

    it("says today for any time on the current day", () => {
        expect(transactionWhenLabel(en, { date: new Date(2026, 7, 18, 1), interval: null, language: "en", now })).toBe(
            "today"
        );
    });

    it("says yesterday for the day before", () => {
        expect(transactionWhenLabel(en, { date: new Date(2026, 7, 17, 23), interval: null, language: "en", now })).toBe(
            "yesterday"
        );
    });

    it("says yesterday across a daylight-saving boundary", () => {
        const originalTimezone = process.env.TZ;
        process.env.TZ = "America/New_York";
        try {
            expect(
                transactionWhenLabel(en, {
                    date: new Date(2026, 2, 8, 23),
                    interval: null,
                    language: "en",
                    now: new Date(2026, 2, 9, 14),
                })
            ).toBe("yesterday");
        } finally {
            process.env.TZ = originalTimezone;
        }
    });

    it("names the date once it is older than yesterday", () => {
        expect(transactionWhenLabel(en, { date: new Date(2026, 7, 15), interval: null, language: "en", now })).toBe(
            "on 15 Aug"
        );
    });

    it("states the cadence instead of the day for a subscription", () => {
        expect(transactionWhenLabel(en, { date: new Date(2026, 7, 18), interval: "month", language: "en", now })).toBe(
            "every month from 18 Aug"
        );
    });
});
