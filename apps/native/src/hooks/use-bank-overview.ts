import { api } from "@outlayr/backend/convex/_generated/api";
import { useQueries } from "convex/react";

import { bankEntryShown } from "@/domain/linked-banks";
import type { BankOverviewResult, BankOverviewView } from "@/domain/linked-banks";
import { useAuthSession } from "@/lib/auth-session";
import { STRIPE_READY } from "@/lib/stripe-link";

const OVERVIEW_REQUEST = { overview: { args: {}, query: api.banking.overview } };
const NO_REQUEST = {};

export function useBankOverview(): BankOverviewResult {
    const signedIn = useAuthSession().accountId !== null;
    const result: BankOverviewView | Error | undefined = useQueries(signedIn ? OVERVIEW_REQUEST : NO_REQUEST).overview;
    if (result instanceof Error) {
        return { kind: "error" };
    }
    if (result === undefined) {
        return { kind: "loading" };
    }
    return { kind: "ready", overview: result };
}

export function useBankEntry() {
    const overview = useBankOverview();
    return {
        access: overview.kind === "ready" ? overview.overview.access : null,
        accounts: overview.kind === "ready" ? overview.overview.accounts.length : 0,
        shown: bankEntryShown(overview, STRIPE_READY),
    };
}
