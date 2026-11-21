import { merchantKey } from "@outlayr/money/merchant-key";
import { containsTokenSequence } from "@outlayr/money/pattern-index";

import { MERCHANT_INDEX } from "./merchant-map";
import type { MerchantEntry, MerchantTag } from "./merchant-map";

export interface MerchantMatch {
    readonly categoryName: string;
    readonly domain: string | null;
    readonly tags: readonly MerchantTag[];
}

function resolveAlias(key: string): MerchantEntry | null {
    const tokens = key.split(" ");
    for (const [pattern, entry] of MERCHANT_INDEX) {
        if (containsTokenSequence(tokens, pattern.split(" "))) {
            return entry;
        }
    }
    return null;
}

const FUZZY_MIN_KEY_LENGTH = 5;
const FUZZY_MAX_DISTANCE = 1;
const FUZZY_EARLY_EXIT_DISTANCE = 2;

function boundedLevenshtein(a: string, b: string, earlyExitAt: number): number {
    if (Math.abs(a.length - b.length) > earlyExitAt) {
        return earlyExitAt + 1;
    }
    let previous = Array.from({ length: b.length + 1 }, (_, col) => col);
    let distance = b.length;
    for (let row = 1; row <= a.length; row += 1) {
        const current: number[] = [row];
        let rowMin = row;
        let left = row;
        const [first = earlyExitAt + 1] = previous;
        let diagonal = first;
        for (const [offset, up] of previous.slice(1).entries()) {
            const cost = a.charAt(row - 1) === b.charAt(offset) ? 0 : 1;
            const value = Math.min(up + 1, left + 1, diagonal + cost);
            current.push(value);
            rowMin = Math.min(rowMin, value);
            diagonal = up;
            left = value;
        }
        if (rowMin > earlyExitAt) {
            return earlyExitAt + 1;
        }
        distance = left;
        previous = current;
    }
    return distance;
}

function resolveFuzzy(key: string): MerchantEntry | null {
    if (key.length < FUZZY_MIN_KEY_LENGTH) {
        return null;
    }
    const firstChar = key.charAt(0);
    const matches = new Set<MerchantEntry>();
    for (const [pattern, entry] of MERCHANT_INDEX) {
        if (pattern.charAt(0) !== firstChar) {
            continue;
        }
        if (Math.abs(pattern.length - key.length) > FUZZY_MAX_DISTANCE) {
            continue;
        }
        if (boundedLevenshtein(key, pattern, FUZZY_EARLY_EXIT_DISTANCE) <= FUZZY_MAX_DISTANCE) {
            matches.add(entry);
        }
    }
    if (matches.size !== 1) {
        return null;
    }
    const [only] = matches;
    return only ?? null;
}

function toMatch(entry: MerchantEntry, domain: string | null): MerchantMatch {
    return { categoryName: entry.categoryName, domain, tags: entry.tags };
}

export function resolveMerchant(rawName: string): MerchantMatch | null {
    const key = merchantKey(rawName);
    if (key.length === 0) {
        return null;
    }

    const exact = MERCHANT_INDEX.get(key);
    if (exact != null) {
        return toMatch(exact, exact.domain);
    }

    const alias = resolveAlias(key);
    if (alias != null) {
        return toMatch(alias, alias.domain);
    }

    const fuzzy = resolveFuzzy(key);
    if (fuzzy != null) {
        return toMatch(fuzzy, null);
    }

    return null;
}
