import type { SharedReport } from "./sharedReports.spec";

const DAY_MS = 86_400_000;
const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const SLUG_LENGTH = 12;
/** Bytes at or above this would favour the first letters of the alphabet. */
const UNBIASED_BYTE_LIMIT = 248;
const MAX_NAME = 120;
const MAX_ROWS = 20;
const MAX_COLUMNS = 600;
const MAX_ID = 64;

export const MAX_LINKS = 50;
export const SLUG = /^[0-9A-Za-z]{12}$/;

export const LIFETIMES = { month: 30 * DAY_MS, week: 7 * DAY_MS } as const;

export function slugFromBytes(bytes: Uint8Array): string | null {
    let slug = "";
    for (const byte of bytes) {
        if (byte < UNBIASED_BYTE_LIMIT) {
            slug += ALPHABET[byte % ALPHABET.length];
        }
        if (slug.length === SLUG_LENGTH) {
            return slug;
        }
    }
    return null;
}

export function newSlug(): string {
    for (;;) {
        const slug = slugFromBytes(crypto.getRandomValues(new Uint8Array(SLUG_LENGTH * 2)));
        if (slug !== null) {
            return slug;
        }
    }
}

const named = (name: string) => name.length > 0 && name.length <= MAX_NAME;

/** A report small enough to be one page, with every row as wide as its columns. */
export function fits(reportId: string, report: SharedReport) {
    const width = report.columns.length;
    const figures = [report.totals, ...report.rows];
    return (
        reportId.length > 0 &&
        reportId.length <= MAX_ID &&
        named(report.name) &&
        report.currency.length <= MAX_ID &&
        width <= MAX_COLUMNS &&
        report.rows.length <= MAX_ROWS &&
        report.rows.every((row) => named(row.name)) &&
        (report.rise === null || named(report.rise.name)) &&
        figures.every((row) => row.values.length === width && [...row.values, row.total].every(Number.isFinite))
    );
}
