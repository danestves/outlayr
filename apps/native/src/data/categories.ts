import { valueCell } from "@outlayr/money/currency-totals";
import { and, asc, eq, isNull } from "drizzle-orm";
import { useMemo } from "react";

import type { Database } from "@/db/client";
import { categories, transactions } from "@/db/schema";

import type { Category, CategoryWithChildren } from "./categories-core";
import { categoryCellQuery, toCurrencyCell } from "./cell-query";
import { useLiveQuery } from "./live-query";
import { useValuation } from "./use-valuation";

export interface CategoryMetaRow {
    color: string | null;
    emoji: string | null;
    icon: string | null;
    name: string | null;
    parentId: string | null;
}

// Never join these onto a transaction or budget query: `useLiveQuery` listens to one table, so a joined `parentId`
// goes stale and `contributesTo` credits spend to the old parent's budget while the legend updates.
export function useCategoryMeta(db: Database): Map<string, CategoryMetaRow> {
    const rows = useLiveQuery(categories, () =>
        db
            .select({
                color: categories.color,
                emoji: categories.emoji,
                icon: categories.icon,
                id: categories.id,
                name: categories.name,
                parentId: categories.parentId,
            })
            .from(categories)
            .where(isNull(categories.deletedAt))
    );
    return useMemo(() => {
        const byId = new Map<string, CategoryMetaRow>();
        for (const row of rows) {
            byId.set(row.id, {
                color: row.color,
                emoji: row.emoji,
                icon: row.icon,
                name: row.name,
                parentId: row.parentId,
            });
        }
        return byId;
    }, [rows]);
}

// All-time and unfiltered by date, like Swift's `Category.allTransactions`. Each entry is the category's own spend;
// the caller composes a parent's rolled-up figure.
export function useCategoryTotals(db: Database): Map<string, number> {
    // Grouped in SQL, since reducing every transaction in JS each re-run is too slow. Currency and day stay in the
    // grouping because each part converts at its own day's rate.
    const rows = useLiveQuery(transactions, () => categoryCellQuery(db));
    const { displayCurrency, rates } = useValuation(db);
    return useMemo(() => {
        const totals = new Map<string, number>();
        for (const row of rows) {
            if (row.categoryId == null) {
                continue;
            }
            const cell = toCurrencyCell(row);
            const previous = totals.get(row.categoryId) ?? 0;
            totals.set(row.categoryId, previous + valueCell(cell, displayCurrency, rates));
        }
        return totals;
    }, [rows, displayCurrency, rates]);
}

export function useCategoriesByNamespace(db: Database, income: boolean): CategoryWithChildren[] {
    // SAFETY: the table argument pins the row type.
    const rows = useLiveQuery(
        categories,
        () =>
            db
                .select()
                .from(categories)
                .where(and(eq(categories.income, income), isNull(categories.deletedAt)))
                .orderBy(asc(categories.sortOrder)),
        [income]
    ) as Category[];
    // Memoized for stable identities: the picker's rows are `memo`'d, so fresh parents re-render every keystroke.
    return useMemo(() => {
        const parents = rows.filter((row) => row.parentId == null);
        const childrenByParent = new Map<string, Category[]>();
        for (const row of rows) {
            if (row.parentId != null) {
                const bucket = childrenByParent.get(row.parentId) ?? [];
                bucket.push(row);
                childrenByParent.set(row.parentId, bucket);
            }
        }
        return parents.map((parent) => ({
            ...parent,
            children: childrenByParent.get(parent.id) ?? [],
        }));
    }, [rows]);
}
