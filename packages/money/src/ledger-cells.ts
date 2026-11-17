import { toCells } from "./currency-totals";
import type { CurrencyCell, CurrencyEntry } from "./currency-totals";

export const LEDGER_CELLS_VERSION = 1;

export type LedgerCellLeg = "flow" | "inbound" | "outbound" | "outsideMove" | "outsidePayment";

export interface LedgerCell extends CurrencyCell {
    leg: LedgerCellLeg;
    ref: string;
}

interface Sequenced {
    date: number;
    seq: number;
}

export interface LedgerCellRows {
    outsideMoves: readonly (Sequenced & { accountId: string; amount: number; amountUsd: number | null })[];
    outsidePayments: readonly (Sequenced & { amount: number; amountUsd: number | null; planId: string })[];
    transactions: readonly (Sequenced &
        Omit<CurrencyEntry, "date"> & {
            accountId?: string | null;
        })[];
    transfers: readonly (Sequenced & {
        fromAccountId: string;
        fromAmount: number;
        fromAmountUsd: number | null;
        fromCurrency: string;
        toAccountId: string;
        toAmount: number;
        toAmountUsd: number | null;
        toCurrency: string;
    })[];
}

type Placed = CurrencyEntry & { leg: LedgerCellLeg; ref: string; seq: number };

const bySeq = (a: { seq: number }, b: { seq: number }) => a.seq - b.seq;

export const compareLedgerCells = (a: LedgerCell, b: LedgerCell) =>
    a.ref.localeCompare(b.ref) ||
    a.leg.localeCompare(b.leg) ||
    a.dateKey.localeCompare(b.dateKey) ||
    (a.currencyCode ?? "").localeCompare(b.currencyCode ?? "") ||
    Number(a.income) - Number(b.income);

function placedRows(rows: LedgerCellRows): Placed[] {
    const placed: Placed[] = [];
    for (const { accountId, date, ...row } of rows.transactions) {
        if (accountId != null) {
            placed.push({ ...row, date: new Date(date), leg: "flow", ref: accountId });
        }
    }
    for (const row of rows.transfers) {
        const date = new Date(row.date);
        placed.push(
            {
                amount: row.fromAmount,
                amountUsd: row.fromAmountUsd,
                currency: row.fromCurrency,
                date,
                income: false,
                leg: "outbound",
                ref: row.fromAccountId,
                seq: row.seq,
            },
            {
                amount: row.toAmount,
                amountUsd: row.toAmountUsd,
                currency: row.toCurrency,
                date,
                income: true,
                leg: "inbound",
                ref: row.toAccountId,
                seq: row.seq,
            }
        );
    }
    for (const row of rows.outsidePayments) {
        placed.push({
            amount: row.amount,
            amountUsd: row.amountUsd,
            date: new Date(row.date),
            income: true,
            leg: "outsidePayment",
            ref: row.planId,
            seq: row.seq,
        });
    }
    for (const row of rows.outsideMoves) {
        placed.push({
            amount: row.amount,
            amountUsd: row.amountUsd,
            date: new Date(row.date),
            income: true,
            leg: "outsideMove",
            ref: row.accountId,
            seq: row.seq,
        });
    }
    return placed;
}

// Summed in `seq` order: upkeep and a rebuild must write the same floats. See docs/internals/ledger-cells.md.
export function ledgerCellsOf(rows: LedgerCellRows): LedgerCell[] {
    const groups = new Map<string, Pick<Placed, "leg" | "ref"> & { rows: Placed[] }>();
    for (const row of placedRows(rows)) {
        const key = `${row.leg}|${row.ref}`;
        const group = groups.get(key);
        if (group) {
            group.rows.push(row);
        } else {
            groups.set(key, { leg: row.leg, ref: row.ref, rows: [row] });
        }
    }
    return [...groups.values()]
        .flatMap(({ leg, ref, rows: group }) => toCells(group.sort(bySeq)).map((cell) => ({ ...cell, leg, ref })))
        .sort(compareLedgerCells);
}
