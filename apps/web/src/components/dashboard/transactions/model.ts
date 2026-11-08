import { round } from "../../../lib/dashboard-series-ledger";
import type { Ledger, LedgerRow } from "../../../lib/dashboard-series-ledger";
import { periodOf, shiftPeriodKey } from "../../../lib/dashboard-series-period";
import { figureOf, foldFees, viewRows } from "../home/rows";
import type { FoldedRow, TransactionSort } from "../home/rows";

export const ENTRY_TYPES = ["expenses", "income", "transfers"] as const;
export type EntryType = (typeof ENTRY_TYPES)[number];

export const SPANS = ["quarter", "year", "all"] as const;
export type Span = (typeof SPANS)[number];

export interface Range {
    from: string;
    to: string;
}

const EVER: Range = { from: "0000-01-01", to: "9999-12-31" };
const QUARTER_MONTHS = 3;
const YEAR_MONTHS = 12;

const monthsSpan = (firstKey: string, months: number, firstDayOfMonth: number): Range => ({
    from: periodOf(firstKey, firstDayOfMonth).from,
    to: periodOf(shiftPeriodKey(firstKey, months - 1), firstDayOfMonth).to,
});

/** The days a span covers around the picked month; a custom from/to wins over the span. */
export function rangeOf(
    { custom, key, span }: { custom: Partial<Range>; key: string; span: Span | undefined },
    firstDayOfMonth: number
): Range | null {
    if (custom.from !== undefined || custom.to !== undefined) {
        return { from: custom.from ?? EVER.from, to: custom.to ?? EVER.to };
    }
    const [year = "", month = "1"] = key.split("-");
    switch (span) {
        case "all": {
            return null;
        }
        case "quarter": {
            const first = Math.floor((Number(month) - 1) / QUARTER_MONTHS) * QUARTER_MONTHS + 1;
            return monthsSpan(`${year}-${String(first).padStart(2, "0")}`, QUARTER_MONTHS, firstDayOfMonth);
        }
        case "year": {
            return monthsSpan(`${year}-01`, YEAR_MONTHS, firstDayOfMonth);
        }
        default: {
            return periodOf(key, firstDayOfMonth);
        }
    }
}

export interface LedgerQuery {
    accounts: readonly string[];
    categories: readonly string[];
    max: number | null;
    min: number | null;
    q: string;
    range: Range | null;
    sort: TransactionSort;
    type: EntryType | undefined;
}

const AMOUNT = /^[-+]?\d+(?:[.,]\d+)?$/u;
const CENT = 0.005;

const matchesAmount = (needle: number, row: FoldedRow, figure: number) =>
    [figure, "fromId" in row ? row.sent : row.original, "fromId" in row ? row.arrived : row.amount].some(
        (each) => Math.abs(each - needle) < CENT
    );

/**
 * The rows a query lists, fees folded under what they were charged for. `text` gives the words a row is
 * found by, so names stay in the caller's language.
 */
export function queryRows(
    ledger: Pick<Ledger, "currency" | "rows" | "transfers">,
    query: LedgerQuery,
    text: (row: FoldedRow) => string
): FoldedRow[] {
    const listed = viewRows(
        ledger,
        { accounts: query.accounts, categories: query.categories, period: query.range ?? EVER },
        query.sort
    );
    const transferIds = new Set(ledger.transfers.map((row) => row.id));
    const typed = listed.filter((row) => {
        switch (query.type) {
            case "expenses": {
                return "income" in row && !row.income;
            }
            case "income": {
                return "income" in row && row.income;
            }
            case "transfers": {
                return "fromId" in row || (row.feeFor !== null && transferIds.has(row.feeFor));
            }
            default: {
                return true;
            }
        }
    });
    // A fee rides with what it was charged for, even when its own category, account or kind is filtered out.
    const kept = new Set(typed.map((row) => row.id));
    const fees = ledger.rows.filter((row) => row.feeFor !== null && kept.has(row.feeFor) && !kept.has(row.id));
    const needle = query.q.trim().toLocaleLowerCase();
    const amount = AMOUNT.test(needle) ? Math.abs(Number(needle.replace(",", "."))) : null;
    const folded = foldFees([...typed, ...fees]);
    const ordered =
        query.sort === "largest"
            ? folded.toSorted((a, b) => figureOf(ledger, b).amount - figureOf(ledger, a).amount || b.at - a.at)
            : folded;
    return ordered.filter((row) => {
        const figure = figureOf(ledger, row).amount;
        if ((query.min !== null && figure < query.min) || (query.max !== null && figure > query.max)) {
            return false;
        }
        if (needle === "") {
            return true;
        }
        return (
            (amount !== null && matchesAmount(amount, row, figure)) || text(row).toLocaleLowerCase().includes(needle)
        );
    });
}

export interface Tally {
    count: number;
    in: number;
    out: number;
}

/**
 * Money in and out across rows, in the ledger currency. A transfer moves money between the user's own accounts,
 * so only the fees charged on it count, and each fee counts once.
 */
export function tally(ledger: Pick<Ledger, "currency">, rows: readonly FoldedRow[]): Tally {
    let totalIn = 0;
    let totalOut = 0;
    const add = (row: LedgerRow) => {
        if (row.income) {
            totalIn += row.amount;
        } else {
            totalOut += row.amount;
        }
    };
    for (const row of rows) {
        if ("income" in row) {
            add(row);
        }
        for (const fee of row.fees) {
            add(fee);
        }
    }
    return { count: rows.length, in: round(ledger, totalIn), out: round(ledger, totalOut) };
}

export type Line = { day: string; net: number; type: "day" } | { row: FoldedRow; type: "row" };

/** Rows with a header above each day, for date sorts; any other sort lists rows alone. */
export function linesOf(ledger: Pick<Ledger, "currency">, rows: readonly FoldedRow[], byDay: boolean): Line[] {
    if (!byDay) {
        return rows.map((row) => ({ row, type: "row" }));
    }
    const lines: Line[] = [];
    let start = 0;
    while (start < rows.length) {
        const day = rows[start]?.day ?? "";
        let end = start;
        while (end < rows.length && rows[end]?.day === day) {
            end += 1;
        }
        const group = rows.slice(start, end);
        const { in: totalIn, out } = tally(ledger, group);
        lines.push({ day, net: round(ledger, totalIn - out), type: "day" });
        for (const row of group) {
            lines.push({ row, type: "row" });
        }
        start = end;
    }
    return lines;
}

const NEEDS_QUOTES = /[",\n\r]/u;

// Text a spreadsheet would run as a formula gets a leading quote; numbers stay numbers.
const FORMULA = /^[=+\-@\t\r]/u;
const PLAIN_NUMBER = /^-?\d+(?:\.\d+)?$/u;

const cell = (value: string | number) => {
    const raw = String(value);
    const text = FORMULA.test(raw) && !PLAIN_NUMBER.test(raw) ? `'${raw}` : raw;
    return NEEDS_QUOTES.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

export const csvOf = (rows: readonly (readonly (string | number)[])[]) =>
    `${rows.map((row) => row.map(cell).join(",")).join("\r\n")}\r\n`;

export interface CsvNames {
    account: (id: string | null) => string;
    category: (row: LedgerRow) => string;
    currency: (row: LedgerRow) => { amount: number; currency: string };
    kind: { expense: string; fee: string; income: string; transfer: string };
    merchant: (row: LedgerRow) => string;
}

/**
 * One line per entry, fee and transfer, oldest first like a bank statement. Amounts carry their sign: money out is
 * negative in both the entry's own currency and the ledger currency; a transfer shows what left the first account.
 */
export function exportLines(ledger: Pick<Ledger, "currency">, rows: readonly FoldedRow[], names: CsvNames) {
    const entry = (row: LedgerRow, kind: string) => {
        const sign = row.income ? 1 : -1;
        const own = names.currency(row);
        return [
            row.day,
            names.merchant(row),
            names.category(row),
            names.account(row.accountId),
            kind,
            sign * own.amount,
            own.currency,
            round(ledger, sign * row.amount),
        ];
    };
    return rows
        .toSorted((a, b) => a.at - b.at)
        .flatMap((row) => {
            if ("fromId" in row) {
                return [
                    [
                        row.day,
                        `${names.account(row.fromId)} → ${names.account(row.toId)}`,
                        "",
                        names.account(row.fromId),
                        names.kind.transfer,
                        -row.sent,
                        row.sentCurrency,
                        -row.amount,
                    ],
                    ...row.fees.map((fee) => entry(fee, names.kind.fee)),
                ];
            }
            const plain = row.income ? names.kind.income : names.kind.expense;
            return [
                entry(row, row.feeFor === null ? plain : names.kind.fee),
                ...row.fees.map((fee) => entry(fee, names.kind.fee)),
            ];
        });
}
