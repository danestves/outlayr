import { accountLook } from "@outlayr/backend/confect/lib/ledgerLog";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { useMemo } from "react";

import { photoUrlsQuery, toPhotoUrls } from "@/components/dashboard/shell/photos";
import type { TileLook } from "@/components/ledger/tiles";
import { NEUTRAL_COLOR } from "@/lib/dashboard-series-ledger";
import type { Ledger } from "@/lib/dashboard-series-ledger";

export function catalogOf(ledger: Pick<Ledger, "books" | "budgetTargets" | "categories">) {
    const categories = new Map(ledger.books.categories.map((row) => [row.localId, row]));
    const accounts = new Map(ledger.books.accounts.map((row) => [row.localId, row]));
    const transactions = new Map(ledger.books.transactions.map((row) => [row.localId, row]));
    return {
        account: (id: string | null) => {
            const row = id === null ? undefined : accounts.get(id);
            return row ? accountLook(row) : null;
        },
        category: (id: string): TileLook => {
            const row = categories.get(id);
            return {
                color: (ledger.budgetTargets.get(id) ?? ledger.categories.get(id))?.color ?? NEUTRAL_COLOR,
                emoji: row?.emoji ?? null,
                icon: row?.icon ?? null,
            };
        },
        transaction: (id: string) => transactions.get(id),
    };
}

export type Catalog = ReturnType<typeof catalogOf>;

export function useCatalog(ledger: Pick<Ledger, "books" | "budgetTargets" | "categories">) {
    return useMemo(() => catalogOf(ledger), [ledger]);
}

export function useImageUrls(keys: readonly string[]) {
    const { convexQueryClient } = useRouteContext({ from: "/_account/app" });
    const { data } = useQuery({
        ...photoUrlsQuery(convexQueryClient, keys),
        placeholderData: keepPreviousData,
        select: toPhotoUrls,
    });
    return data;
}
