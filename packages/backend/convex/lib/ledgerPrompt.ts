export interface CategoryBranch {
    children: string[];
    name: string;
}

export interface LedgerContext {
    accounts: readonly string[];
    categoryTree: readonly CategoryBranch[];
    currency: string;
    language?: string;
    regionCode?: string;
    today: string;
}

export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
/** BCP-47 with extensions ("sr-Latn-RS-u-ca-gregory"), bounded because it lands in the prompt. */
export const LANGUAGE_PATTERN = /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{1,8}){0,12}$/;
const DOMAIN_PATTERN = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;
export const CURRENCY_PATTERN = /^[A-Z]{3}$/;
export const REGION_PATTERN = /^[A-Z]{2}$/;

const MAX_CATEGORY_NAMES = 200;
const MAX_ACCOUNT_NAMES = 50;
const MAX_CHILDREN_PER_BRANCH = 50;
export const MAX_NAME_LENGTH = 80;
const MAX_TOTAL_NAMES = 400;
const DAY_MS = 86_400_000;

const short = (name: string) => name.length <= MAX_NAME_LENGTH;

export function namesWithinBudget(tree: readonly CategoryBranch[], accounts: readonly string[]): boolean {
    if (tree.length > MAX_CATEGORY_NAMES || accounts.length > MAX_ACCOUNT_NAMES) {
        return false;
    }
    let total = accounts.length;
    for (const branch of tree) {
        if (!short(branch.name) || branch.children.length > MAX_CHILDREN_PER_BRANCH || !branch.children.every(short)) {
            return false;
        }
        total += 1 + branch.children.length;
    }
    return total <= MAX_TOTAL_NAMES && accounts.every(short);
}

export function describeTree(tree: readonly CategoryBranch[]): string {
    if (tree.length === 0) {
        return "none";
    }
    return tree
        .map((branch) =>
            branch.children.length > 0 ? `${branch.name} (containing ${branch.children.join(", ")})` : branch.name
        )
        .join("; ");
}

// `Date.parse` rolls "2026-02-31" forward to March 3, so the round trip catches a day the calendar lacks.
export function clampDate(candidate: string | null, today: string, maxPastDays: number, maxFutureDays: number): string {
    if (candidate == null || !DATE_PATTERN.test(candidate)) {
        return today;
    }
    const parsed = Date.parse(`${candidate}T00:00:00Z`);
    const base = Date.parse(`${today}T00:00:00Z`);
    if (Number.isNaN(parsed) || Number.isNaN(base)) {
        return today;
    }
    if (new Date(parsed).toISOString().slice(0, 10) !== candidate) {
        return today;
    }
    const days = (parsed - base) / DAY_MS;
    return days < -maxPastDays || days > maxFutureDays ? today : candidate;
}

export function trimTo(value: string | null | undefined, max: number): string | null {
    const trimmed = value?.trim() ?? "";
    return trimmed.length === 0 ? null : trimmed.slice(0, max);
}

export function pickKnown(candidate: string | null, known: readonly string[]): string | null {
    const trimmed = candidate?.trim();
    if (!trimmed) {
        return null;
    }
    const exact = known.find((name) => name === trimmed);
    if (exact) {
        return exact;
    }
    const folded = trimmed.toLowerCase();
    return known.find((name) => name.toLowerCase() === folded) ?? null;
}

export function normalizeDomain(candidate: string | null): string | null {
    if (candidate === null) {
        return null;
    }
    const [host] = candidate
        .trim()
        .toLowerCase()
        .replace(/^[a-z]+:\/\//, "")
        .replace(/^www\./, "")
        .split(/[/?#]/);
    return host !== undefined && DOMAIN_PATTERN.test(host) ? host : null;
}
