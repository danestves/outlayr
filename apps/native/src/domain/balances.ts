import type { ExpenseContribution } from "@outlayr/money/budget-spent";
import type { BudgetWindow } from "@outlayr/money/budget-window";
import * as Schema from "effect/Schema";

export const BalancesView = Schema.Literals(["accounts", "categories"]);
export type BalancesView = typeof BalancesView.Type;

const isBalancesView = Schema.is(BalancesView);

/** Where links to the retired Accounts screen land. */
export const BALANCES_ACCOUNTS = "/balances?view=accounts";

/** The `balancesView` setting's values; 0 is a person who never picked one. */
const STORED_VIEWS = [null, "accounts", "categories"] as const;

export function storedBalancesView(view: BalancesView): number {
    return STORED_VIEWS.indexOf(view);
}

/** A link's `view` wins, then the last one picked; a first visit opens on Categories only once a limit exists. */
export function balancesViewFor({
    hasLimit,
    param,
    stored,
}: {
    hasLimit: boolean;
    param: unknown;
    stored: number;
}): BalancesView {
    if (isBalancesView(param)) {
        return param;
    }
    return STORED_VIEWS[stored] ?? (hasLimit ? "categories" : "accounts");
}

export interface UnlimitedCategory {
    categoryId: string;
    /** Of everything spent in the window, 0 to 1. */
    share: number;
    spent: number;
}

export interface UnlimitedSpend {
    rows: UnlimitedCategory[];
    /** Everything spent in the window, limited, unlimited and uncategorised alike. */
    total: number;
}

/** A subcategory rolls up to its parent unless its own limit covers it, so no amount counts under both. */
export function unlimitedSpend(
    contributions: readonly ExpenseContribution[],
    window: BudgetWindow,
    limitedIds: ReadonlySet<string>
): UnlimitedSpend {
    const startMs = window.start.getTime();
    const endMs = window.end.getTime();
    const byCategory = new Map<string, number>();
    let total = 0;

    for (const row of contributions) {
        const at = row.date.getTime();
        if (at < startMs || at >= endMs) {
            continue;
        }
        total += row.amount;
        const key = row.parentId ?? row.categoryId;
        const covered = (row.categoryId && limitedIds.has(row.categoryId)) || (key && limitedIds.has(key));
        if (key && !covered) {
            byCategory.set(key, (byCategory.get(key) ?? 0) + row.amount);
        }
    }

    const rows = [...byCategory]
        .filter(([, spent]) => spent > 0)
        .map(([categoryId, spent]) => ({ categoryId, share: total > 0 ? spent / total : 0, spent }))
        .sort((left, right) => right.spent - left.spent);
    return { rows, total };
}
