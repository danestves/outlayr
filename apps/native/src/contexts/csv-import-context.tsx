import { createContext, use, useEffect, useMemo } from "react";

import { useAppSettings } from "@/contexts/display-settings-context";
import { useDatabase } from "@/contexts/local-data-context";
import { useCategoryMeta } from "@/data/categories";
import type { CategoryMetaRow } from "@/data/categories";
import { remoteEnrichmentOn } from "@/data/settings-core";
import { categoryKey, uniqueCategoryValues } from "@/data/transfer-core";
import type { ParsedImportFile } from "@/data/transfer-core";
import type { MappingDraft } from "@/domain/import-mapping";
import { useCsvImport } from "@/hooks/use-csv-import";
import type { UseCsvImportResult } from "@/hooks/use-csv-import";
import { useRegionCode } from "@/hooks/use-region-code";
import { importDraftStore, useImportDraft } from "@/lib/import-draft-store";

const EMPTY_PARSED: ParsedImportFile = { header: null, rows: [], width: 0 };
const EMPTY_DRAFT: MappingDraft = {
    amount: null,
    category: null,
    currency: null,
    date: null,
    exchangeRate: null,
    exchangeRateType: null,
    note: null,
    type: null,
};

function buildCategoryTree(meta: ReadonlyMap<string, CategoryMetaRow>) {
    const named = [...meta.entries()].filter(([, row]) => row.name != null);
    // SAFETY: `named` is filtered to non-null names above; the column is nullable.
    return named
        .filter(([, row]) => row.parentId == null)
        .map(([id, row]) => ({
            // SAFETY on both lines: `named` is filtered to non-null names above.
            children: named.filter(([, child]) => child.parentId === id).map(([, child]) => child.name as string),
            name: row.name as string,
        }));
}

function buildCategoryIdByKey(meta: ReadonlyMap<string, CategoryMetaRow>): Map<string, string> {
    const byKey = new Map<string, string>();
    for (const [id, row] of meta) {
        if (row.name == null) {
            continue;
        }
        const key = categoryKey(row.name);
        if (!byKey.has(key)) {
            byKey.set(key, id);
        }
    }
    return byKey;
}

const CsvImportContext = createContext<UseCsvImportResult | null>(null);

export function CsvImportProvider({ children }: { children: React.ReactNode }) {
    const db = useDatabase();
    const meta = useCategoryMeta(db);
    const settings = useAppSettings().state;
    const aiEnrichment = remoteEnrichmentOn(settings.bool);
    const groundedLookup = settings.bool("groundedLookup");
    const regionCode = useRegionCode();
    const { flow: state } = useImportDraft();

    const categoryTree = useMemo(() => buildCategoryTree(meta), [meta]);
    const categoryIdByKey = useMemo(() => buildCategoryIdByKey(meta), [meta]);

    const labels = useMemo(() => {
        if (state.parsed == null || state.resolved == null) {
            return [];
        }
        return uniqueCategoryValues(state.parsed.rows, state.resolved.mapping.category);
    }, [state.parsed, state.resolved]);

    const result = useCsvImport({
        aiEnrichment,
        categoryIdByKey,
        categoryTree,
        chars: state.file == null ? 0 : state.file.chars,
        draft: state.draft ?? EMPTY_DRAFT,
        fileKey: state.file == null ? null : `${state.file.name}:${state.file.chars}`,
        groundedLookup,
        labels,
        parsed: state.parsed ?? EMPTY_PARSED,
        regionCode,
    });

    useEffect(() => {
        if (result.outcome == null) {
            return;
        }
        importDraftStore.dispatch({
            fromModel: result.fromModel,
            links: result.links,
            outcome: result.outcome,
            reason: result.reason,
            type: "resolutionSettled",
        });
    }, [result.outcome, result.reason, result.links, result.fromModel]);

    return <CsvImportContext.Provider value={result}>{children}</CsvImportContext.Provider>;
}

export function useCsvImportContext(): UseCsvImportResult {
    const value = use(CsvImportContext);
    if (value == null) {
        throw new Error("useCsvImportContext must be used within CsvImportProvider");
    }
    return value;
}
