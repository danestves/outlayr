import { getTranslation } from "intlayer";
import { expect, it } from "vite-plus/test";

import tools from "@/content/tools.content";

import { formatRatePrice, rateLocales } from "./rates";
import type { RateSlug } from "./rates";

const HEADLINE: Record<RateSlug, number> = {
    "dolar-bcv-hoy": 9999.99,
    "dolar-hoy-argentina": 9999.99,
    "dolar-hoy-bolivia": 99.99,
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
