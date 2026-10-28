import { startOfPeriod } from "@outlayr/money/budget-window";
import { canonicalUsd } from "@outlayr/money/canonical-usd";
import { and, eq, isNull } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import { getMeta, META_KEYS } from "@/data/app-meta-core";
import { localRateLookup } from "@/data/rates";
import { readNumberSetting } from "@/data/settings-core";
import type { Database } from "@/db/client";
import { budgets, mainBudget } from "@/db/schema";
import { newId } from "@/domain/ids";
import { DEFAULT_CURRENCY } from "@/domain/money";

const BudgetsOperation = Schema.Literals([
    "advance-budget-start",
    "advance-main-start",
    "create-budget",
    "create-main-budget",
    "delete-budget",
    "delete-main-budget",
    "patch-budget",
    "patch-main-budget",
]);

export class BudgetsError extends Schema.TaggedError<BudgetsError>()("BudgetsError", {
    cause: Schema.Defect(),
    operation: BudgetsOperation,
}) {
    override get message(): string {
        return `Budgets ${this.operation} failed`;
    }
}

const query = <A>(operation: typeof BudgetsOperation.Type, run: () => PromiseLike<A>) =>
    Effect.tryPromise({ catch: (cause) => new BudgetsError({ cause, operation }), try: run });

// The USD value is frozen on the day the window opens, not the write instant, so it agrees with `limitIn`.
const budgetLimit = Effect.fn("Budgets.budgetLimit")(function* budgetLimit(
    operation: typeof BudgetsOperation.Type,
    db: Database,
    amount: number,
    at: Date,
    /** Re-anchoring passes the row's own currency, or a EUR 100 budget is re-read as today's ledger currency. */
    storedCurrency?: string | null
) {
    const magnitude = Math.abs(amount);
    const currency = storedCurrency ?? (yield* getMeta(db, META_KEYS.currency)) ?? DEFAULT_CURRENCY;
    const { amountUsd } = yield* canonicalUsd(localRateLookup(db), {
        amount: magnitude,
        currency,
        date: at,
        displayCurrency: currency,
    }).pipe(Effect.mapError((cause) => new BudgetsError({ cause, operation })));
    return { amount: magnitude, amountUsd, currency };
});

// Here, not in `budgets.ts`, so callers that must not load expo-sqlite (widget props, node tests) can import it.
export const OVERALL_BUDGET_ID = "overall";

export interface CreateBudgetInput {
    amount: number;
    categoryId: string;
    name?: string | null;
    rollover?: boolean;
    startDate?: Date | null;
    type: number;
}

export interface CreateMainBudgetInput {
    amount: number;
    name?: string | null;
    /** Omitted leaves an existing budget's setting alone. */
    rollover?: boolean;
    startDate?: Date | null;
    type: number;
}

/** Omitted fields are left alone: each editor row commits only its own fact. */
export interface PatchBudgetInput {
    amount?: number;
    name?: string | null;
    rollover?: boolean;
    startDate?: Date | null;
    type?: number;
}

function customName(name: string | null | undefined): string | null {
    const trimmed = name?.trim();
    return trimmed || null;
}

const anchorFor = Effect.fn("Budgets.anchorFor")(function* anchorFor(
    operation: typeof BudgetsOperation.Type,
    db: Database,
    startDate: Date | null | undefined,
    type: number,
    now: Date
) {
    if (startDate) {
        return startDate;
    }
    const [firstWeekday, firstDayOfMonth] = yield* Effect.all(
        [readNumberSetting(db, "firstWeekday"), readNumberSetting(db, "firstDayOfMonth")],
        { concurrency: "unbounded" }
    );
    return startOfPeriod(now, type, { firstDayOfMonth, firstWeekday });
});

// The budget tables' AFTER DELETE triggers drop the outbox entry, so a hard delete never reaches a peer, which pushes
// the row back. Installs before 0038 hold `categoryId` unique on tombstones too, so the tombstone clears it.
// `erase-core.ts` writes this same shape in bulk.
export const TOMBSTONED_BUDGET = {
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
} as const;

export const TOMBSTONED_MAIN_BUDGET = {
    amount: 0,
    amountUsd: null,
    currency: null,
    dateCreated: null,
    green: false,
    name: null,
    rollover: false,
    startDate: null,
    type: 0,
} as const;

interface BudgetPatch {
    amount?: number;
    amountUsd?: number | null;
    currency?: string;
    name?: string | null;
    rollover?: boolean;
    startDate?: Date;
    type?: number;
    updatedAt: Date;
}

const budgetPatch = Effect.fn("Budgets.budgetPatch")(function* budgetPatch(
    operation: typeof BudgetsOperation.Type,
    db: Database,
    row: { amount: number; currency: string | null; startDate: Date | null; type: number },
    input: PatchBudgetInput,
    now: Date
) {
    const type = input.type ?? row.type;
    // A cadence change re-anchors to the new cadence's current window. A restated cadence is not a change: the limit
    // sheet always sends the type it opened on, and re-anchoring would discard a start date set by hand.
    const cadenceChanged = input.type !== undefined && input.type !== row.type;
    const anchor = yield* anchorFor(
        operation,
        db,
        input.startDate ?? (cadenceChanged ? null : row.startDate),
        type,
        now
    );
    const patch: BudgetPatch = { updatedAt: now };
    const reAnchored = cadenceChanged || input.startDate !== undefined;

    if (reAnchored) {
        patch.startDate = anchor;
        patch.type = type;
    }
    if (input.amount !== undefined) {
        Object.assign(patch, yield* budgetLimit(operation, db, input.amount, anchor));
    } else if (reAnchored) {
        // Only the window moved: re-freeze the USD value against its opening day, in the row's own currency.
        Object.assign(patch, yield* budgetLimit(operation, db, row.amount, anchor, row.currency));
    }
    if (input.name !== undefined) {
        patch.name = customName(input.name);
    }
    if (input.rollover !== undefined) {
        patch.rollover = input.rollover;
    }
    return patch;
});

export const budgetsRepo = {
    advanceBudgetStart: Effect.fn("Budgets.advanceBudgetStart")(function* advanceBudgetStart(
        db: Database,
        id: string,
        start: Date
    ) {
        yield* query("advance-budget-start", () =>
            db.update(budgets).set({ startDate: start, updatedAt: new Date() }).where(eq(budgets.id, id))
        );
    }),

    advanceMainStart: Effect.fn("Budgets.advanceMainStart")(function* advanceMainStart(
        db: Database,
        id: string,
        start: Date
    ) {
        yield* query("advance-main-start", () =>
            db.update(mainBudget).set({ startDate: start, updatedAt: new Date() }).where(eq(mainBudget.id, id))
        );
    }),

    createBudget: Effect.fn("Budgets.createBudget")(function* createBudget(db: Database, input: CreateBudgetInput) {
        const now = new Date();
        const id = newId();
        const start = yield* anchorFor("create-budget", db, input.startDate, input.type, now);
        const limit = yield* budgetLimit("create-budget", db, input.amount, start);
        yield* query("create-budget", () =>
            db.insert(budgets).values({
                id,
                name: customName(input.name),
                ...limit,
                categoryId: input.categoryId,
                dateCreated: now,
                deletedAt: null,
                green: false,
                rollover: input.rollover ?? false,
                startDate: start,
                type: input.type,
                updatedAt: now,
            })
        );
        return id;
    }),

    createMainBudget: Effect.fn("Budgets.createMainBudget")(function* createMainBudget(
        db: Database,
        input: CreateMainBudgetInput
    ) {
        const now = new Date();
        const existing = yield* query("create-main-budget", () =>
            db.select({ id: mainBudget.id }).from(mainBudget).where(isNull(mainBudget.deletedAt)).limit(1)
        );
        const start = yield* anchorFor("create-main-budget", db, input.startDate, input.type, now);
        const limit = yield* budgetLimit("create-main-budget", db, input.amount, start);
        if (existing[0]) {
            const [{ id: existingId }] = existing;
            yield* query("create-main-budget", () =>
                db
                    .update(mainBudget)
                    // drizzle's `.set()` drops an undefined value instead of writing NULL, so an omitted `name` or
                    // `rollover` keeps what it had: the form opens on Overall with both blank.
                    .set({
                        name: input.name === undefined ? undefined : customName(input.name),
                        ...limit,
                        rollover: input.rollover,
                        startDate: start,
                        type: input.type,
                        updatedAt: now,
                    })
                    .where(eq(mainBudget.id, existingId))
            );
            return existingId;
        }
        const id = newId();
        yield* query("create-main-budget", () =>
            db.insert(mainBudget).values({
                id,
                name: customName(input.name),
                ...limit,
                dateCreated: now,
                deletedAt: null,
                green: false,
                rollover: input.rollover ?? false,
                startDate: start,
                type: input.type,
                updatedAt: now,
            })
        );
        return id;
    }),

    // An already-deleted row is left alone, so a repeated delete doesn't re-stamp and push an unchanged row.
    deleteBudget: Effect.fn("Budgets.deleteBudget")(function* deleteBudget(db: Database, id: string) {
        const now = new Date();
        yield* query("delete-budget", () =>
            db
                .update(budgets)
                .set({ ...TOMBSTONED_BUDGET, deletedAt: now, updatedAt: now })
                .where(and(eq(budgets.id, id), isNull(budgets.deletedAt)))
        );
    }),

    deleteMainBudget: Effect.fn("Budgets.deleteMainBudget")(function* deleteMainBudget(db: Database, id: string) {
        const now = new Date();
        yield* query("delete-main-budget", () =>
            db
                .update(mainBudget)
                .set({ ...TOMBSTONED_MAIN_BUDGET, deletedAt: now, updatedAt: now })
                .where(and(eq(mainBudget.id, id), isNull(mainBudget.deletedAt)))
        );
    }),

    patchBudget: Effect.fn("Budgets.patchBudget")(function* patchBudget(
        db: Database,
        id: string,
        input: PatchBudgetInput
    ) {
        const now = new Date();
        const [row] = yield* query("patch-budget", () =>
            db
                .select({
                    amount: budgets.amount,
                    currency: budgets.currency,
                    startDate: budgets.startDate,
                    type: budgets.type,
                })
                .from(budgets)
                .where(and(eq(budgets.id, id), isNull(budgets.deletedAt)))
                .limit(1)
        );
        if (!row) {
            return;
        }
        const patch = yield* budgetPatch("patch-budget", db, row, input, now);
        yield* query("patch-budget", () => db.update(budgets).set(patch).where(eq(budgets.id, id)));
    }),

    patchMainBudget: Effect.fn("Budgets.patchMainBudget")(function* patchMainBudget(
        db: Database,
        id: string,
        input: PatchBudgetInput
    ) {
        const now = new Date();
        const [row] = yield* query("patch-main-budget", () =>
            db
                .select({
                    amount: mainBudget.amount,
                    currency: mainBudget.currency,
                    startDate: mainBudget.startDate,
                    type: mainBudget.type,
                })
                .from(mainBudget)
                .where(and(eq(mainBudget.id, id), isNull(mainBudget.deletedAt)))
                .limit(1)
        );
        if (!row) {
            return;
        }
        const patch = yield* budgetPatch("patch-main-budget", db, row, input, now);
        yield* query("patch-main-budget", () => db.update(mainBudget).set(patch).where(eq(mainBudget.id, id)));
    }),
};
