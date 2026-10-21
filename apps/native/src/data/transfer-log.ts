import { and, desc, eq, gte, isNotNull, isNull, lt, lte } from "drizzle-orm";
import { useMemo } from "react";

import type { Database } from "@/db/client";
import { transactions, transfers } from "@/db/schema";
import type { LogFilter } from "@/domain/log-filter";
import { filterPeriodUnit } from "@/domain/log-filter";
import { cursorEnd, cursorStart } from "@/domain/log-period-cursor";
import { toTransferLogRow } from "@/domain/transfer-log-rows";
import type { TransferLogRow } from "@/domain/transfer-log-rows";

import { useAccounts } from "./accounts";
import { useLiveQuery } from "./live-query";

export interface TransferBounds {
    /**
     * The window pages on `day` and a period filter on `date` (`log-filtered.ts`); comparing a period against `day`
     * splits a transfer from a same-instant transaction synced from another timezone.
     */
    floorOn: "date" | "day";
    /** Inclusive; null is unbounded. */
    since: Date | null;
    /** Exclusive, on `date`; null stops at now. */
    until: Date | null;
}

export interface TransferScope {
    cursor: Date;
    filter: LogFilter;
    /** 1 = Sunday, 2 = Monday. */
    firstWeekday: number;
    page: { floor: Date | null; reachedEnd: boolean };
}

/** Null for scopes no transfer can be part of: it has no category, direction or schedule. */
export function logTransferBounds(scope: TransferScope): TransferBounds | null {
    const unit = filterPeriodUnit(scope.filter);
    if (unit) {
        return {
            floorOn: "date",
            since: cursorStart(unit, scope.cursor, scope.firstWeekday),
            until: cursorEnd(unit, scope.cursor, scope.firstWeekday),
        };
    }
    switch (scope.filter) {
        case "all": {
            return { floorOn: "day", since: scope.page.reachedEnd ? null : scope.page.floor, until: null };
        }
        case "transfers": {
            return { floorOn: "day", since: null, until: null };
        }
        default: {
            return null;
        }
    }
}

export function useTransferFees(db: Database, enabled = true) {
    const feeRows = useLiveQuery(
        transactions,
        () =>
            db
                .select({
                    accountId: transactions.accountId,
                    amount: transactions.amount,
                    transferId: transactions.transferId,
                })
                .from(transactions)
                .where(
                    enabled
                        ? and(isNotNull(transactions.transferId), isNull(transactions.deletedAt))
                        : eq(transactions.id, "")
                ),
        [enabled]
    );
    return useMemo(() => new Map(feeRows.map((fee) => [fee.transferId ?? "", fee])), [feeRows]);
}

/** Null bounds admit no transfer at all, as a query matching nothing: a hook cannot be skipped. */
export function useLogTransfers(db: Database, nowMs: number, bounds: TransferBounds | null): TransferLogRow[] {
    const accounts = useAccounts(db);
    const rows = useLiveQuery(
        transfers,
        () =>
            db
                .select()
                .from(transfers)
                .where(
                    bounds === null
                        ? eq(transfers.id, "")
                        : and(
                              isNull(transfers.deletedAt),
                              lte(transfers.date, new Date(nowMs)),
                              bounds.since
                                  ? gte(bounds.floorOn === "day" ? transfers.day : transfers.date, bounds.since)
                                  : undefined,
                              bounds.until ? lt(transfers.date, bounds.until) : undefined
                          )
                )
                .orderBy(desc(transfers.day), desc(transfers.date)),
        [nowMs, bounds === null, bounds?.floorOn, bounds?.since?.getTime() ?? 0, bounds?.until?.getTime() ?? 0],
        nowMs
    );
    const fees = useTransferFees(db, bounds !== null);
    const byId = useMemo(() => new Map(accounts.map((account) => [account.id, account])), [accounts]);
    return useMemo(() => rows.map((row) => toTransferLogRow(row, byId, fees)), [rows, byId, fees]);
}
