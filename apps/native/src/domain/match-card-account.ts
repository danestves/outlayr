import { resolveInstitutionDomain } from "./institution-map";
import { merchantKey } from "./merchant-resolver";

export interface CardAccountCandidate {
    readonly id: string;
    readonly name: string;
}

function containsTokens(haystack: string, needle: string): boolean {
    return ` ${haystack} `.includes(` ${needle} `);
}

/**
 * Words in a Wallet card name that say which network or kind of card it is,
 * never which account: "Zinli Visa" is the Zinli account even when a "Visa"
 * account also exists. Already in `merchantKey` form.
 */
const NETWORK_TOKENS = new Set([
    "visa",
    "mastercard",
    "master",
    "maestro",
    "discover",
    "diners",
    "unionpay",
    "debit",
    "credit",
    "card",
    "tarjeta",
    "debito",
    "credito",
]);

function withoutNetwork(key: string): string {
    return key
        .split(" ")
        .filter((token) => !NETWORK_TOKENS.has(token))
        .join(" ");
}

/**
 * Every tier must be unambiguous: a purchase filed under the wrong account is worse
 * than one left unattached, which the user sees and can fix.
 */
export function matchCardAccount(card: string, accounts: readonly CardAccountCandidate[]): string | null {
    const cardKey = merchantKey(card);
    if (cardKey.length === 0 || accounts.length === 0) {
        return null;
    }
    const keyed = accounts
        .map((account) => ({ id: account.id, key: merchantKey(account.name) }))
        .filter((account) => account.key.length > 0);

    // An account named exactly like the card wins outright: with both "Chase"
    // and "Chase Visa" on the ledger, the card "Chase Visa" names the second.
    const exact = uniqueExact(cardKey, keyed);
    if (exact !== undefined) {
        return exact;
    }

    // Then the issuer without network words, the full name only when nothing is left of it or
    // nothing claims it. An ambiguous issuer is final: with "Chase One", "Chase Two" and "Visa"
    // on the ledger, "Chase Visa" stays unattached rather than falling through to "Visa".
    const issuerKey = withoutNetwork(cardKey);
    if (issuerKey.length > 0 && issuerKey !== cardKey) {
        const byIssuer = matchKey(issuerKey, keyed);
        if (byIssuer !== undefined) {
            return byIssuer;
        }
    }
    return matchKey(cardKey, keyed) ?? null;
}

/** The one account with this exact key; null when several share it; undefined when none does. */
function uniqueExact(key: string, keyed: readonly { id: string; key: string }[]): string | null | undefined {
    const exact = keyed.filter((account) => account.key === key);
    if (exact.length === 0) {
        return undefined;
    }
    return exact.length === 1 ? exact[0].id : null;
}

/**
 * Null when several accounts could claim it, undefined when none does, so a caller can
 * stop on ambiguity instead of trying a looser key.
 */
function matchKey(cardKey: string, keyed: readonly { id: string; key: string }[]): string | null | undefined {
    const exact = uniqueExact(cardKey, keyed);
    if (exact !== undefined) {
        return exact;
    }

    const contained = keyed.filter(
        (account) => containsTokens(cardKey, account.key) || containsTokens(account.key, cardKey)
    );
    if (contained.length > 0) {
        return contained.length === 1 ? contained[0].id : null;
    }

    const institution = resolveInstitutionDomain(cardKey);
    if (institution == null) {
        return undefined;
    }
    const sameBank = keyed.filter((account) => resolveInstitutionDomain(account.key) === institution);
    if (sameBank.length === 0) {
        return undefined;
    }
    return sameBank.length === 1 ? sameBank[0].id : null;
}
