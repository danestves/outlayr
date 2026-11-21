import type { ColumnMapping } from "./import-header";

type LabelSource = "categoryColumn" | "descriptionColumn";
export type MappingGap = "noLabelColumn" | "noDate" | "noAmount";
export type MappingDraft = Record<keyof ColumnMapping, number | null>;

export interface ResolvedMapping {
    labelSource: LabelSource;
    mapping: ColumnMapping;
}

export type MappingResolution = { ok: true; value: ResolvedMapping } | { ok: false; gaps: readonly MappingGap[] };

export function resolveImportMapping(draft: MappingDraft): MappingResolution {
    const gaps: MappingGap[] = [];
    const labelSource: LabelSource = draft.category == null ? "descriptionColumn" : "categoryColumn";
    const category = draft.category ?? draft.note;

    if (category == null) {
        gaps.push("noLabelColumn");
    }
    if (draft.date == null) {
        gaps.push("noDate");
    }
    if (draft.amount == null) {
        gaps.push("noAmount");
    }

    if (category == null || draft.date == null || draft.amount == null) {
        return { gaps, ok: false };
    }

    return {
        ok: true,
        value: {
            labelSource,
            mapping: {
                amount: draft.amount,
                category,
                currency: draft.currency,
                date: draft.date,
                exchangeRate: draft.exchangeRate,
                exchangeRateType: draft.exchangeRateType,
                note: draft.note,
                type: draft.type,
            },
        },
    };
}
