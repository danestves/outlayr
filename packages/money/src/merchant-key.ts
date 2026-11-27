// Unicode marks the kana voiced marks and ー as diacritics; stripping them makes ドトール and トトール one key.
const DIACRITIC_EXCEPT_KANA_MARKS = /(?![゙゚ー])\p{Diacritic}/gu;
// NFKC on the whole string folds superscripts too, so "Coffee²" would collide with "Coffee2".
const HALFWIDTH_FULLWIDTH = /[\uFF00-\uFFEF]+/gu;

export function foldText(raw: string): string {
    return raw
        .replaceAll(HALFWIDTH_FULLWIDTH, (run) => run.normalize("NFKC"))
        .normalize("NFD")
        .replaceAll(DIACRITIC_EXCEPT_KANA_MARKS, "")
        .normalize("NFC")
        .toLocaleLowerCase()
        .replaceAll(/[^\p{L}\p{M}\p{N}]+/gu, " ")
        .trim();
}

export const merchantKey = foldText;

// `merchantKey` can never emit this, so a merchant named "Acme EUR" and "Acme" in EUR stay two keys.
const KNOWLEDGE_KEY_DELIMITER = "|";

// Scoped by currency, so a name that is one business in Iowa and another in Paris does not share a domain.
export function knowledgeKey(name: string, currency: string | undefined): string {
    const key = merchantKey(name);
    return currency ? `${key}${KNOWLEDGE_KEY_DELIMITER}${currency.toLowerCase()}` : key;
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

const MIN_KEY_LENGTH = 3;
// A two-character Han, kana or Hangul name still names a business, e.g. 無印.
const MIN_CJK_KEY_LENGTH = 2;
const CJK_SCRIPT = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;

export function isMatchableKey(key: string): boolean {
    return [...key].length >= (CJK_SCRIPT.test(key) ? MIN_CJK_KEY_LENGTH : MIN_KEY_LENGTH);
}

export function knowledgeKeys(
    name: string,
    currency: string | null | undefined,
    merchantName?: string | null
): string[] {
    const keys = [merchantKey(name), descriptorKey(name), merchantKey(merchantName ?? "")]
        .filter(isMatchableKey)
        .map((key) => (currency ? `${key}${KNOWLEDGE_KEY_DELIMITER}${currency.toLowerCase()}` : key));
    return [...new Set(keys)];
}
