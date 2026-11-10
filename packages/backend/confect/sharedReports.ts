import type { SharedReport } from "./sharedReports.spec";

const DAY_MS = 86_400_000;
// Lower case only: the site redirects every public path to its lower-case form.
const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";
const SLUG_LENGTH = 12;
/** Bytes at or above this would favour the first letters of the alphabet. */
const UNBIASED_BYTE_LIMIT = 252;
const MAX_NAME = 120;
const MAX_ROWS = 400;
// Keeps the copy well under the 1 MiB a document may weigh.
const MAX_CELLS = 30_000;
// A colour reaches the public page's CSS, where anything but a plain hex one could call out to another site.
const COLOR = /^#[0-9a-f]{3,8}$/i;
const MAX_COLUMNS = 600;
const MAX_ID = 64;

export const MAX_LINKS = 50;
/** Copies read in one transaction: this many of the largest stay under the 16 MiB a mutation may read. */
export const COPY_BATCH = 16;
export const SLUG = /^[0-9a-z]{12}$/;

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

export const plainColor = (color: string | null) => (color !== null && COLOR.test(color) ? color : null);

const labelled = ({ color, name }: { color: string | null; name: string }) =>
    named(name) && plainColor(color) === color;

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
        figures.length * width <= MAX_CELLS &&
        report.columns.every(({ from, key, to }) => [from, key, to].every((text) => text.length <= MAX_ID)) &&
        report.rows.every(labelled) &&
        (report.rise === null || (labelled(report.rise) && Number.isFinite(report.rise.delta))) &&
        figures.every(
            (row) =>
                row.values.length === width &&
                [...row.values, row.total, row.average, row.change ?? 0].every(Number.isFinite)
        )
    );
}
