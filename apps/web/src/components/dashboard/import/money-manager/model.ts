import { capitalizeCategoryName } from "@outlayr/money/category-rules";
import { buildImportPlan } from "@outlayr/money/money-manager/plan";
import type {
    CategoryTarget,
    MmAnalysis,
    MmAccountView,
    MmCategoryView,
    MmChoices,
    MmSnapshot,
    OutlayrLedgerState,
} from "@outlayr/money/money-manager/types";

export interface Draft {
    analysis: MmAnalysis;
    choices: MmChoices;
    ledger: OutlayrLedgerState;
    name: string;
    size: number;
    snapshot: MmSnapshot;
}

export type Screen = "accounts" | "balances" | "budgets" | "categories" | "overview" | "start" | "uncategorized";

const PLACEHOLDER = /\{(\w+)\}/g;

/** Copy keeps `{name}` slots, so a sentence reorders per language instead of being glued from pieces. */
export const fill = (template: string, values: Readonly<Record<string, number | string>>) =>
    template.replaceAll(PLACEHOLDER, (_, key: string) => String(values[key] ?? ""));

export const planOf = (draft: Draft, choices: MmChoices = draft.choices) =>
    buildImportPlan(draft.snapshot, draft.analysis, choices, draft.ledger);

export const planSize = (plan: ReturnType<typeof planOf>) => plan.entries.length + plan.transfers.length;

export const accountOf = (draft: Draft, uid: string): MmAccountView | undefined =>
    draft.analysis.accounts.find((account) => account.uid === uid);

/** Budgets are in the backup's currency and land in the ledger's, so a mismatch would misstate every limit. */
export const budgetsFit = (snapshot: MmSnapshot, ledger: OutlayrLedgerState) =>
    snapshot.defaultCurrency === ledger.currency;

export function targetName(draft: Draft, view: MmCategoryView, target: CategoryTarget | undefined): string | null {
    switch (target?.kind) {
        case "existing": {
            return draft.ledger.categories.find((category) => category.id === target.categoryId)?.name ?? null;
        }
        case "preset": {
            return draft.ledger.presetLabel(target.presetName);
        }
        case "new":
        case "sub": {
            return view.title;
        }
        default: {
            return null;
        }
    }
}

export function parentName(draft: Draft, parent: Extract<CategoryTarget, { kind: "sub" }>["parent"]) {
    if ("categoryId" in parent) {
        return draft.ledger.categories.find((category) => category.id === parent.categoryId)?.name ?? "";
    }
    if ("presetName" in parent) {
        return draft.ledger.presetLabel(parent.presetName);
    }
    const owner = draft.analysis.categories.find((category) => category.uid === parent.mmUid);
    return owner === undefined ? "" : targetName(draft, owner, draft.choices.categories[parent.mmUid]) || owner.title;
}

export const sameName = (left: string, right: string) => capitalizeCategoryName(left) === capitalizeCategoryName(right);

/** An expense in the month `today` falls in, per Money Manager category, in the backup's currency. */
export function spentThisMonth(draft: Draft, today: string) {
    const month = today.slice(0, 7);
    const spent = new Map<string, number>();
    for (const entry of draft.snapshot.entries) {
        if (entry.income || entry.categoryUid === null || !entry.day.startsWith(month)) {
            continue;
        }
        const amount = entry.defaultAmount ?? (entry.currency === draft.snapshot.defaultCurrency ? entry.amount : 0);
        spent.set(entry.categoryUid, (spent.get(entry.categoryUid) ?? 0) + amount);
    }
    return spent;
}
