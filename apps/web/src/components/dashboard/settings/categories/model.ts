import type { LedgerBooks } from "@outlayr/backend/confect/ledgerView";
import { capitalizeCategoryName, detectCategoryCollision } from "@outlayr/money/category-rules";

import { liveCategories } from "../../../../lib/category-writes";
import { rowsOf, total, UNCATEGORIZED_ID } from "../../../../lib/dashboard-series-ledger";
import type { Ledger, LedgerRow } from "../../../../lib/dashboard-series-ledger";
import { periodOf, shiftPeriodKey } from "../../../../lib/dashboard-series-period";
import type { Period } from "../../../../lib/dashboard-series-period";

export type Category = LedgerBooks["categories"][number];

export interface CategoryNode extends Category {
    children: Category[];
}

export const MAX_EXPENSE_CATEGORIES = 24;
export const INCOME_COLOR = "#3FD99B";

const NO_SCOPE = { accounts: [] };
const MONTHS_CHARTED = 5;
const MONTHS_COMPARED = 3;

export function categoryTree(rows: readonly Category[], income: boolean): CategoryNode[] {
    const sorted = liveCategories(rows)
        .filter((row) => row.income === income)
        .toSorted((a, b) => a.sortOrder - b.sortOrder);
    return sorted
        .filter((row) => row.parentId === null)
        .map((parent) => ({ ...parent, children: sorted.filter((row) => row.parentId === parent.localId) }));
}

export type CategoryProblem =
    | "duplicate"
    | "duplicateEmoji"
    | "duplicateIcon"
    | "duplicateName"
    | "incomplete"
    | "missingIcon"
    | "missingName";

export function categoryProblem(
    rows: readonly Category[],
    draft: { emoji: string | null; icon: string | null; income: boolean; name: string },
    stored: Pick<Category, "emoji" | "icon" | "localId"> | null
): CategoryProblem | null {
    const name = capitalizeCategoryName(draft.name);
    const symbolMissing = !(draft.icon || draft.emoji);
    const symbolRequired = stored === null || Boolean(stored.icon || stored.emoji);
    if (name === "") {
        return symbolMissing && symbolRequired ? "incomplete" : "missingName";
    }
    if (symbolMissing && symbolRequired) {
        return "missingIcon";
    }
    const siblings = liveCategories(rows).filter(
        (row) => row.income === draft.income && row.localId !== stored?.localId
    );
    return detectCategoryCollision({ emoji: draft.emoji ?? "", icon: draft.icon ?? "", name }, siblings);
}

export interface CategoryFigures {
    allTime: number;
    count: number;
    months: readonly { amount: number; key: string }[];
    rows: readonly LedgerRow[];
    share: number;
    spent: number;
    typical: number | null;
}

const within = (rows: readonly LedgerRow[], from: Period) =>
    rows.filter((row) => row.day >= from.from && row.day <= from.to);

export function categoryFigures(ledger: Ledger, category: Category, period: Period): CategoryFigures {
    const pool = rowsOf(ledger, NO_SCOPE, category.income);
    const mine = pool.filter((row) =>
        category.parentId === null ? row.topId === category.localId : row.categoryId === category.localId
    );
    const rows = within(mine, period);
    const spent = total(ledger, rows);
    const everything = total(ledger, within(pool, period));
    const firstDay = mine.reduce((first, row) => (row.day < first ? row.day : first), ledger.today);
    const months = Array.from({ length: MONTHS_CHARTED }, (_, index) => {
        const each = periodOf(shiftPeriodKey(period.key, index + 1 - MONTHS_CHARTED), ledger.firstDayOfMonth);
        return { amount: total(ledger, within(mine, each)), from: each.from, key: each.key };
    });
    const compared = months.slice(-1 - MONTHS_COMPARED, -1).filter((month) => month.from >= firstDay);
    return {
        allTime: mine.length,
        count: rows.length,
        months,
        rows: rows.toSorted((a, b) => b.at - a.at),
        share: everything > 0 ? spent / everything : 0,
        spent,
        typical:
            compared.length === 0 ? null : compared.reduce((sum, month) => sum + month.amount, 0) / compared.length,
    };
}

export interface CategoryLine {
    entries: number;
    spent: number;
}

export function categoryLines(ledger: Ledger, income: boolean, period: Period) {
    const lines = new Map<string, { entries: number; rows: LedgerRow[] }>();
    const add = (id: string, row: LedgerRow) => {
        const line = lines.get(id) ?? { entries: 0, rows: [] };
        line.entries += 1;
        if (row.day >= period.from && row.day <= period.to) {
            line.rows.push(row);
        }
        lines.set(id, line);
    };
    for (const row of rowsOf(ledger, NO_SCOPE, income)) {
        if (row.topId !== UNCATEGORIZED_ID) {
            add(row.topId, row);
        }
        if (row.categoryId !== null && row.categoryId !== row.topId) {
            add(row.categoryId, row);
        }
    }
    return new Map(
        [...lines].map(([id, line]): [string, CategoryLine] => [
            id,
            { entries: line.entries, spent: total(ledger, line.rows) },
        ])
    );
}
