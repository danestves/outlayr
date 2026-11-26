import type { BankAccountView, BankOverview, InstitutionView } from "@outlayr/backend/confect/banking.spec";
import { api } from "@outlayr/backend/convex/_generated/api";

import { convexClient } from "./convex";
import { collectBankAccounts } from "./stripe-link";

export type BankOverviewView = typeof BankOverview.Type;
export type LinkedBankAccount = typeof BankAccountView.Type;
export type BankInstitution = typeof InstitutionView.Type;

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

export function needsSignIn(group: InstitutionGroup): LinkedBankAccount | null {
    return group.accounts.find((account) => account.status === "relink") ?? null;
}

export type BankLinkOutcome =
    | { kind: "linked"; added: readonly LinkedBankAccount["id"][]; repaired: boolean }
    | { kind: "canceled" }
    | { kind: "failed" }
    | { kind: "plan" }
    | { kind: "unavailable" }
    | { kind: "retired" };

export async function linkBank(
    institution: BankInstitution["id"],
    repair: LinkedBankAccount["id"] | null
): Promise<BankLinkOutcome> {
    try {
        const started = await convexClient().action(api.banking.startLink, { institution, repair });
        if (started.kind === "redirect") {
            return { kind: "failed" };
        }
        if (started.kind !== "sdk") {
            return started;
        }
        const sheet = await collectBankAccounts(started.clientSecret);
        if (sheet.kind !== "collected") {
            return sheet;
        }
        return await convexClient().action(api.banking.finishLink, {
            completion: null,
            provider: started.provider,
            repair,
            sessionId: sheet.sessionId,
        });
    } catch (error) {
        console.warn("[outlayr] Linking a bank failed", error);
        return { kind: "failed" };
    }
}
