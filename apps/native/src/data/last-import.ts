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
    kind: "csv" | "moneyManager";
}

function newestImport(rows: readonly { key: string; value: string | null }[]): LastImport | null {
    const raw = new Map(rows.map((row) => [row.key, row.value]));
    const moneyManager = parseImportRecord(raw.get(META_KEYS.moneyManagerImport));
    const csv = parseCsvImportRecord(raw.get(META_KEYS.csvImport));
    if (moneyManager != null && (csv == null || moneyManager.importedAt > csv.importedAt)) {
        return {
            entries: moneyManager.transactionIds.length + moneyManager.transferIds.length,
            importedAt: moneyManager.importedAt,
            kind: "moneyManager",
        };
    }
    return csv && { entries: csv.transactionIds.length, importedAt: csv.importedAt, kind: "csv" };
}

export function useLastImport(db: Database): LastImport | null {
    return useLiveValue(
        appMeta,
        () =>
            db
                .select()
                .from(appMeta)
                .where(inArray(appMeta.key, [META_KEYS.moneyManagerImport, META_KEYS.csvImport])),
        newestImport
    );
}
