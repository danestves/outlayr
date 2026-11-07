import { inScope } from "../../../lib/dashboard-series-ledger";
import type { Ledger, LedgerRow, LedgerTransfer } from "../../../lib/dashboard-series-ledger";
import type { Period } from "../../../lib/dashboard-series-period";

export type TransactionSort = "largest" | "newest" | "oldest";

export interface RowsView {
    accounts: readonly string[];
    categories: readonly string[];
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
    const picked = new Set(view.categories);
    const inPeriod = ({ day }: { day: string }) => day >= view.period.from && day <= view.period.to;
    const entries = ledger.rows.filter(
        (row) => inPeriod(row) && wanted(row) && (picked.size === 0 || picked.has(row.topId))
    );
    const transfers =
        picked.size === 0
            ? ledger.transfers.filter(
                  (row) => inPeriod(row) && (chosen.size === 0 || chosen.has(row.fromId) || chosen.has(row.toId))
              )
            : [];
    return [...entries, ...transfers].toSorted(COMPARERS[sort]);
}
