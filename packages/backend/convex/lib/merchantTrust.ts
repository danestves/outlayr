// oxlint-disable unicorn/filename-case -- Convex keys the module by its path (`_generated/api.d.ts` carries "lib/merchantTrust"), and regenerating that is not a lint fix

import { DOMAIN_PATTERN, MAX_DOMAIN_LENGTH, MAX_TAG_LENGTH, MAX_TAGS, PICTOGRAPHIC } from "./sanitizeLimits";

export const KEY_PATTERN = /^[a-z0-9 ]{3,64}(\|[a-z]{3})?$/;

const DAY_MS = 24 * 60 * 60 * 1000;
export const MODEL_TTL_MS = 30 * DAY_MS;
export const WEB_TTL_MS = 90 * DAY_MS;

// Duplicated from apps/native/src/data/categories-core.ts because the backend must not depend on apps/native.
export const CANONICAL_CATEGORY_NAMES: ReadonlySet<string> = new Set([
    "Groceries",
    "Dining Out",
    "Coffee",
    "Transport",
    "Fuel",
    "Rent",
    "Home",
    "Utilities",
    "Phone & Internet",
    "Subscriptions",
    "Healthcare",
    "Fitness",
    "Shopping",
    "Fashion",
    "Entertainment",
    "Travel",
    "Education",
    "Gifts",
    "Pets",
    "Family",
    "Personal Care",
    "Insurance",
    "Taxes",
    "Paycheck",
    "Freelance",
    "Part-Time",
    "Business",
    "Investments",
    "Interest",
    "Bonus",
    "Tips",
    "Refund",
]);

export interface KnowledgeCandidate {
    categoryName: string | null;
    domain: string | null;
    emoji: string | null;
    key: string;
    parentCategoryName: string | null;
    tags: readonly string[];
}

// Exact host or a subdomain, not a public-suffix parse: this may only ever reject, never widen.
export function corroborates(domain: string, sourceUrl: string): boolean {
    let host: string;
    try {
        host = new URL(sourceUrl).hostname.toLowerCase();
    } catch {
        return false;
    }
    const normalizedDomain = domain.toLowerCase();
    return host === normalizedDomain || host.endsWith(`.${normalizedDomain}`);
}

function isSanitizedDomain(domain: string): boolean {
    return domain.length <= MAX_DOMAIN_LENGTH && DOMAIN_PATTERN.test(domain);
}

function tagsAreSanitized(tags: readonly string[]): boolean {
    if (tags.length > MAX_TAGS) {
        return false;
    }
    return tags.every((tag) => tag.length > 0 && tag === tag.trim() && tag.length <= MAX_TAG_LENGTH);
}

function emojiIsSanitized(emoji: string | null): boolean {
    if (emoji === null) {
        return true;
    }
    const trimmed = emoji.trim();
    if (trimmed !== emoji || trimmed.length === 0 || [...trimmed].length > 3) {
        return false;
    }
    return PICTOGRAPHIC.test(trimmed);
}

// The privacy filter: every rule must hold or nothing is written globally. A corroborating source url is what keeps
// a personal string like "Rent for Maria's apartment" out, since no public source exists for it.
export function shouldPublish(candidate: KnowledgeCandidate, sources: readonly { url: string }[]): boolean {
    const { domain } = candidate;
    if (domain === null || !isSanitizedDomain(domain)) {
        return false;
    }
    if (!sources.some((source) => corroborates(domain, source.url))) {
        return false;
    }
    if (candidate.categoryName === null || !CANONICAL_CATEGORY_NAMES.has(candidate.categoryName)) {
        return false;
    }
    if (!KEY_PATTERN.test(candidate.key)) {
        return false;
    }
    if (!tagsAreSanitized(candidate.tags)) {
        return false;
    }
    if (!emojiIsSanitized(candidate.emoji)) {
        return false;
    }
    return true;
}
