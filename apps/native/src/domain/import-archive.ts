import { strFromU8, unzipSync } from "fflate";

import { guessMapping } from "@/data/transfer-core";

import { formatCsvRow, parseCsv } from "./csv";
import { HARD_PARSE_REJECT_CHARS } from "./import-diagnosis";

const ZIP_SIGNATURE = [0x50, 0x4b, 0x03, 0x04];
const ALL_ROWS_SUFFIX = "_all.csv";
const CSV_EXTENSION = /\.csv$/i;
const MAX_NESTED_ZIP_BYTES = 512 * 1024 * 1024;

export function isZip(bytes: Uint8Array): boolean {
    return ZIP_SIGNATURE.every((byte, index) => bytes[index] === byte);
}

function csvEntries(
    bytes: Uint8Array,
    nested: boolean,
    budget: { csvBytes: number; nestedZipBytes: number }
): { name: string; text: string }[] {
    const entries = unzipSync(bytes, {
        filter: ({ name, originalSize }) => {
            if (name.startsWith("__MACOSX/")) {
                return false;
            }
            if (CSV_EXTENSION.test(name)) {
                budget.csvBytes -= originalSize;
                if (budget.csvBytes < 0) {
                    throw new RangeError("The archive holds more CSV text than an import reads");
                }
                return true;
            }
            if (!nested && name.toLowerCase().endsWith(".zip")) {
                budget.nestedZipBytes -= originalSize;
                if (budget.nestedZipBytes < 0) {
                    throw new RangeError("The nested archives are too large to open");
                }
                return true;
            }
            return false;
        },
    });
    return Object.entries(entries).flatMap(([name, content]) =>
        CSV_EXTENSION.test(name) ? [{ name, text: strFromU8(content) }] : csvEntries(content, true, budget)
    );
}

interface Table {
    header: string[];
    income: boolean;
    rows: string[][];
}

const INCOME_TABLE = /\b(?:income|ingresos?|receitas?|entradas?|revenue|earnings)\b/i;
const JOINED_HEADER = ["Date", "Amount", "Category", "Note", "Type", "Currency"];

function tableName(path: string): string {
    return (path.split("/").at(-1) ?? path).replace(CSV_EXTENSION, "");
}

function cellAt(row: readonly string[], index: number | null): string {
    return index == null ? "" : (row[index] ?? "");
}

function joinLedgers(tables: readonly Table[]): string[][] {
    return tables.flatMap(({ header, income, rows }) => {
        const mapping = guessMapping(header);
        return rows.map((row) => [
            cellAt(row, mapping.date),
            cellAt(row, mapping.amount),
            cellAt(row, mapping.category ?? mapping.note),
            cellAt(row, mapping.note),
            mapping.type == null && income ? "Income" : cellAt(row, mapping.type),
            cellAt(row, mapping.currency),
        ]);
    });
}

export function csvFromArchive(bytes: Uint8Array): string | null {
    let files: { name: string; text: string }[];
    try {
        files = csvEntries(bytes, false, { csvBytes: HARD_PARSE_REJECT_CHARS, nestedZipBytes: MAX_NESTED_ZIP_BYTES });
    } catch (error) {
        if (error instanceof RangeError) {
            throw error;
        }
        return null;
    }

    const names = new Set(files.map(({ name }) => name.toLowerCase()));
    const groups = new Map<string, Table>();
    for (const file of files) {
        const name = file.name.toLowerCase();
        if (!name.endsWith(ALL_ROWS_SUFFIX) && names.has(name.replace(CSV_EXTENSION, ALL_ROWS_SUFFIX))) {
            continue;
        }
        const [header, ...rows] = parseCsv(file.text);
        if (header == null) {
            continue;
        }
        const income = INCOME_TABLE.test(tableName(file.name));
        const key = `${income}:${formatCsvRow(header)}`;
        const group = groups.get(key) ?? { header, income, rows: [] };
        group.rows.push(...rows);
        groups.set(key, group);
    }

    const tables = [...groups.values()];
    const ledgers = tables.filter(({ header }) => {
        const mapping = guessMapping(header);
        return mapping.date != null && mapping.amount != null;
    });
    if (ledgers.length > 1) {
        return [JOINED_HEADER, ...joinLedgers(ledgers)].map(formatCsvRow).join("\n");
    }

    let best: Table | null = null;
    for (const table of ledgers.length === 1 ? ledgers : tables) {
        if (best == null || table.rows.length > best.rows.length) {
            best = table;
        }
    }
    return best == null ? null : [best.header, ...best.rows].map(formatCsvRow).join("\n");
}
