import { useAtomSet, useAtomValue } from "@effect/atom-react/Hooks";
import * as Effect from "effect/Effect";
import * as AsyncResult from "effect/reactivity/AsyncResult";

import { useAppSettings } from "@/contexts/display-settings-context";
import { useDatabase } from "@/contexts/local-data-context";
import { useCategoryMeta } from "@/data/categories";
import type { CategoryMetaRow } from "@/data/categories";
import { remoteEnrichmentOn } from "@/data/settings-core";
import { categoryKey, uniqueCategoryValues } from "@/data/transfer-core";
import type { ResolutionOutcome, UnavailableReason } from "@/domain/import-flow";
import type { MappingDraft } from "@/domain/import-mapping";
import { useRegionCode } from "@/hooks/use-region-code";
import { CsvImport, idleState } from "@/lib/csv-import";
import type { CsvImportStage, ResolveRequest } from "@/lib/csv-import";
import { useImportDraft } from "@/lib/import-draft-store";
import { appRuntime } from "@/lib/runtime";

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

const csvImportStateAtom = appRuntime.subscriptionRef(CsvImport.pipe(Effect.map((csvImport) => csvImport.state)));

const runCsvImportAtom = appRuntime.fn<ResolveRequest>()((request) =>
    CsvImport.pipe(Effect.flatMap((csvImport) => csvImport.run(request)))
);

const retryCsvImportAtom = appRuntime.fn<ResolveRequest>()((request) =>
    CsvImport.pipe(Effect.flatMap((csvImport) => csvImport.retry(request)))
);

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

export interface UseCsvImportResult {
    outcome: ResolutionOutcome | null;
    reason: UnavailableReason | null;
    retry: () => void;
    run: () => void;
    running: boolean;
    stage: CsvImportStage;
    tier1Matched: number;
    tier2Sent: number;
    totalLabels: number;
}

export function useCsvImport(): UseCsvImportResult {
    const db = useDatabase();
    const meta = useCategoryMeta(db);
    const settings = useAppSettings().state;
    const regionCode = useRegionCode();
    const { flow } = useImportDraft();
    const stored = useAtomValue(csvImportStateAtom);
    const runImport = useAtomSet(runCsvImportAtom);
    const retryImport = useAtomSet(retryCsvImportAtom);

    const labels =
        flow.parsed == null || flow.resolved == null
            ? []
            : uniqueCategoryValues(flow.parsed.rows, flow.resolved.mapping.category);
    const state =
        AsyncResult.isSuccess(stored) && stored.value.parsed === flow.parsed ? stored.value : idleState(flow.parsed);

    const requestFor = (parsed: ResolveRequest["parsed"]): ResolveRequest => ({
        aiEnrichment: remoteEnrichmentOn(settings.bool),
        categoryIdByKey: buildCategoryIdByKey(meta),
        categoryTree: buildCategoryTree(meta),
        chars: flow.file == null ? 0 : flow.file.chars,
        draft: flow.draft ?? EMPTY_DRAFT,
        groundedLookup: settings.bool("groundedLookup"),
        labels,
        parsed,
        regionCode,
    });

    const run = () => {
        if (flow.parsed != null) {
            runImport(requestFor(flow.parsed));
        }
    };
    const retry = () => {
        if (flow.parsed != null) {
            retryImport(requestFor(flow.parsed));
        }
    };

    return {
        outcome: state.outcome,
        reason: state.reason,
        retry,
        run,
        running: state.stage === "matching" || state.stage === "asking",
        stage: state.stage,
        tier1Matched: state.tier1Matched,
        tier2Sent: state.tier2Sent,
        totalLabels: labels.length,
    };
}
