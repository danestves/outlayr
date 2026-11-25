import { getTranslation } from "intlayer";
import { expect, it } from "vite-plus/test";

import tools from "@/content/tools.content";

import { formatRatePrice, formatRateWhen, headlineValues, rateLocales } from "./rates";
import type { Rate, RateSlug } from "./rates";

const HEADLINE: Record<RateSlug, number> = {
    "dolar-bcv-hoy": 99_999.99,
    "dolar-hoy-argentina": 99_999.99,
    "dolar-hoy-bolivia": 99_999.99,
};

const INSERTION = /\{\{\s*(\w+)\s*\}\}/g;

function fill(template: string, values: Record<string, string>): string {
    return template.replaceAll(INSERTION, (match, name: string) => values[name] ?? match);
}

it("keeps every live rate title within the 60 character limit", () => {
    for (const slug of Object.keys(HEADLINE) as RateSlug[]) {
        const page = tools.content.pages[slug];
        for (const locale of ["en", "es"] as const) {
            const template = getTranslation(page.live.title.insertion.translation, locale);
            const { lang } = rateLocales(locale, slug);
            const title = fill(template, { rate: formatRatePrice(slug, HEADLINE[slug], lang) });
            expect(title.length).toBeLessThanOrEqual(60);
        }
    }
});

it("formats the headline price with the market symbol and two fraction digits", () => {
    expect(formatRatePrice("dolar-hoy-bolivia", 12.04, "es-BO")).toBe("Bs 12,04");
    expect(formatRatePrice("dolar-hoy-bolivia", 12.04, "en-US")).toBe("Bs 12.04");
});

const quote = (kind: Rate["kind"], rate: number): Rate => ({
    base: "USD",
    buy: null,
    dateOnly: false,
    kind,
    rate,
    source: "https://dolarhoy.com/",
    updatedAt: "2026-11-03T16:00:00.000Z",
});

it("headlines the market's main rate, never another rate in its place", () => {
    const rates = [quote("oficial", 1570), quote("blue", 1700)];
    expect(headlineValues("dolar-hoy-argentina", "es", rates)?.rate).toBe("$ 1.700,00");
    expect(headlineValues("dolar-hoy-argentina", "es", [quote("oficial", 1570)])).toBeNull();
});

it("reads the BCV day from RFC 1123 timestamps too", () => {
    const bcv = { ...quote("bcv", 922.56), dateOnly: true, updatedAt: "Tue, 24 Nov 2026 00:00:00 GMT" };
    expect(formatRateWhen("dolar-bcv-hoy", bcv, "en-US")).toBe("Nov 24, 2026");
});
