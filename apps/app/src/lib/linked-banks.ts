import type { BankAccountView, BankOverview, InstitutionView } from "@outlayr/backend/confect/banking.spec";
import { BANK_ANALYTICS_AT_MS } from "@outlayr/backend/confect/legal";
import { api } from "@outlayr/backend/convex/_generated/api";

import { convexClient } from "./convex";
import { track } from "./launch-analytics";
import { collectBankAccounts } from "./stripe-link";

export type BankOverviewView = typeof BankOverview.Type;
export type LinkedBankAccount = typeof BankAccountView.Type;
export type BankInstitution = typeof InstitutionView.Type;

export const BANK_PROVIDER_NAMES = { stripe: "Stripe" } as const satisfies Record<BankInstitution["provider"], string>;

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
    const outcome = await attemptLink(institution, repair);
    const result = linkResult(outcome);
    if (result !== null && Date.now() >= BANK_ANALYTICS_AT_MS) {
        track({ event: "bank_link_finished", properties: { ...result, relink: repair !== null } });
    }
    return outcome;
}

export interface LinkResult {
    accounts: number;
    outcome: "linked" | "canceled" | "failed";
}

// A relink that leaves the account expired shows as a failure, so it counts as one. The plan and unavailable gates
// stop before any attempt.
function linkResult(outcome: BankLinkOutcome): LinkResult | null {
    switch (outcome.kind) {
        case "linked": {
            return outcome.repaired || outcome.added.length > 0
                ? { accounts: outcome.added.length, outcome: "linked" }
                : { accounts: 0, outcome: "failed" };
        }
        case "canceled": {
            return { accounts: 0, outcome: "canceled" };
        }
        case "plan":
        case "unavailable": {
            return null;
        }
        default: {
            return { accounts: 0, outcome: "failed" };
        }
    }
}

async function attemptLink(
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
