import { inScope } from "../../../lib/dashboard-series-ledger";
import type { Ledger, LedgerRow } from "../../../lib/dashboard-series-ledger";
import type { Period } from "../../../lib/dashboard-series-period";

export const PAGE_SIZE = 10;

export type TransactionSort = "largest" | "newest" | "oldest";

export interface RowsView {
    accounts: readonly string[];
    category: string | null;
    period: Period;
}

const COMPARERS = {
    largest: (a: LedgerRow, b: LedgerRow) => b.amount - a.amount || b.at - a.at,
    newest: (a: LedgerRow, b: LedgerRow) => b.at - a.at || a.id.localeCompare(b.id),
    oldest: (a: LedgerRow, b: LedgerRow) => a.at - b.at || a.id.localeCompare(b.id),
} satisfies Record<TransactionSort, (a: LedgerRow, b: LedgerRow) => number>;

export function viewRows(ledger: Pick<Ledger, "rows">, view: RowsView, sort: TransactionSort) {
    const wanted = inScope(view);
    return ledger.rows
        .filter(
            (row) =>
                row.day >= view.period.from &&
                row.day <= view.period.to &&
                wanted(row) &&
                (view.category === null || row.topId === view.category)
        )
        .toSorted(COMPARERS[sort]);
}

export function pageOf<Row>(rows: readonly Row[], page: number, size = PAGE_SIZE) {
    const pages = Math.max(Math.ceil(rows.length / size), 1);
    const current = Math.min(Math.max(page, 0), pages - 1);
    const start = current * size;
    return {
        from: rows.length === 0 ? 0 : start + 1,
        page: current,
        pages,
        rows: rows.slice(start, start + size),
        to: Math.min(start + size, rows.length),
        total: rows.length,
    };
}
