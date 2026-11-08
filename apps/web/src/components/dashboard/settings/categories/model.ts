import type { LedgerBooks } from "@outlayr/backend/confect/ledgerView";
import type { PushRow } from "@outlayr/backend/confect/sync";
import { capitalizeCategoryName, detectCategoryCollision, formatCategoryName } from "@outlayr/money/category-rules";

import { rowsOf, total, UNCATEGORIZED_ID } from "../../../../lib/dashboard-series-ledger";
import type { Ledger, LedgerRow } from "../../../../lib/dashboard-series-ledger";
import { periodOf, shiftPeriodKey } from "../../../../lib/dashboard-series-period";
import type { Period } from "../../../../lib/dashboard-series-period";

export type Category = LedgerBooks["categories"][number];
type Budget = LedgerBooks["budgets"][number];
type Entry = LedgerBooks["transactions"][number];

export interface CategoryNode extends Category {
    children: Category[];
}

export interface PlanRow {
    fields: { amount: number | null; categoryId: string; currency: string | null; month: number };
    localId: string;
    restoredAt?: number | null;
}

export const MAX_EXPENSE_CATEGORIES = 24;
export const INCOME_COLOR = "#3FD99B";

const NO_SCOPE = { accounts: [] };
const MONTHS_CHARTED = 5;
const MONTHS_COMPARED = 3;

export const liveCategories = (rows: readonly Category[]) => rows.filter((row) => row.deletedAt === null);

export function categoryTree(rows: readonly Category[], income: boolean): CategoryNode[] {
    const sorted = liveCategories(rows)
        .filter((row) => row.income === income)
        .toSorted((a, b) => a.sortOrder - b.sortOrder);
    return sorted
        .filter((row) => row.parentId === null)
        .map((parent) => ({ ...parent, children: sorted.filter((row) => row.parentId === parent.localId) }));
}

export const nextSortOrder = (rows: readonly Category[], income: boolean, parentId: string | null) =>
    liveCategories(rows)
        .filter((row) => row.income === income && row.parentId === parentId)
        .reduce((highest, row) => Math.max(highest, row.sortOrder), -1) + 1;

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

function wireFields<Doc extends Budget | Entry>(doc: Doc) {
    const {
        _creationTime,
        _id,
        deletedAt: _deletedAt,
        deviceId: _deviceId,
        localId: _localId,
        restoredAt: _restoredAt,
        seq: _seq,
        updatedAt: _updatedAt,
        userId: _userId,
        ...rest
    } = doc;
    // SAFETY: this only drops keys. Live query rows carry $key and $origin, which the types omit and Convex rejects.
    return Object.fromEntries(Object.entries(rest).filter(([key]) => !key.startsWith("$"))) as typeof rest;
}

export const categoryPush = (doc: Category): PushRow => ({
    deletedAt: doc.deletedAt,
    fields: {
        color: doc.color,
        customName: doc.customName,
        dateCreated: doc.dateCreated,
        emoji: doc.emoji,
        icon: doc.icon,
        income: doc.income,
        name: doc.name,
        parentId: doc.parentId,
        preset: doc.preset,
        sortOrder: doc.sortOrder,
    },
    localId: doc.localId,
    restoredAt: doc.restoredAt,
    table: "categories",
    updatedAt: doc.updatedAt,
});

export interface CategoryDraft {
    color: string;
    emoji: string | null;
    icon: string | null;
    income: boolean;
    name: string;
    parentId: string | null;
    preset: string | null;
}

export function newCategory(rows: readonly Category[], draft: CategoryDraft, localId: string, now: number): Category {
    // SAFETY: optimistic until the sync hands back the server's row under the same localId, the collection's key.
    return {
        _creationTime: now,
        _id: localId as Category["_id"],
        color: draft.color,
        customName: draft.preset === null,
        dateCreated: now,
        deletedAt: null,
        deviceId: "",
        emoji: draft.emoji,
        icon: draft.icon,
        income: draft.income,
        localId,
        name: draft.preset === null ? formatCategoryName(draft.name) : draft.name.trim(),
        parentId: draft.parentId,
        preset: draft.preset,
        seq: 0,
        sortOrder: nextSortOrder(rows, draft.income, draft.parentId),
        updatedAt: now,
        userId: "",
    } as Category;
}

export function editedCategory(rows: readonly Category[], doc: Category, draft: CategoryDraft, now: number): Category {
    const name = formatCategoryName(draft.name);
    const moved = doc.parentId !== draft.parentId;
    return {
        ...doc,
        color: draft.color,
        customName: name === doc.name ? doc.customName : true,
        emoji: draft.emoji,
        icon: draft.icon,
        income: draft.income,
        name,
        parentId: draft.parentId,
        sortOrder: moved ? nextSortOrder(rows, draft.income, draft.parentId) : doc.sortOrder,
        updatedAt: now,
    };
}

export function deletionOf(books: Pick<LedgerBooks, "budgets" | "categories" | "transactions">, id: string) {
    const target = books.categories.find((row) => row.localId === id && row.deletedAt === null);
    if (!target) {
        return null;
    }
    return {
        budgets: books.budgets.filter((row) => row.categoryId === id && row.deletedAt === null),
        children: books.categories.filter((row) => row.parentId === id && row.deletedAt === null),
        entries: books.transactions.filter((row) => row.categoryId === id && row.deletedAt === null),
        target,
    };
}

type Deletion = NonNullable<ReturnType<typeof deletionOf>>;

export function deletionRows(deletion: Deletion, plans: readonly PlanRow[], now: number): PushRow[] {
    const stamp = { deletedAt: now, updatedAt: now };
    return [
        ...deletion.entries.map((doc): PushRow => {
            const fields = wireFields<Entry>(doc);
            return {
                ...stamp,
                fields: { ...fields, accountId: fields.accountId ?? null, imageKey: null, recurringType: 0 },
                localId: doc.localId,
                restoredAt: doc.restoredAt,
                table: "transactions",
            };
        }),
        ...deletion.budgets.map((doc): PushRow => ({
            ...stamp,
            fields: {
                amount: 0,
                amountUsd: null,
                categoryId: null,
                currency: null,
                dateCreated: null,
                green: false,
                name: null,
                rollover: false,
                startDate: null,
                type: 0,
            },
            localId: doc.localId,
            restoredAt: doc.restoredAt,
            table: "budgets",
        })),
        ...plans.map((plan): PushRow => ({
            ...stamp,
            fields: plan.fields,
            localId: plan.localId,
            restoredAt: plan.restoredAt,
            table: "budgetPlans",
        })),
        ...deletion.children.map((doc) => categoryPush({ ...doc, parentId: null, updatedAt: now })),
        categoryPush({ ...deletion.target, ...stamp }),
    ];
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
