import { inScope } from "../../../lib/dashboard-series-ledger";
import type { Ledger, LedgerRow, LedgerTransfer } from "../../../lib/dashboard-series-ledger";
import type { Period } from "../../../lib/dashboard-series-period";

export const PAGE_SIZE = 10;

export type TransactionSort = "largest" | "newest" | "oldest";

export interface RowsView {
    accounts: readonly string[];
    category: string | null;
    period: Period;
}

export type TableRow = LedgerRow | LedgerTransfer;

const COMPARERS = {
    largest: (a: TableRow, b: TableRow) => b.amount - a.amount || b.at - a.at,
    newest: (a: TableRow, b: TableRow) => b.at - a.at || a.id.localeCompare(b.id),
    oldest: (a: TableRow, b: TableRow) => a.at - b.at || a.id.localeCompare(b.id),
} satisfies Record<TransactionSort, (a: TableRow, b: TableRow) => number>;

export function viewRows(ledger: Pick<Ledger, "rows" | "transfers">, view: RowsView, sort: TransactionSort) {
    const wanted = inScope(view);
    const chosen = new Set(view.accounts);
    const inPeriod = ({ day }: { day: string }) => day >= view.period.from && day <= view.period.to;
    const entries = ledger.rows.filter(
        (row) => inPeriod(row) && wanted(row) && (view.category === null || row.topId === view.category)
    );
    const transfers =
        view.category === null
            ? ledger.transfers.filter(
                  (row) => inPeriod(row) && (chosen.size === 0 || chosen.has(row.fromId) || chosen.has(row.toId))
              )
            : [];
    return [...entries, ...transfers].toSorted(COMPARERS[sort]);
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
