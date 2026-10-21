import { useRouter } from "expo-router";
import { useCallback } from "react";

import type { ActionMenuItem } from "@/components/action-menu";
import type { TransactionWithCategory } from "@/data/transactions";
import { useDeferredDelete } from "@/data/use-deferred-delete";
import { transactionRowActions } from "@/domain/transaction-actions";
import { useTranslation } from "@/i18n/context";

import { transactionMenuItems } from "./transaction-actions";

/**
 * `future` marks a row painted as an upcoming occurrence: a carrier's stored date is its last charge, not its next.
 * Stopping a schedule waits out an undo window too, so a silent failure is seen before the next sweep charges again.
 */
export function useTransactionRowActions(
    nowMs: number,
    onDelete: (id: string) => void
): (transaction: TransactionWithCategory, future: boolean) => ActionMenuItem[] {
    const router = useRouter();
    const t = useTranslation();
    const { requestDelete: requestStopRecurring } = useDeferredDelete("recurring");

    return useCallback(
        (transaction: TransactionWithCategory, future: boolean) => {
            const now = new Date(nowMs);
            const date = new Date(transaction.date);
            return transactionMenuItems({
                actions: transactionRowActions({
                    date,
                    future,
                    now,
                    recurringType: transaction.recurringType,
                }),
                onDelete: () => onDelete(transaction.id),
                onEdit: () => router.push(`/transactions/${transaction.id}`),
                onLogAgain: () => router.push(`/transactions/create?from=${transaction.id}`),
                onStopRecurring: () => requestStopRecurring(transaction.id),
                t,
            });
        },
        [nowMs, onDelete, requestStopRecurring, router, t]
    );
}
