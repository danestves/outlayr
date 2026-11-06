import { inArray } from "drizzle-orm";

import { META_KEYS } from "@/data/app-meta-core";
import { useLiveValue } from "@/data/live-query";
import { parseImportRecord } from "@/data/money-manager-import-core";
import { parseCsvImportRecord } from "@/data/transfer-core";
import type { Database } from "@/db/client";
import { appMeta } from "@/db/schema";

export interface LastImport {
    entries: number;
    importedAt: number;
    kind: "csv" | "moneyManager" | "pdf";
}

export function newestImport(rows: readonly { key: string; value: string | null }[]): LastImport | null {
    const raw = new Map(rows.map((row) => [row.key, row.value]));
    const moneyManager = parseImportRecord(raw.get(META_KEYS.moneyManagerImport));
    const csv = parseCsvImportRecord(raw.get(META_KEYS.csvImport));
    const pdf = parseCsvImportRecord(raw.get(META_KEYS.pdfImport));
    const candidates: LastImport[] = [];
    if (moneyManager != null) {
        candidates.push({
            entries: moneyManager.transactionIds.length + moneyManager.transferIds.length,
            importedAt: moneyManager.importedAt,
            kind: "moneyManager",
        });
    }
    if (csv != null) {
        candidates.push({ entries: csv.transactionIds.length, importedAt: csv.importedAt, kind: "csv" });
    }
    if (pdf != null) {
        candidates.push({ entries: pdf.transactionIds.length, importedAt: pdf.importedAt, kind: "pdf" });
    }
    let newest: LastImport | null = null;
    for (const candidate of candidates) {
        if (newest == null || candidate.importedAt > newest.importedAt) {
            newest = candidate;
        }
    }
    return newest;
}

export function useLastImport(db: Database): LastImport | null {
    return useLiveValue(
        appMeta,
        () =>
            db
                .select()
                .from(appMeta)
                .where(inArray(appMeta.key, [META_KEYS.moneyManagerImport, META_KEYS.csvImport, META_KEYS.pdfImport])),
        newestImport
    );
}
