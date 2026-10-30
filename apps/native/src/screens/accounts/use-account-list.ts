import { toAccountKind } from "@outlayr/money/account-kind";
import { useRouter } from "expo-router";

import { useDatabase } from "@/contexts/local-data-context";
import { useBankAccounts } from "@/data/accounts";
import type { Account } from "@/data/accounts-core";
import { useGlobalCurrency } from "@/data/app-meta";
import { useDebtsOverview } from "@/data/debts";
import { useDeferredDelete } from "@/data/use-deferred-delete";
import { useNow } from "@/data/use-now";
import { useTranslation } from "@/i18n/context";

export function useAccountList() {
    const db = useDatabase();
    const router = useRouter();
    const t = useTranslation();
    const all = useBankAccounts(db);
    const { pendingId, requestDelete } = useDeferredDelete("account");
    const currency = useGlobalCurrency(db);
    const debts = useDebtsOverview(db, useNow());
    const rows = all.filter((account) => account.id !== pendingId);

    return {
        assets: rows.filter((account) => toAccountKind(account.kind) === "asset"),
        currency,
        db,
        debts,
        deleteAccount: (account: Account) => {
            requestDelete(account.id, t("accounts.undo.body"));
        },
        empty: rows.length + debts.owedToYou.length + debts.youOwe.length + debts.settled.length === 0,
        openDetail: (id: string) => {
            router.push({
                params: { accountId: id },
                pathname: "/accounts/[accountId]",
            });
        },
        rows,
    };
}
