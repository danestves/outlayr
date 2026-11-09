import { decimalsFor } from "./currency";

const NEEDS_QUOTING = /[",\r\n]/;

function escapeField(value: string): string {
    if (!NEEDS_QUOTING.test(value)) {
        return value;
    }
    return `"${value.replaceAll('"', '""')}"`;
}

export function formatCsvRow(fields: readonly string[]): string {
    return fields.map(escapeField).join(",");
}

// `Date` is an ISO 8601 instant, not the Swift export's description (`CSVExport.swift:31`), so the moment survives
// any zone. `Currency` keeps a €12.50 lunch from coming back as $12.50.
export const CSV_HEADER = [
    "Date",
    "Note",
    "Amount",
    "Currency",
    "Category",
    "Type",
    "Exchange Rate Type",
    "Exchange Rate",
] as const;

export const CSV_TYPE_INCOME = "Income";
export const CSV_TYPE_EXPENSE = "Expense";

export interface ExportableTransaction {
    amount: number;
    categoryName: string | null;
    currency: string | null;
    date: Date;
    exchangeRate: number | null;
    exchangeRateType: string | null;
    income: boolean;
    note: string;
}

const MAX_DECIMALS = 10;

const TRAILING_ZEROS = /0+$/;
const TRAILING_DOT = /\.$/;

function exactDecimal(value: number): string {
    const plain = value.toFixed(MAX_DECIMALS).replace(TRAILING_ZEROS, "").replace(TRAILING_DOT, "");
    return Number.parseFloat(plain) === value ? plain : String(value);
}

export function serializeCsvAmount(amount: number, currency: string): string {
    const magnitude = Math.abs(amount);
    const fixed = magnitude.toFixed(decimalsFor(currency));
    return Number.parseFloat(fixed) === magnitude ? fixed : exactDecimal(magnitude);
}

export function formatCsvDate(date: Date): string {
    return date.toISOString();
}

export function transactionsToCsv(rows: readonly ExportableTransaction[], ledgerCurrency: string): string {
    const lines = [formatCsvRow(CSV_HEADER)];
    for (const row of rows) {
        const currency = row.currency ?? ledgerCurrency;
        const hasRateMetadata = currency !== "USD";
        lines.push(
            formatCsvRow([
                formatCsvDate(row.date),
                row.note,
                serializeCsvAmount(row.amount, currency),
                currency,
                row.categoryName ?? "",
                row.income ? CSV_TYPE_INCOME : CSV_TYPE_EXPENSE,
                hasRateMetadata ? (row.exchangeRateType ?? "") : "",
                hasRateMetadata && row.exchangeRate != null ? exactDecimal(row.exchangeRate) : "",
            ])
        );
    }
    return `${lines.join("\n")}\n`;
}
