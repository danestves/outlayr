import { parseCsv, parseCsvAmount } from "@outlayr/money/csv-read";
import { formatCsvRow } from "@outlayr/money/transaction-csv";
import { strFromU8, unzipSync } from "fflate";

import { guessTargets } from "./import-file";
import type { Target } from "./import-file";

const ZIP_SIGNATURE = [0x50, 0x4b, 0x03, 0x04];
const ALL_ROWS_SUFFIX = "_all.csv";
const CSV_EXTENSION = /\.csv$/i;
const MAX_CSV_CHARS = 20_000_000;
const MAX_NESTED_ZIP_BYTES = 512 * 1024 * 1024;
const INCOME_TABLE = /\b(?:income|ingresos?|receitas?|entradas?|revenue|earnings)\b/i;
const JOINED_HEADER = ["Date", "Amount", "Category", "Note", "Type", "Currency"];

export const isZip = (bytes: Uint8Array) => ZIP_SIGNATURE.every((byte, index) => bytes[index] === byte);

interface Table {
    header: readonly string[];
    income: boolean;
    rows: readonly (readonly string[])[];
}

/** Notion nests a zip per workspace page inside the export, so one level of zips inside the zip is opened too. */
function csvEntries(bytes: Uint8Array, nested: boolean, budget: { chars: number; zips: number }) {
    const entries = unzipSync(bytes, {
        filter: ({ name, originalSize }) => {
            if (name.startsWith("__MACOSX/")) {
                return false;
            }
            if (CSV_EXTENSION.test(name)) {
                budget.chars -= originalSize;
                if (budget.chars < 0) {
                    throw new RangeError("The archive holds more CSV text than an import reads");
                }
                return true;
            }
            if (!nested && name.toLowerCase().endsWith(".zip")) {
                budget.zips -= originalSize;
                if (budget.zips < 0) {
                    throw new RangeError("The nested archives are too large to open");
                }
                return true;
            }
            return false;
        },
    });
    return Object.entries(entries).flatMap(([name, content]): { name: string; text: string }[] =>
        CSV_EXTENSION.test(name) ? [{ name, text: strFromU8(content) }] : csvEntries(content, true, budget)
    );
}

function columnsOf(header: readonly string[], rows: readonly (readonly string[])[]) {
    const targets = guessTargets({ header, rows: rows.slice(0, 50), width: header.length });
    const at = (...wanted: Target[]) => {
        const index = targets.findIndex((target) => wanted.includes(target));
        return index === -1 ? null : index;
    };
    return {
        amount: at("amount", "amountOut"),
        category: at("category"),
        currency: at("currency"),
        date: at("date"),
        note: at("merchant"),
        type: at("type"),
    };
}

const cell = (row: readonly string[], index: number | null) => (index === null ? "" : (row[index] ?? ""));

/**
 * Notion tables keep amounts positive and say the direction by which table they sit in, so a table with no type
 * column and no negative amount is spending unless its name says income.
 */
function impliedType(table: Table, columns: ReturnType<typeof columnsOf>): string | null {
    if (columns.type !== null) {
        return null;
    }
    if (table.income) {
        return "Income";
    }
    const signed = table.rows.some((row) => (parseCsvAmount(cell(row, columns.amount)) ?? 0) < 0);
    return signed ? null : "Expense";
}

function csvFromTables(tables: readonly Table[]): string | null {
    const read = tables.map((table) => ({ ...table, columns: columnsOf(table.header, table.rows) }));
    const ledgers = read.filter(({ columns }) => columns.date !== null && columns.amount !== null);
    if (ledgers.length > 1) {
        const rows = ledgers.flatMap((table) => {
            const { columns } = table;
            const implied = impliedType(table, columns);
            return table.rows.map((row) => [
                cell(row, columns.date),
                cell(row, columns.amount),
                cell(row, columns.category ?? columns.note),
                cell(row, columns.note),
                implied ?? cell(row, columns.type),
                cell(row, columns.currency),
            ]);
        });
        return [JOINED_HEADER, ...rows].map(formatCsvRow).join("\n");
    }
    const [ledger] = ledgers;
    if (ledger) {
        const implied = impliedType(ledger, ledger.columns);
        const lines =
            implied === null
                ? [ledger.header, ...ledger.rows]
                : [[...ledger.header, "Type"], ...ledger.rows.map((row) => [...row, implied])];
        return lines.map(formatCsvRow).join("\n");
    }
    const best = read.reduce<Table | null>(
        (top, table) => (top && top.rows.length >= table.rows.length ? top : table),
        null
    );
    return best === null ? null : [best.header, ...best.rows].map(formatCsvRow).join("\n");
}

/** A Notion export's ledger as one CSV, or null when the zip holds no CSV. Throws RangeError past the size budget. */
export function csvFromArchive(bytes: Uint8Array): string | null {
    let files: { name: string; text: string }[];
    try {
        files = csvEntries(bytes, false, { chars: MAX_CSV_CHARS, zips: MAX_NESTED_ZIP_BYTES });
    } catch (error) {
        if (error instanceof RangeError) {
            throw error;
        }
        return null;
    }
    const names = new Set(files.map(({ name }) => name.toLowerCase()));
    const groups = new Map<string, { header: string[]; income: boolean; rows: string[][] }>();
    for (const file of files) {
        const name = file.name.toLowerCase();
        // Notion writes a database twice, once filtered to its view and once as `_all`; the `_all` copy wins.
        if (!name.endsWith(ALL_ROWS_SUFFIX) && names.has(name.replace(CSV_EXTENSION, ALL_ROWS_SUFFIX))) {
            continue;
        }
        const [header, ...rows] = parseCsv(file.text);
        if (header === undefined) {
            continue;
        }
        const income = INCOME_TABLE.test((file.name.split("/").at(-1) ?? file.name).replace(CSV_EXTENSION, ""));
        const key = `${income}:${formatCsvRow(header)}`;
        const group = groups.get(key) ?? { header, income, rows: [] };
        // A spread push overflows the call stack on an export with a few hundred thousand rows.
        for (const line of rows) {
            group.rows.push(line);
        }
        groups.set(key, group);
    }
    return csvFromTables([...groups.values()]);
}

export function csvFromNotionTables(
    tables: readonly { header: readonly string[]; rows: readonly (readonly string[])[]; title: string }[]
): string | null {
    return csvFromTables(tables.map(({ header, rows, title }) => ({ header, income: INCOME_TABLE.test(title), rows })));
}
