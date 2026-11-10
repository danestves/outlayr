import type { Report } from "./model";

const BOM = "﻿";
const NEEDS_QUOTES = /[",\r\n]/;
const FORMULA_LEAD = /^[=+\-@\t\r]/;

/** A spreadsheet runs a cell that opens with one of these as a formula, so text cells get a leading quote. */
const safe = (text: string) => (FORMULA_LEAD.test(text) ? `'${text}` : text);

function quoted(cell: string) {
    return NEEDS_QUOTES.test(cell) ? `"${cell.replaceAll('"', '""')}"` : cell;
}

/** Text cells are guarded against formulas; numbers pass through so a negative stays a number. */
export interface Cell {
    number?: number;
    text?: string;
}

export const text = (value: string): Cell => ({ text: value });
export const num = (value: number): Cell => ({ number: value });

export function csvOf(rows: readonly (readonly Cell[])[]) {
    const lines = rows.map((row) =>
        row.map((cell) => (cell.number === undefined ? quoted(safe(cell.text ?? "")) : String(cell.number))).join(",")
    );
    return `${BOM}${lines.join("\r\n")}\r\n`;
}

export interface TableNames {
    average: string;
    columns: readonly string[];
    corner: string;
    rows: readonly string[];
    total: string;
    versus: string;
}

const PERCENT = 100;
const PERCENT_DIGITS = 10;

/** The comparison column in percentage points, blank where the average is zero. */
const changeCell = (change: number | null): Cell =>
    change === null ? text("") : num(Math.round(change * PERCENT * PERCENT_DIGITS) / PERCENT_DIGITS);

export function tableRows(report: Report, names: TableNames, averages: boolean): Cell[][] {
    const compare = averages && report.totals.change !== null;
    const line = (label: string, values: readonly number[], average: number, change: number | null) => [
        text(label),
        ...values.map(num),
        ...(averages ? [num(average)] : []),
        ...(compare ? [changeCell(change)] : []),
    ];
    return [
        [
            text(names.corner),
            ...names.columns.map(text),
            ...(averages ? [text(names.average)] : []),
            ...(compare ? [text(`${names.versus} (%)`)] : []),
        ],
        ...report.rows.map((row, index) => line(names.rows[index] ?? "", row.values, row.average, row.change)),
        line(names.total, report.totals.values, report.totals.average, report.totals.change),
    ];
}

export interface EntryNames {
    account: (id: string | null) => string;
    category: (id: string | null) => string;
    headers: readonly string[];
    types: { income: string; spending: string };
}

export function entryRows(report: Report, names: EntryNames): Cell[][] {
    return [
        names.headers.map(text),
        ...report.sources
            .toSorted((a, b) => a.row.at - b.row.at)
            .map(({ row }) => [
                text(row.day),
                text(row.note),
                text(names.category(row.categoryId)),
                text(names.account(row.accountId)),
                text(row.income ? names.types.income : names.types.spending),
                num(row.amount),
            ]),
    ];
}
