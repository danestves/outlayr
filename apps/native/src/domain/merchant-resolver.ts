import { MERCHANT_INDEX } from "./merchant-map";
import type { MerchantEntry, MerchantTag } from "./merchant-map";
import { containsTokenSequence } from "./pattern-index";

export interface MerchantMatch {
    readonly categoryName: string;
    readonly domain: string | null;
    readonly tags: readonly MerchantTag[];
}

export function merchantKey(raw: string): string {
    return raw
        .normalize("NFD")
        .replaceAll(/\p{Diacritic}/gu, "")
        .toLocaleLowerCase()
        .replaceAll(/[^\p{L}\p{N}]+/gu, " ")
        .trim()
        .replaceAll(/\s+/g, " ");
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
    for (let row = 1; row <= a.length; row += 1) {
        const current: number[] = [row];
        let rowMin = row;
        for (let col = 1; col <= b.length; col += 1) {
            const cost = a[row - 1] === b[col - 1] ? 0 : 1;
            const value = Math.min(previous[col] + 1, current[col - 1] + 1, previous[col - 1] + cost);
            current.push(value);
            rowMin = Math.min(rowMin, value);
        }
        if (rowMin > earlyExitAt) {
            return earlyExitAt + 1;
        }
        previous = current;
    }
    return previous[b.length];
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
    return matches.size === 1 ? [...matches][0] : null;
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

const PROCESSORS: ReadonlySet<string> = new Set([
    "google",
    "iz",
    "nyx",
    "paypal",
    "pos",
    "pp",
    "sp",
    "sq",
    "squ",
    "sumup",
    "tst",
    "zettle",
    "ztl",
]);

const LEGAL_SUFFIXES: ReadonlySet<string> = new Set([
    "abee",
    "abeet",
    "ae",
    "ag",
    "bv",
    "epe",
    "gmbh",
    "ike",
    "inc",
    "llc",
    "ltd",
    "sa",
    "sas",
    "sl",
    "spa",
    "srl",
]);

const REFERENCE_CODE = /^(?=[a-z]*\d)[a-z0-9]{5,}$|^\d+$/;

const GLUED_SUFFIX = /(\p{Ll})(\p{Lu}{2,})/gu;

export function descriptorKey(raw: string): string {
    const star = raw.indexOf("*");
    const body = star !== -1 && PROCESSORS.has(merchantKey(raw.slice(0, star))) ? raw.slice(star + 1) : raw;
    const [first = "", ...rest] = merchantKey(body.replaceAll(GLUED_SUFFIX, "$1 $2")).split(" ");
    const kept = [first, ...rest.filter((token) => !REFERENCE_CODE.test(token))];
    while (kept.length > 1 && LEGAL_SUFFIXES.has(kept.at(-1) ?? "")) {
        kept.pop();
    }
    return kept.join(" ");
}
