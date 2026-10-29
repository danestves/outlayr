import { RegistryContext } from "@effect/atom-react/RegistryContext";
import { useRouter } from "expo-router";
import { use } from "react";

import { useDatabase } from "@/contexts/local-data-context";
import { useBankAccounts, usePeople } from "@/data/accounts";
import type { Account } from "@/data/accounts-core";
import { paywallHref } from "@/domain/paywall-trigger";
import type { PaywallTrigger } from "@/domain/paywall-trigger";
import {
    blocksSavedCurrency,
    FREE_PAYOFF_PLANS,
    FREE_PEOPLE,
    fillsFullCap,
    fullAccountCaps,
} from "@/domain/pro-limits";
import { useProLocked } from "@/hooks/use-pro-locked";
import { posthog } from "@/lib/posthog";
import { SILENT } from "@/state/atom-command";
import { livePayoffPlanCountCommand } from "@/state/planning-commands";
import { fireAtomCommand } from "@/state/use-atom-action";

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

export function useOpenPaywall(): (limit: typeof PaywallTrigger.Type) => void {
    const router = useRouter();
    return (limit) => {
        posthog?.capture("limit_hit", { limit });
        router.push(paywallHref(limit));
    };
}

export function useCreateAccount(): () => void {
    const router = useRouter();
    const openPaywall = useOpenPaywall();
    const capped = useAccountCaps().accounts;
    return () => {
        if (capped) {
            openPaywall("accounts");
            return;
        }
        router.push("/accounts/create");
    };
}

export function useCreateLiability(): () => void {
    const router = useRouter();
    const openPaywall = useOpenPaywall();
    const caps = useAccountCaps();
    return () => {
        if (caps.accounts && caps.installmentApps) {
            openPaywall("accounts");
            return;
        }
        router.push({ params: { kind: "liability" }, pathname: "/accounts/create" });
    };
}

export function usePeopleCapped(): boolean {
    return useProCapped(usePeople(useDatabase()).length, FREE_PEOPLE);
}

type Priced = Pick<Account, "currency" | "kind" | "name">;

// Plans on `accountId` never count, so changing a plan is never capped. Counted when asked: only history says a plan
// has ended.
export function usePayoffPlanGate(): (accountId: string | null, open: () => void) => void {
    const db = useDatabase();
    const openPaywall = useOpenPaywall();
    const locked = useProLocked();
    const registry = use(RegistryContext);
    return (accountId, open) => {
        if (!locked) {
            open();
            return;
        }
        // A count that failed is not a full cap.
        fireAtomCommand(
            registry,
            livePayoffPlanCountCommand,
            { db, exceptAccountId: accountId },
            {
                onFailure: open,
                onSuccess: (count) => {
                    if (count >= FREE_PAYOFF_PLANS) {
                        openPaywall("payoff_plans");
                        return;
                    }
                    open();
                },
            },
            SILENT
        );
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
