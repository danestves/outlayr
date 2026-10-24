import type { getIntlayer } from "intlayer";

import { hasKey } from "./has-key";

type Answers = ReturnType<typeof getIntlayer<"answers">>;
type ToolPages = ReturnType<typeof getIntlayer<"tools">>["pages"];

export type PageRef =
    | `/compare/${Extract<keyof Answers["compare"], string>}`
    | `/guides/${Extract<keyof Answers["guides"], string>}`
    | `/tools/${Extract<keyof ToolPages, string>}`;

export const SITE_URL = "https://tryoutlayr.com";
export const LEDGER_MCP_ORIGIN = "https://edge.tryoutlayr.com";
export const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.tryoutlayr.app";
export const SUPPORT_EMAIL = "support@tryoutlayr.com";
export const COMPANY = "danestves LLC";
export const SOURCE_URL = "https://github.com/danestves/outlayr";
export const WIKIDATA_URL = "https://www.wikidata.org/wiki/Q141838558";
export const X_URL = "https://x.com/tryoutlayr";
export const FOUNDER = {
    github: "https://github.com/danestves",
    image: "/about/daniel-esteves.webp",
    website: "https://danestves.com",
    x: "https://x.com/danestves",
} as const;

export const RIVALS_CHECKED = new Date(Date.UTC(2026, 9, 7));

const RIVALS_RECHECKED = {
    copilot: new Date(Date.UTC(2026, 9, 23)),
    everydollar: new Date(Date.UTC(2026, 9, 23)),
    fintonic: new Date(Date.UTC(2026, 9, 9)),
    goodbudget: new Date(Date.UTC(2026, 9, 23)),
    monefy: new Date(Date.UTC(2026, 9, 23)),
    spendee: new Date(Date.UTC(2026, 9, 23)),
    ynab: new Date(Date.UTC(2026, 9, 23)),
};

export function rivalChecked(slug: string): Date {
    return hasKey(RIVALS_RECHECKED, slug) ? RIVALS_RECHECKED[slug] : RIVALS_CHECKED;
}

export const EXPORTS_CHECKED = new Date(Date.UTC(2026, 9, 23));

export function compareUpdated(slug: string): Date {
    const checked = rivalChecked(slug);
    return checked > EXPORTS_CHECKED ? checked : EXPORTS_CHECKED;
}

export const LISTS_CHECKED = new Date(Date.UTC(2026, 9, 9));

const LISTS_RECHECKED = {
    "best-budget-apps": new Date(Date.UTC(2026, 9, 23)),
    "best-open-source-expense-tracker-apps": new Date(Date.UTC(2026, 9, 20)),
    "mint-alternative": new Date(Date.UTC(2026, 9, 23)),
    "ynab-alternatives": new Date(Date.UTC(2026, 9, 23)),
};

export function listChecked(slug: string): Date {
    return hasKey(LISTS_RECHECKED, slug) ? LISTS_RECHECKED[slug] : LISTS_CHECKED;
}

export const GUIDES_UPDATED = new Date(Date.UTC(2026, 9, 23));

export function guideUpdated(slug: string): Date {
    const checked = listChecked(slug);
    return checked > GUIDES_UPDATED ? checked : GUIDES_UPDATED;
}

export const LEGAL_DAYS = {
    "delete-account": new Date(Date.UTC(2026, 9, 15)),
    privacy: new Date(Date.UTC(2026, 9, 17)),
    terms: new Date(Date.UTC(2026, 9, 17)),
} as const;

export function legalDate(document: keyof typeof LEGAL_DAYS, dateLocale: string): string {
    return longDate(LEGAL_DAYS[document], dateLocale);
}

export function longDate(day: Date, dateLocale: string): string {
    return day.toLocaleDateString(dateLocale, {
        day: "numeric",
        month: "long",
        timeZone: "UTC",
        year: "numeric",
    });
}
