import { startOfDay } from "@outlayr/money/calendar";
import { merchantKey } from "@outlayr/money/merchant-key";

import type { ImportEntry } from "@/data/transfer-core";

export interface ExistingRow {
    amount: number;
    date: Date;
    income: boolean;
    note: string;
}

export function dedupFingerprint(row: ExistingRow): string {
    return `${startOfDay(row.date).getTime()}|${row.amount.toFixed(3)}|${row.income ? 1 : 0}|${merchantKey(row.note)}`;
}

export function fingerprintsOf(rows: readonly ExistingRow[]): ReadonlySet<string> {
    return new Set(rows.map(dedupFingerprint));
}

export function flagDuplicates(entries: readonly ImportEntry[], existing: ReadonlySet<string>): ReadonlySet<number> {
    const flagged = new Set<number>();
    for (const entry of entries) {
        if (existing.has(dedupFingerprint(entry))) {
            flagged.add(entry.row);
        }
    }
    return flagged;
}
