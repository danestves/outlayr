import type { ParsedImportFile } from "@/data/transfer-core";
import type { LabelSuggestion, StatementRow } from "@/lib/cloud-ai";

import type { MappingDraft } from "./import-mapping";

export interface StatementSuggestions {
    /** False when the server left labels unasked, so the resolve step should ask about them. */
    readonly complete: boolean;
    readonly suggestions: readonly LabelSuggestion[];
}

const HEADER = ["Date", "Description", "Amount", "Type", "Currency"];

export const STATEMENT_DRAFT: MappingDraft = {
    amount: 2,
    category: null,
    currency: 4,
    date: 0,
    exchangeRate: null,
    exchangeRateType: null,
    note: 1,
    type: 3,
};

/** The shape `parseImportFile` returns, so the resolve, review and undo steps treat a statement like any file. */
export function statementToParsedImport(rows: readonly StatementRow[]): ParsedImportFile {
    return {
        header: HEADER,
        rows: rows.map((row) => [
            row.date,
            row.label,
            String(Math.abs(row.amount)),
            row.amount < 0 ? "Expense" : "Income",
            row.currency ?? "",
        ]),
        width: HEADER.length,
    };
}
