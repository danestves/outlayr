import { hasKey } from "./has-key";

export const SITE_URL = "https://tryoutlayr.com";
export const LEDGER_MCP_ORIGIN = "https://edge.tryoutlayr.com";
export const APP_STORE_URL = "https://apps.apple.com/app/id6801652978";
export const SUPPORT_EMAIL = "support@tryoutlayr.com";
export const COMPANY = "danestves LLC";
export const SOURCE_URL = "https://github.com/danestves/outlayr";

export const RIVALS_CHECKED = new Date(Date.UTC(2026, 9, 7));

const RIVALS_RECHECKED = {
    fintonic: new Date(Date.UTC(2026, 9, 9)),
};

export function rivalChecked(slug: string): Date {
    return hasKey(RIVALS_RECHECKED, slug) ? RIVALS_RECHECKED[slug] : RIVALS_CHECKED;
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
