import { decimalsFor } from "@outlayr/money/currency";
import { roundMoney } from "@outlayr/money/round";

import { inScope, round } from "../../../lib/dashboard-series-ledger";
import type { Ledger, LedgerRow, LedgerTransfer } from "../../../lib/dashboard-series-ledger";
import type { Period } from "../../../lib/dashboard-series-period";

export type TransactionSort = "largest" | "newest" | "oldest";

export interface RowsView {
    accounts: readonly string[];
    categories: readonly string[];
    period: Period;
}

export type TableRow = LedgerRow | LedgerTransfer;

export type FoldedRow = TableRow & { fees: readonly LedgerRow[] };

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

const foldsInto = (row: TableRow, listed: ReadonlySet<string>) =>
    "feeFor" in row && row.feeFor !== null && row.feeFor !== row.id && listed.has(row.feeFor) ? row.feeFor : null;

export function foldFees(rows: readonly TableRow[]): FoldedRow[] {
    const listed = new Set(rows.map((row) => row.id));
    const fees = new Map<string, LedgerRow[]>();
    for (const row of rows) {
        const parent = foldsInto(row, listed);
        if (parent !== null && "feeFor" in row) {
            fees.set(parent, [...(fees.get(parent) ?? []), row]);
        }
    }
    return rows.flatMap((row) => (foldsInto(row, listed) === null ? [{ ...row, fees: fees.get(row.id) ?? [] }] : []));
}

const valueOf = (ledger: Pick<Ledger, "currency">, fees: readonly LedgerRow[]) =>
    round(
        ledger,
        fees.reduce((sum, fee) => sum + fee.amount, 0)
    );

export function figureOf(ledger: Pick<Ledger, "currency">, row: FoldedRow) {
    if ("fromId" in row) {
        const atDestination = row.fees.filter((fee) => fee.accountId === row.toId);
        const atSource = row.fees.filter((fee) => fee.accountId !== row.toId);
        const taken = atDestination.reduce((sum, fee) => sum + fee.original, 0);
        const moved = row.fees.length > 0 || row.arrivedCurrency !== row.sentCurrency || row.arrived !== row.sent;
        return {
            amount: round(ledger, row.amount + valueOf(ledger, atSource)),
            arrived: moved ? roundMoney(row.arrived - taken, decimalsFor(row.arrivedCurrency)) : null,
            fee: null,
        };
    }
    const fee = valueOf(ledger, row.fees);
    return {
        amount: round(ledger, row.income ? row.amount - fee : row.amount + fee),
        arrived: null,
        fee: row.fees.length > 0 ? fee : null,
    };
}
