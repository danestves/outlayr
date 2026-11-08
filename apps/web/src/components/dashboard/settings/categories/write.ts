import type { PushRow } from "@outlayr/backend/confect/sync";
import { api } from "@outlayr/backend/convex/_generated/api";
import { createTransaction } from "@tanstack/react-db";
import { useRouteContext } from "@tanstack/react-router";
import { createToaster } from "panelui-web/toast";
import { useIntlayer } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { convexClient } from "@/lib/convex";
import { ledgerCollections } from "@/lib/ledger-db";
import { pushRows } from "@/lib/ledger-write";

import { categoryPush, deletionOf, deletionRows, editedCategory, newCategory } from "./model";
import type { Category, CategoryDraft, PlanRow } from "./model";

const UNDO_MS = 10_000;

export const settingsToasts = createToaster();

async function budgetPlansOf(categoryId: string) {
    const plans: PlanRow[] = [];
    let cursor = 0;
    let more = true;
    while (more) {
        // oxlint-disable-next-line no-await-in-loop -- each page starts at the previous page's cursor.
        const page = await convexClient().query(api.sync.pullSince, { cursor, tables: ["budgetPlans"] });
        for (const row of page.rows) {
            if (row.deletedAt === null && row.fields.categoryId === categoryId) {
                plans.push({
                    fields: {
                        amount: row.fields.amount,
                        categoryId,
                        currency: row.fields.currency,
                        month: row.fields.month,
                    },
                    localId: row.localId,
                });
            }
        }
        ({ cursor } = page);
        more = page.hasMore;
    }
    return plans;
}

let settleHeldDelete: (() => void) | null = null;

export function useCategoryWrites() {
    const { dbClient } = useRouteContext({ from: "__root__" });
    const { ledger } = useDashboard();
    const copy = useIntlayer("dashboard-categories");
    const collection = dbClient.collection(ledgerCollections.categories);
    const rows = ledger.books.categories;

    const commit = (push: readonly PushRow[], paint: () => void) => {
        const transaction = createTransaction({
            autoCommit: false,
            mutationFn: async () => {
                await pushRows(dbClient, push);
                await collection.utils.awaitSync();
            },
        });
        transaction.mutate(paint);
        transaction.commit().catch(() => {
            settingsToasts.add({ title: copy.failed.value, type: "destructive" });
        });
    };

    const add = (draft: CategoryDraft) => {
        const made = newCategory(rows, draft, crypto.randomUUID(), Date.now());
        commit([categoryPush(made)], () => collection.insert(made));
        return made.localId;
    };

    const update = (doc: Category, draft: CategoryDraft) => {
        const edited = editedCategory(rows, doc, draft, Date.now());
        const push = categoryPush(edited);
        commit([push], () =>
            collection.update(doc.localId, (row) => {
                Object.assign(row, push.fields, { updatedAt: edited.updatedAt });
            })
        );
    };

    const reorder = (orderedIds: readonly string[]) => {
        const now = Date.now();
        const byId = new Map(rows.map((row) => [row.localId, row]));
        const changed = orderedIds.flatMap((id, sortOrder) => {
            const doc = byId.get(id);
            return doc && doc.sortOrder !== sortOrder ? [{ ...doc, sortOrder, updatedAt: now }] : [];
        });
        if (changed.length === 0) {
            return;
        }
        commit(changed.map(categoryPush), () => {
            for (const doc of changed) {
                collection.update(doc.localId, (row) => {
                    row.sortOrder = doc.sortOrder;
                    row.updatedAt = doc.updatedAt;
                });
            }
        });
    };

    const remove = (id: string) => {
        settleHeldDelete?.();
        const deletion = deletionOf(ledger.books, id);
        if (!deletion) {
            return;
        }
        const entries = dbClient.collection(ledgerCollections.transactions);
        const budgets = dbClient.collection(ledgerCollections.budgets);
        const transaction = createTransaction({
            autoCommit: false,
            mutationFn: async () => {
                await pushRows(dbClient, deletionRows(deletion, await budgetPlansOf(id), Date.now()));
                await Promise.all([collection.utils.awaitSync(), entries.utils.awaitSync(), budgets.utils.awaitSync()]);
            },
        });
        transaction.mutate(() => {
            if (deletion.entries.length > 0) {
                entries.delete(deletion.entries.map((row) => row._id));
            }
            if (deletion.budgets.length > 0) {
                budgets.delete(deletion.budgets.map((row) => row._id));
            }
            for (const child of deletion.children) {
                collection.update(child.localId, (row) => {
                    row.parentId = null;
                });
            }
            collection.delete(id);
        });
        let toastId = "";
        const finish = () => {
            clearTimeout(timer);
            settleHeldDelete = null;
            settingsToasts.close(toastId);
        };
        function settle() {
            finish();
            transaction.commit().catch(() => {
                settingsToasts.add({ title: copy.deleteFailed.value, type: "destructive" });
            });
        }
        const timer = setTimeout(settle, UNDO_MS);
        settleHeldDelete = settle;
        toastId = settingsToasts.add({
            actionProps: {
                children: copy.undo.value,
                onClick: () => {
                    finish();
                    transaction.rollback();
                },
            },
            description: deletion.children.length > 0 ? copy.undoBodyWithChildren.value : copy.undoBody.value,
            timeout: UNDO_MS,
            title: copy.deleted.value,
        });
    };

    return { add, remove, reorder, update };
}
