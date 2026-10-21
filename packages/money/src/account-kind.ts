// A person's sign is the direction: positive is money they owe you, negative is money you owe them.
const ACCOUNT_KINDS = ["asset", "liability", "person"] as const;

export type AccountKind = (typeof ACCOUNT_KINDS)[number];

export const DEFAULT_ACCOUNT_KIND: AccountKind = "asset";

// Rows older than the column default to asset: the ledger could not express a liability then.
export function toAccountKind(value: string | null | undefined): AccountKind {
    return ACCOUNT_KINDS.find((kind) => kind === value) ?? DEFAULT_ACCOUNT_KIND;
}

export function isPerson(account: { kind?: string | null }): boolean {
    return toAccountKind(account.kind) === "person";
}

export interface Balanced {
    /** Signed, as stored: a charged card is negative. */
    balance: number;
    kind: AccountKind;
}

export interface NetWorth {
    net: number;
    /** Positive when money is owed. */
    owe: number;
    own: number;
}

// `net` stays the plain signed sum. An overpaid card reports a negative `owe`, which is true and rare.
export function netWorth(accounts: readonly Balanced[]): NetWorth {
    let own = 0;
    let owed = 0;
    for (const account of accounts) {
        const owes = account.kind === "liability" || (account.kind === "person" && account.balance < 0);
        if (owes) {
            owed += account.balance;
        } else {
            own += account.balance;
        }
    }
    // Not just `-owed`: -0 formats as "-$0.00".
    return { net: own + owed, owe: owed === 0 ? 0 : -owed, own };
}
