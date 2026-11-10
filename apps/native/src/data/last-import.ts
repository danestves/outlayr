import { useMeta } from "@/data/app-meta";
import type { Database } from "@/db/client";
import type { FileImportRecord, MoneyManagerImportRecord } from "@/domain/meta-values";

export interface LastImport {
    entries: number;
    importedAt: number;
    kind: "csv" | "moneyManager" | "pdf";
}

interface ImportRecords {
    csv: FileImportRecord | null;
    moneyManager: MoneyManagerImportRecord | null;
    pdf: FileImportRecord | null;
}

export function newestImport({ csv, moneyManager, pdf }: ImportRecords): LastImport | null {
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
    const moneyManager = useMeta(db, "moneyManagerImport");
    const csv = useMeta(db, "csvImport");
    const pdf = useMeta(db, "pdfImport");
    return newestImport({ csv, moneyManager, pdf });
}
