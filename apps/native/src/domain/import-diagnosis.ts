import { parseCsv } from "@outlayr/money/csv-read";

import { splitHeaderAndRows } from "@/data/transfer-core";

export type ParseFailureReason = "empty" | "noDataRows" | "tooFewColumns";

/** Guards the parse allocation (`parseCsv`'s array-of-arrays), not the file read, which already happened. */
export const HARD_PARSE_REJECT_CHARS = 20_000_000;

export function classifyParseFailure(text: string): ParseFailureReason {
    const lines = parseCsv(text);
    if (lines.length === 0) {
        return "empty";
    }

    const { rows } = splitHeaderAndRows(lines);
    if (rows.length === 0) {
        return "noDataRows";
    }

    return "tooFewColumns";
}
