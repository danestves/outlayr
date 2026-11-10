import type { LedgerBooks } from "@outlayr/backend/confect/ledgerView";
import type { PushRow } from "@outlayr/backend/confect/sync";
import { formatCategoryName } from "@outlayr/money/category-rules";
import { categoryDeletionPlan } from "@outlayr/money/entry-deletion";

import { planBooks, withId } from "./account-writes";
import { takenWith, tombstonesOf } from "./delete-writes";

type Category = LedgerBooks["categories"][number];
type Budget = LedgerBooks["budgets"][number];
type Entry = LedgerBooks["transactions"][number];

export interface PlanRow {
    fields: { amount: number | null; categoryId: string; currency: string | null; month: number };
    localId: string;
    restoredAt?: number | null;
}

export const liveCategories = (rows: readonly Category[]) => rows.filter((row) => row.deletedAt === null);

export const nextSortOrder = (rows: readonly Category[], income: boolean, parentId: string | null) =>
    liveCategories(rows)
        .filter((row) => row.income === income && row.parentId === parentId)
        .reduce((highest, row) => Math.max(highest, row.sortOrder), -1) + 1;

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

type DeletionBooks = Pick<LedgerBooks, "budgets" | "categories"> & Parameters<typeof planBooks>[0];

export function deletionOf(books: DeletionBooks, id: string) {
    const target = books.categories.find((row) => row.localId === id && row.deletedAt === null);
    if (!target) {
        return null;
    }
    // Budget plans are not in the browser's books: the caller fetches this category's and adds `deletedPlans`.
    const plan = categoryDeletionPlan(
        { ...planBooks(books), budgetPlans: [], budgets: withId(books.budgets), categories: withId(books.categories) },
        id
    );
    const entries = books.transactions.filter((row) => row.categoryId === id && plan.transactions.has(row.localId));
    return {
        budgets: books.budgets.filter((row) => plan.budgets.has(row.localId)),
        children: books.categories.filter((row) => plan.detached.categories.has(row.localId)),
        entries,
        taken: takenWith(books, plan, new Set(entries.map((row) => row.localId))),
        target,
    };
}

type Deletion = NonNullable<ReturnType<typeof deletionOf>>;

export const deletedPlans = (plans: readonly PlanRow[], now: number) =>
    plans.map((plan): PushRow => ({
        deletedAt: now,
        fields: plan.fields,
        localId: plan.localId,
        restoredAt: plan.restoredAt,
        table: "budgetPlans",
        updatedAt: now,
    }));

export function deletionRows(deletion: Deletion, plans: readonly PlanRow[], now: number): PushRow[] {
    const stamp = { deletedAt: now, updatedAt: now };
    return [
        ...tombstonesOf(deletion.taken, now),
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
        ...deletedPlans(plans, now),
        ...deletion.children.map((doc) => categoryPush({ ...doc, parentId: null, updatedAt: now })),
        categoryPush({ ...deletion.target, ...stamp }),
    ];
}

export function reorderedCategories(rows: readonly Category[], orderedIds: readonly string[], now: number) {
    const byId = new Map(rows.map((row) => [row.localId, row]));
    return orderedIds.flatMap((id, sortOrder) => {
        const doc = byId.get(id);
        return doc && doc.sortOrder !== sortOrder ? [categoryPush({ ...doc, sortOrder, updatedAt: now })] : [];
    });
}
