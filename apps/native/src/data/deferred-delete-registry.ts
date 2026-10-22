import { eq } from "drizzle-orm";

import type { Database } from "@/db/client";
import { mainBudget, outsideMoves } from "@/db/schema";
import { createDeferredDelete } from "@/domain/deferred-delete";
import type { DeferredDeleteController } from "@/domain/deferred-delete";
import type { TranslatableKey } from "@/i18n/catalog";
import { translateNow } from "@/i18n/runtime";
import { dismissNotice, notifyFailure, notifyUndoable } from "@/lib/notify";

import { accountsRepo } from "./accounts-core";
import { budgetsRepo } from "./budgets-core";
import { categoriesRepo } from "./categories-core";
import { deleteOutsideMove } from "./debts-core";
import { savingsGoalsRepo } from "./savings-goals-core";
import { transactionsRepo } from "./transactions-core";
import { transfersRepo } from "./transfers-core";

export const UNDO_WINDOW_MS = 10_000;

// `recurring` ends a schedule rather than deleting, but it is irreversible once written and wants the same window.
export type DeferredDeleteKind = "account" | "budget" | "category" | "goal" | "recurring" | "row";

interface KindSpec {
    commit: (db: Database, id: string) => Promise<void>;
    failedBody: TranslatableKey;
    failedTitle: TranslatableKey;
    undoTitle: TranslatableKey;
}

// The table is read at commit time, not passed in: a caller's list filtered inside the window gets it wrong, and
// removing a transfer as a transaction updates zero rows and rejects nothing.
async function commitRow(db: Database, id: string): Promise<void> {
    if (await transfersRepo.getById(db, id)) {
        await transfersRepo.softDelete(db, id);
        return;
    }
    const [move] = await db.select({ id: outsideMoves.id }).from(outsideMoves).where(eq(outsideMoves.id, id));
    await (move ? deleteOutsideMove(db, id) : transactionsRepo.remove(db, id));
}

async function commitBudget(db: Database, id: string): Promise<void> {
    const [overall] = await db.select({ id: mainBudget.id }).from(mainBudget).where(eq(mainBudget.id, id));
    await (overall ? budgetsRepo.deleteMainBudget(db, id) : budgetsRepo.deleteBudget(db, id));
}

const SPECS = {
    account: {
        commit: (db, id) => accountsRepo.softDelete(db, id),
        failedBody: "accounts.error.generic",
        failedTitle: "accounts.error.deleteTitle",
        undoTitle: "accounts.undo.deleted",
    },
    budget: {
        commit: commitBudget,
        failedBody: "budgets.delete.failedBody",
        failedTitle: "budgets.delete.failedTitle",
        undoTitle: "budgets.undo.deleted",
    },
    category: {
        commit: (db, id) => categoriesRepo.remove(db, id),
        failedBody: "categories.error.generic",
        failedTitle: "categories.error.deleteTitle",
        undoTitle: "categories.undo.deleted",
    },
    goal: {
        commit: (db, id) => savingsGoalsRepo.remove(db, id),
        failedBody: "goals.failedBody",
        failedTitle: "goals.failedTitle",
        undoTitle: "goals.undo.deleted",
    },
    recurring: {
        commit: (db, id) => transactionsRepo.stopRecurring(db, id),
        failedBody: "transaction.stopRecurring.failedBody",
        failedTitle: "transaction.stopRecurring.failedTitle",
        undoTitle: "transaction.stopRecurring.stopped",
    },
    row: {
        commit: commitRow,
        failedBody: "log.delete.failedBody",
        failedTitle: "log.delete.failedTitle",
        undoTitle: "log.undo.deleted",
    },
} satisfies Record<DeferredDeleteKind, KindSpec>;

export interface DeferredDeleteRegistry {
    attachDatabase: (db: Database | null) => void;
    flushAll: () => Promise<void>;
    pendingId: (kind: DeferredDeleteKind) => string | null;
    requestDelete: (kind: DeferredDeleteKind, id: string, body?: string) => void;
    subscribe: (kind: DeferredDeleteKind, listener: () => void) => () => void;
}

interface Slot {
    controller: DeferredDeleteController;
    listeners: Set<() => void>;
    setBody: (next: string | undefined) => void;
}

// Not React on purpose: the window outlives the screen that opened it (a detail screen navigates straight back), and
// a screen-owned controller would flush on the way out.
export function createDeferredDeleteRegistry(): DeferredDeleteRegistry {
    const slots = new Map<DeferredDeleteKind, Slot>();
    // Held, not captured per request: a delete lands in the database the app is on when its window closes.
    let database: Database | null = null;

    function build(kind: DeferredDeleteKind): Slot {
        const spec = SPECS[kind];
        const listeners = new Set<() => void>();
        let body: string | undefined;
        let toastId: string | null = null;
        let toastFor: string | null = null;

        const controller = createDeferredDelete({
            commit: async (id) => {
                const db = database;
                if (db === null) {
                    throw new Error("The local database went away before the delete could be written");
                }
                await spec.commit(db, id);
            },
            onChange: (next) => {
                // Keyed on the id, not null-ness: a second delete replaces the first, and reusing its toast would
                // expire the new row's undo on the old row's clock.
                if (next.pendingId !== toastFor) {
                    if (toastId !== null) {
                        dismissNotice(toastId);
                    }
                    toastFor = next.pendingId;
                    toastId =
                        next.pendingId === null
                            ? null
                            : notifyUndoable({
                                  actionLabel: translateNow("common.undo"),
                                  body,
                                  duration: UNDO_WINDOW_MS,
                                  onActionPress: () => controller.undo(),
                                  title: translateNow(spec.undoTitle),
                              });
                }
                if (next.failedId !== null) {
                    notifyFailure({
                        body: translateNow(spec.failedBody),
                        title: translateNow(spec.failedTitle),
                    });
                    // The controller holds a failure until acknowledged, so leaving it set re-raises it next publish.
                    controller.acknowledgeFailure();
                }
                for (const listener of listeners) {
                    listener();
                }
            },
            timers: {
                clear: (handle: ReturnType<typeof setTimeout>) => {
                    clearTimeout(handle);
                },
                set: (run: () => void, ms: number) => setTimeout(run, ms),
            },
            windowMs: UNDO_WINDOW_MS,
        });

        return {
            controller,
            listeners,
            setBody: (next) => {
                body = next;
            },
        };
    }

    function slotFor(kind: DeferredDeleteKind): Slot {
        const existing = slots.get(kind);
        if (existing) {
            return existing;
        }
        const created = build(kind);
        slots.set(kind, created);
        return created;
    }

    return {
        attachDatabase: (db) => {
            database = db;
        },
        flushAll: async () => {
            await Promise.all(Array.from(slots.values(), (slot) => slot.controller.flush()));
        },
        pendingId: (kind) => slots.get(kind)?.controller.snapshot.pendingId ?? null,
        requestDelete: (kind, id, body) => {
            const slot = slotFor(kind);
            slot.setBody(body);
            slot.controller.requestDelete(id);
        },
        subscribe: (kind, listener) => {
            const slot = slotFor(kind);
            slot.listeners.add(listener);
            return () => {
                slot.listeners.delete(listener);
            };
        },
    };
}
