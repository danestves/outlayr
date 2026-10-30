import { eq } from "drizzle-orm";

import { META_KEYS } from "@/data/app-meta-core";
import { useLiveValue } from "@/data/live-query";
import { parseImportRecord } from "@/data/money-manager-import-core";
import type { Database } from "@/db/client";
import { appMeta } from "@/db/schema";

export interface LastImportSummary {
    entries: number;
    importedAt: number;
}

function parseImportSummary(value: string | null | undefined): LastImportSummary | null {
    const record = parseImportRecord(value);
    return (
        record && { entries: record.transactionIds.length + record.transferIds.length, importedAt: record.importedAt }
    );
}

export function useLastMoneyManagerImport(db: Database): LastImportSummary | null {
    return useLiveValue(
        appMeta,
        () => db.select().from(appMeta).where(eq(appMeta.key, META_KEYS.moneyManagerImport)),
        (rows) => parseImportSummary(rows[0]?.value)
    );
}
