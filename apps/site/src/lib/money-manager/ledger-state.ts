import { toAccountKind } from "@outlayr/money/account-kind";
import type { OutlayrLedgerState } from "@outlayr/money/money-manager/types";

import type { Ledger } from "@/lib/dashboard-series-ledger";

export function outlayrLedgerState(ledger: Ledger, presetLabel: OutlayrLedgerState["presetLabel"]): OutlayrLedgerState {
    const { books } = ledger;
    return {
        accounts: books.accounts
            .filter((row) => row.deletedAt === null)
            .map((row) => ({
                currency: row.currency,
                id: row.localId,
                kind: toAccountKind(row.kind),
                name: row.name,
            })),
        budgetCategoryIds: books.budgets.flatMap((row) =>
            row.deletedAt === null && row.categoryId !== null ? [row.categoryId] : []
        ),
        categories: books.categories
            .filter((row) => row.deletedAt === null)
            .map((row) => ({
                color: row.color,
                customName: row.customName ?? false,
                icon: row.icon,
                id: row.localId,
                income: row.income,
                name: row.name ?? "",
                parentId: row.parentId,
                preset: row.preset ?? null,
            })),
        currency: ledger.currency,
        // The web only opens after onboarding picked the ledger's currency.
        currencyChosen: true,
        entries: books.transactions
            .filter((row) => row.deletedAt === null && row.transferId == null && row.feeForId == null)
            .map((row) => ({
                amount: row.amount,
                currency: row.currency ?? ledger.currency,
                date: row.date,
                income: row.income,
            })),
        presetLabel,
    };
}
