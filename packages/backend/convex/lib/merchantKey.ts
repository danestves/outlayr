// Duplicated from apps/native/src/domain/merchant-resolver.ts, since the backend must not depend on apps/native.
// Keep them identical: the curated map and this shared cache must agree on what "the same query" is.
export function merchantKey(raw: string): string {
    return raw
        .normalize("NFD")
        .replaceAll(/\p{Diacritic}/gu, "")
        .toLocaleLowerCase()
        .replaceAll(/[^\p{L}\p{N}]+/gu, " ")
        .trim()
        .replaceAll(/\s+/g, " ");
}

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
    while (kept.length > 1 && LEGAL_SUFFIXES.has(kept[kept.length - 1] ?? "")) {
        kept.pop();
    }
    return kept.join(" ");
}

const MIN_KEY_LENGTH = 3;

export function knowledgeKeys(name: string, currency: string | undefined, merchantName?: string | null): string[] {
    const keys = [merchantKey(name), descriptorKey(name), merchantKey(merchantName ?? "")]
        .filter((key) => key.length >= MIN_KEY_LENGTH)
        .map((key) => (currency ? `${key}${KNOWLEDGE_KEY_DELIMITER}${currency.toLowerCase()}` : key));
    return [...new Set(keys)];
}
