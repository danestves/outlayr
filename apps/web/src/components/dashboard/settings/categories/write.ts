import { api } from "@outlayr/backend/convex/_generated/api";
import { createToaster } from "panelui-web/toast";
import { useIntlayer } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { useLedgerCommitter } from "@/components/dashboard/shell/ledger-committer";
import type { ToastSurface } from "@/components/dashboard/shell/ledger-committer";
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

export const settingsToasts = createToaster();

export const settingsNotices: ToastSurface = { holdMs: 10_000, toasts: settingsToasts };

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
    const committer = useLedgerCommitter(settingsNotices);
    const { ledger } = useDashboard();
    const copy = useIntlayer("dashboard-categories");
    const rows = ledger.books.categories;

    const add = (draft: CategoryDraft) => {
        const made = newCategory(rows, draft, crypto.randomUUID(), Date.now());
        void committer.commit([categoryPush(made)], { failed: copy.failed.value });
        return made.localId;
    };

    const update = (doc: Category, draft: CategoryDraft) => {
        const edited = categoryPush(editedCategory(rows, doc, draft, Date.now()));
        void committer.commit([edited], { failed: copy.failed.value });
    };

    const reorder = (orderedIds: readonly string[]) => {
        const changed = reorderedCategories(rows, orderedIds, Date.now());
        if (changed.length > 0) {
            void committer.commit(changed, { failed: copy.failed.value });
        }
    };

    const remove = (id: string) => {
        flushHeldDelete?.();
        const deletion = deletionOf(ledger.books, id);
        if (!deletion) {
            return;
        }
        const now = Date.now();
        const held = committer.commitWithUndo(deletionRows(deletion, [], now), {
            detail: deletion.children.length > 0 ? copy.undoBodyWithChildren.value : copy.undoBody.value,
            failed: copy.deleteFailed.value,
            text: copy.deleted.value,
        });
        flushHeldDelete = () => {
            void held.flush();
        };
        const settle = async () => {
            const plans = await budgetPlansOf(id).then(
                (found) => deletedPlans(found, now),
                () => null
            );
            if (plans === null) {
                held.undo();
                committer.notify({ failed: true, text: copy.deleteFailed.value });
                return;
            }
            const joined = plans.length === 0 || held.add(plans);
            const outcome = await held.settled;
            if (outcome.status === "saved" && !joined) {
                await committer.commit(plans, { failed: copy.deleteFailed.value });
            }
        };
        void settle();
    };

    return { add, remove, reorder, update };
}
