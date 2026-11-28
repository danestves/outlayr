import type { BankAccountView, BankOverview, InstitutionView } from "@outlayr/backend/confect/banking.spec";

export type BankOverviewView = typeof BankOverview.Type;
export type BankInstitution = typeof InstitutionView.Type;
export type LinkedBankAccount = typeof BankAccountView.Type;

/** The link flow: the banks list and the Accounts add menu both push it. */
export const BANK_LINK_ROUTE = "/settings/integrations/banks/link";

// Search never filters by country, but every provider today serves only these, so only they are offered a link.
export function bankLinkRegion(region: string | undefined): boolean {
    const country = region?.toUpperCase();
    return country === "US" || country === "CA";
}

export type BankOverviewResult =
    | { kind: "error" }
    | { kind: "loading" }
    | { kind: "ready"; overview: BankOverviewView };

export type BankGate = "free" | "personal" | "sync";

export type BanksScreen =
    | { kind: "entry" }
    | { kind: "failed" }
    | { kind: "gate"; gate: BankGate }
    | { kind: "hidden" }
    | { kind: "list"; accounts: readonly LinkedBankAccount[] }
    | { kind: "loading" };

export interface BanksScreenInput {
    /** `link` is the link screen itself: it never falls back to the list. */
    mode: "link" | "list";
    overview: BankOverviewResult;
    personal: boolean;
    signedIn: boolean;
    stripeReady: boolean;
    syncOn: boolean;
}

/** Accounts already linked stay listed whatever a gate says, so a lapsed plan can still unlink them. */
export function banksScreen({
    mode,
    overview,
    personal,
    signedIn,
    stripeReady,
    syncOn,
}: BanksScreenInput): BanksScreen {
    if (!(signedIn && stripeReady)) {
        return { kind: "hidden" };
    }
    if (overview.kind !== "ready") {
        return overview.kind === "error" ? { kind: "failed" } : { kind: "loading" };
    }
    const { access, accounts } = overview.overview;
    if (access === "unavailable") {
        return { kind: "hidden" };
    }
    if (mode === "list" && accounts.length > 0) {
        return { accounts, kind: "list" };
    }
    if (access === "plan") {
        return { gate: "free", kind: "gate" };
    }
    if (!syncOn) {
        return { gate: "sync", kind: "gate" };
    }
    // Bank charges arrive through the account-wide inbox, which only the Personal profile drains.
    if (!personal) {
        return { gate: "personal", kind: "gate" };
    }
    return { kind: "entry" };
}

export function bankEntryShown(overview: BankOverviewResult, stripeReady: boolean): boolean {
    return stripeReady && overview.kind === "ready" && overview.overview.access !== "unavailable";
}

export function accountTitle({ last4, name }: Pick<LinkedBankAccount, "last4" | "name">): string {
    return last4 === null ? name : `${name} ••${last4}`;
}

export interface InstitutionGroup {
    accounts: LinkedBankAccount[];
    institution: string;
    linkedAt: number;
}

export function byInstitution(accounts: readonly LinkedBankAccount[]): InstitutionGroup[] {
    const groups = new Map<string, LinkedBankAccount[]>();
    for (const account of accounts) {
        groups.set(account.institution, [...(groups.get(account.institution) ?? []), account]);
    }
    return [...groups]
        .map(([institution, rows]) => ({
            accounts: [...rows].sort((a, b) => a.name.localeCompare(b.name)),
            institution,
            linkedAt: Math.min(...rows.map((row) => row.linkedAt)),
        }))
        .sort((a, b) => a.linkedAt - b.linkedAt);
}

export function needsSignIn(overview: BankOverviewResult): LinkedBankAccount | null {
    return overview.kind === "ready"
        ? (overview.overview.accounts.find((account) => account.status === "relink") ?? null)
        : null;
}
