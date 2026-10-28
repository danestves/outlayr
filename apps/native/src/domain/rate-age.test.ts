import { describe, expect, it } from "vite-plus/test";

import { EN } from "@/i18n/catalog";
import type { TranslateFn } from "@/i18n/context";
import { translate } from "@/i18n/translate";

import { rateAge } from "./rate-age";

const en: TranslateFn = (key, params) => translate(key, { catalog: EN, fallback: EN, params });
const ENTRY = new Date(2026, 8, 29, 12);
const BASE = { entryDate: ENTRY, fetchedAt: null, language: "en", now: ENTRY, use24Hour: true } as const;

describe("rateAge", () => {
    it("states how old a rate from before the entry's day is", () => {
        expect(rateAge(en, { ...BASE, rateDate: "2026-09-19" })).toStrictEqual({
            detail: "10 days old · 19 Sep",
            stale: true,
        });
    });

    it("states the time of a rate fetched today for the entry's own day", () => {
        const fetchedAt = new Date(2026, 8, 29, 9, 5).getTime();

        expect(rateAge(en, { ...BASE, fetchedAt, rateDate: "2026-09-29" })).toStrictEqual({
            detail: "As of 09:05",
            stale: false,
        });
    });

    it("falls back to the entry's day when the rate's day is unknown", () => {
        expect(rateAge(en, { ...BASE, rateDate: null })).toStrictEqual({ detail: "As of 29 Sep", stale: false });
    });
});
