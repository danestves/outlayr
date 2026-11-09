import type { PushRow } from "@outlayr/backend/confect/sync";
import { api } from "@outlayr/backend/convex/_generated/api";
import { createToaster } from "panelui-web/toast";
import { useIntlayer } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { useLedgerCommitter } from "@/components/dashboard/shell/ledger-committer";
import {
    categoryPush,
    deletedPlans,
    deletionOf,
    deletionRows,
    editedCategory,
    newCategory,
    reorderedCategories,
} from "@/lib/category-writes";
import type { CategoryDraft, PlanRow } from "@/lib/category-writes";
import { convexClient } from "@/lib/convex";

import type { Category } from "./model";

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
                    restoredAt: row.restoredAt,
                });
            }
        }
        ({ cursor } = page);
        more = page.hasMore;
    }
    return plans;
}

let flushHeldDelete: (() => void) | null = null;

export function useCategoryWrites() {
    const committer = useLedgerCommitter();
    const { ledger } = useDashboard();
    const copy = useIntlayer("dashboard-categories");
    const rows = ledger.books.categories;

    const commit = async (push: readonly PushRow[], failed: string) => {
        const outcome = await committer.commit(push).settled;
        if (outcome.status === "failed") {
            settingsToasts.add({ title: failed, type: "destructive" });
        }
    };

    const add = (draft: CategoryDraft) => {
        const made = newCategory(rows, draft, crypto.randomUUID(), Date.now());
        void commit([categoryPush(made)], copy.failed.value);
        return made.localId;
    };

    const update = (doc: Category, draft: CategoryDraft) => {
        void commit([categoryPush(editedCategory(rows, doc, draft, Date.now()))], copy.failed.value);
    };

    const reorder = (orderedIds: readonly string[]) => {
        const changed = reorderedCategories(rows, orderedIds, Date.now());
        if (changed.length > 0) {
            void commit(changed, copy.failed.value);
        }
    };

    const remove = (id: string) => {
        flushHeldDelete?.();
        const deletion = deletionOf(ledger.books, id);
        if (!deletion) {
            return;
        }
        const now = Date.now();
        const held = committer.commit(deletionRows(deletion, [], now), { holdMs: UNDO_MS });
        let toastId = "";
        const closeToast = () => {
            clearTimeout(closing);
            settingsToasts.close(toastId);
        };
        const closing = setTimeout(closeToast, UNDO_MS);
        const failed = () => {
            closeToast();
            settingsToasts.add({ title: copy.deleteFailed.value, type: "destructive" });
        };
        flushHeldDelete = () => {
            closeToast();
            void held.flush();
        };
        toastId = settingsToasts.add({
            actionProps: {
                children: copy.undo.value,
                onClick: () => {
                    closeToast();
                    held.undo();
                },
            },
            description: deletion.children.length > 0 ? copy.undoBodyWithChildren.value : copy.undoBody.value,
            timeout: UNDO_MS,
            title: copy.deleted.value,
        });
        const settle = async () => {
            const plans = await budgetPlansOf(id).then(
                (found) => deletedPlans(found, now),
                () => null
            );
            if (plans === null) {
                held.undo();
                failed();
                return;
            }
            const joined = plans.length === 0 || held.add(plans);
            const outcome = await held.settled;
            if (outcome.status === "failed") {
                failed();
            } else if (outcome.status === "saved" && !joined) {
                await commit(plans, copy.deleteFailed.value);
            }
        };
        void settle();
    };

    return { add, remove, reorder, update };
}
