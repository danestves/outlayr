import { TOMBSTONED_BUDGET } from "@outlayr/money/erase";
import { RECURRING_TYPE } from "@outlayr/money/recurrence";
import { and, eq, inArray, isNotNull, isNull, notInArray, or, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { QueryBuilder } from "drizzle-orm/sqlite-core";
import type { AnySQLiteColumn, SQLiteTable } from "drizzle-orm/sqlite-core";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import type { Database } from "@/db/client";
import {
    accounts,
    budgetPlans,
    budgets,
    categories,
    installmentPlans,
    installments,
    outsideMoves,
    outsidePayments,
    savingsGoals,
    transactions,
    transfers,
} from "@/db/schema";

const TABLE_NAMES = [
    "transactions",
    "transfers",
    "installments",
    "outsidePayments",
    "installmentPlans",
    "outsideMoves",
    "savingsGoals",
    "budgets",
    "budgetPlans",
    "categories",
    "accounts",
] as const;

export type DeletionTable = (typeof TABLE_NAMES)[number];

const TABLES = {
    accounts,
    budgetPlans,
    budgets,
    categories,
    installmentPlans,
    installments,
    outsideMoves,
    outsidePayments,
    savingsGoals,
    transactions,
    transfers,
} satisfies Record<DeletionTable, SQLiteTable>;

const RESTORED_CHILDREN_FIRST = ["transactions", "installments", "outsidePayments", "installmentPlans"] as const;

type Standing = (table: (typeof TABLES)[DeletionTable]) => SQL | undefined;

type Named = (id: AnySQLiteColumn) => SQL;

interface Plan {
    detached?: { categories?: SQL | undefined; transactions?: SQL | undefined; transfers?: SQL | undefined };
    gone: { [Table in DeletionTable]?: SQL | undefined };
    retired?: { columns: Partial<typeof transactions.$inferInsert>; entries: SQL };
}

const subquery = new QueryBuilder();

function ordersGone(which: SQL, standing: Standing) {
    const orders = subquery
        .select({ id: installmentPlans.id })
        .from(installmentPlans)
        .where(and(standing(installmentPlans), which));
    return {
        gone: {
            installmentPlans: which,
            installments: inArray(installments.planId, orders),
            outsidePayments: inArray(outsidePayments.planId, orders),
        },
        orders,
    };
}

// Each named entry or transfer goes as its own delete would take it. Payments stay linked to the order, so a restore
// can bring it back.
function namedGone(named: Named, standing: Standing) {
    // A fee outliving its transfer would keep charging for a movement the ledger no longer holds.
    const carried = subquery
        .select({ id: transactions.transferId })
        .from(transactions)
        .where(and(standing(transactions), named(transactions.id), isNotNull(transactions.transferId)));
    const financed = ordersGone(named(installmentPlans.transactionId), standing);
    const cuotas = subquery
        .select({ id: installments.id })
        .from(installments)
        .where(and(standing(installments), inArray(installments.planId, financed.orders)));
    return {
        ...financed.gone,
        transactions: or(
            named(transactions.id),
            named(transactions.feeForId),
            named(transactions.transferId),
            inArray(transactions.transferId, carried),
            inArray(transactions.installmentId, cuotas)
        ),
        transfers: or(named(transfers.id), inArray(transfers.id, carried)),
    };
}

function rowPlan(id: string, standing: Standing): Plan {
    return {
        gone: { ...namedGone((column) => eq(column, id), standing), outsideMoves: eq(outsideMoves.id, id) },
        retired: {
            columns: { recurringType: RECURRING_TYPE.none, reminderLeadDays: null },
            entries: eq(transactions.id, id),
        },
    };
}

// The order goes entirely and its transfers are left as plain ones: the money did move.
function orderPlan(id: string, standing: Standing): Plan {
    const order = ordersGone(eq(installmentPlans.id, id), standing);
    return { detached: { transfers: inArray(transfers.installmentPlanId, order.orders) }, gone: order.gone };
}

/**
 * `onDelete: "set null"` never fires for a tombstone, so entries are detached here. A person's entries are the debt
 * itself, so they go with them (no schedule left for the orphan repair to revive), and so do the account's goals.
 */
function accountPlan(id: string, standing: Standing): Plan {
    // Read past the tombstone: a peer's delete may have landed first.
    const person = subquery
        .select({ id: accounts.id })
        .from(accounts)
        .where(and(eq(accounts.id, id), eq(accounts.kind, "person")));
    const owed = inArray(transactions.accountId, person);
    const held = subquery
        .select({ id: transactions.id })
        .from(transactions)
        .where(and(standing(transactions), owed));
    const touching = subquery
        .select({ id: transfers.id })
        .from(transfers)
        .where(and(standing(transfers), or(eq(transfers.fromAccountId, id), eq(transfers.toAccountId, id))));
    const named = namedGone((column) => inArray(column, touching.union(held)), standing);
    const owned = ordersGone(eq(installmentPlans.accountId, id), standing);
    return {
        detached: {
            transactions: and(eq(transactions.accountId, id), notInArray(transactions.accountId, person)),
            transfers: inArray(transfers.installmentPlanId, owned.orders),
        },
        gone: {
            ...named,
            accounts: eq(accounts.id, id),
            installmentPlans: or(named.installmentPlans, owned.gone.installmentPlans),
            installments: or(named.installments, owned.gone.installments),
            outsideMoves: eq(outsideMoves.accountId, id),
            outsidePayments: or(named.outsidePayments, owned.gone.outsidePayments),
            savingsGoals: eq(savingsGoals.accountId, id),
        },
        retired: { columns: { recurringType: RECURRING_TYPE.none, reminderLeadDays: null }, entries: owed },
    };
}

// By hand: `foreign_keys` is off, so `ON DELETE` never fires. Schedules retire so `repairOrphanedRecurrence` mints no
// successor, and photos drop so `reconcilePhotos` collects them.
function categoryPlan(id: string, standing: Standing): Plan {
    const filed = eq(transactions.categoryId, id);
    const entries = subquery
        .select({ id: transactions.id })
        .from(transactions)
        .where(and(standing(transactions), filed));
    return {
        detached: { categories: and(standing(categories), eq(categories.parentId, id)) },
        gone: {
            ...namedGone((column) => inArray(column, entries), standing),
            budgetPlans: eq(budgetPlans.categoryId, id),
            budgets: eq(budgets.categoryId, id),
            categories: eq(categories.id, id),
        },
        retired: {
            columns: { imageKey: null, imageUri: null, recurringType: RECURRING_TYPE.none },
            entries: filed,
        },
    };
}

const PLANS = { account: accountPlan, category: categoryPlan, plan: orderPlan, row: rowPlan };

export type DeletionKind = keyof typeof PLANS;

const UNDOABLE = ["account", "category", "row"] as const;

export type PendingDeletes = Record<(typeof UNDOABLE)[number], string | null>;

export const NO_PENDING_DELETES: PendingDeletes = { account: null, category: null, row: null };

const DeletionPlanOperation = Schema.Literals(["restore", "tombstone"]);

export class DeletionPlanError extends Schema.TaggedError<DeletionPlanError>()("DeletionPlanError", {
    cause: Schema.Defect(),
    operation: DeletionPlanOperation,
}) {
    override get message(): string {
        return `Deletion plan ${this.operation} failed`;
    }
}

const write = <A>(
    operation: typeof DeletionPlanOperation.Type,
    where: SQL | undefined,
    run: (where: SQL) => PromiseLike<A>
) =>
    where === undefined
        ? Effect.void
        : Effect.tryPromise({ catch: (cause) => new DeletionPlanError({ cause, operation }), try: () => run(where) });

/** Statements only: `withTransactionAsync` does not nest, so the caller supplies the transaction. */
export const tombstone = Effect.fn("DeletionPlan.tombstone")(function* tombstone(
    db: Database,
    kind: DeletionKind,
    id: string,
    now: Date
) {
    const stamp = { deletedAt: now, updatedAt: now };
    const { detached, gone, retired } = PLANS[kind](id, (table) =>
        or(isNull(table.deletedAt), eq(table.deletedAt, now))
    );
    yield* write("tombstone", retired?.entries, (entries) =>
        db
            .update(transactions)
            .set({ ...retired?.columns, ...stamp })
            .where(and(isNull(transactions.deletedAt), entries))
    );
    for (const name of TABLE_NAMES) {
        yield* write("tombstone", gone[name], (rows) => {
            if (name === "budgets") {
                // Fully tombstoned for peers before 0038, whose `budgets.categoryId` stays UNIQUE when deleted.
                return db
                    .update(budgets)
                    .set({ ...TOMBSTONED_BUDGET, ...stamp })
                    .where(and(isNull(budgets.deletedAt), rows));
            }
            const table = TABLES[name];
            return db
                .update(table)
                .set(stamp)
                .where(and(isNull(table.deletedAt), rows));
        });
    }
    yield* write("tombstone", detached?.transfers, (rows) =>
        db.update(transfers).set({ installmentPlanId: null, updatedAt: now }).where(rows)
    );
    yield* write("tombstone", detached?.transactions, (rows) =>
        db.update(transactions).set({ accountId: null, updatedAt: now }).where(rows)
    );
    yield* write("tombstone", detached?.categories, (rows) =>
        db.update(categories).set({ parentId: null, updatedAt: now }).where(rows)
    );
});

// Only what was tombstoned at the entry's own instant comes back; rows deleted on their own before it stay deleted.
export const restoreEntry = Effect.fn("DeletionPlan.restoreEntry")(function* restoreEntry(
    db: Database,
    id: string,
    taken: { deletedAt: Date; now: Date; restoredAt: Date }
) {
    const { gone } = rowPlan(id, (table) => eq(table.deletedAt, taken.deletedAt));
    for (const name of RESTORED_CHILDREN_FIRST) {
        const table = TABLES[name];
        yield* write("restore", gone[name], (rows) =>
            db
                .update(table)
                .set({ deletedAt: null, restoredAt: taken.restoredAt, updatedAt: taken.now })
                .where(and(eq(table.deletedAt, taken.deletedAt), rows))
        );
    }
});

export function kept(table: DeletionTable, pending: PendingDeletes): SQL | undefined {
    const gone = or(
        ...UNDOABLE.map((kind) => {
            const id = pending[kind];
            return id === null ? undefined : PLANS[kind](id, (row) => isNull(row.deletedAt)).gone[table];
        })
    );
    return gone === undefined ? undefined : sql`not coalesce(${gone}, 0)`;
}
