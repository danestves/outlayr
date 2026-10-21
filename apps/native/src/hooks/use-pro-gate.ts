import { useRouter } from "expo-router";

import { useDatabase } from "@/contexts/local-data-context";
import { useBankAccounts, usePeople } from "@/data/accounts";
import type { Account } from "@/data/accounts-core";
import { livePayoffPlanCount } from "@/data/payoff-plans";
import {
    blocksSavedCurrency,
    FREE_PAYOFF_PLANS,
    FREE_PEOPLE,
    fillsFullCap,
    fullAccountCaps,
} from "@/domain/pro-limits";
import { useProLocked } from "@/hooks/use-pro-locked";

export function useProCapped(count: number, limit: number): boolean {
    return useProLocked() && count >= limit;
}

export function useAccountCaps(): ReturnType<typeof fullAccountCaps> {
    return fullAccountCaps(useBankAccounts(useDatabase()), useProLocked());
}

type Named = Pick<Account, "kind" | "name">;

export function useAccountSaveCapped(): (account: Named, before: Named | null) => boolean {
    const caps = useAccountCaps();
    return (account, before) => fillsFullCap(caps, account, before);
}

export function useAccountCreateRoute(): "/accounts/create" | "/paywall" {
    return useAccountCaps().accounts ? "/paywall" : "/accounts/create";
}

export function useLiabilityCreateRoute(): "/accounts/create" | "/paywall" {
    const caps = useAccountCaps();
    return caps.accounts && caps.installmentApps ? "/paywall" : "/accounts/create";
}

export function usePeopleCapped(): boolean {
    return useProCapped(usePeople(useDatabase()).length, FREE_PEOPLE);
}

type Priced = Pick<Account, "currency" | "kind" | "name">;

// Plans on `accountId` never count, so changing a plan is never capped. Counted when asked: only history says a plan
// has ended.
export function usePayoffPlanGate(): (accountId: string | null, open: () => void) => void {
    const db = useDatabase();
    const router = useRouter();
    const locked = useProLocked();
    return (accountId, open) => {
        if (!locked) {
            open();
            return;
        }
        livePayoffPlanCount(db, accountId)
            .then((count) => (count >= FREE_PAYOFF_PLANS ? router.push("/paywall") : open()))
            // A count that failed is not a full cap.
            .catch(open);
    };
}

export function useCurrencyBlocked(exceptAccountId: string | null): (account: Priced) => boolean {
    const db = useDatabase();
    const accounts = useBankAccounts(db);
    const locked = useProLocked();
    return (account) =>
        blocksSavedCurrency(
            account,
            accounts.find((held) => held.id === exceptAccountId) ?? null,
            accounts.filter((held) => held.id !== exceptAccountId),
            locked
        );
}
