import { startOfPeriod } from "@outlayr/money/budget-window";
import { canonicalUsd } from "@outlayr/money/canonical-usd";
import { and, eq, isNull } from "drizzle-orm";

import { getMeta, META_KEYS } from "@/data/app-meta-core";
import { localRateLookup } from "@/data/rates";
import { readNumberSetting } from "@/data/settings-core";
import type { Database } from "@/db/client";
import { budgets, mainBudget } from "@/db/schema";
import { newId } from "@/domain/ids";
import { DEFAULT_CURRENCY } from "@/domain/money";

// The USD value is frozen on the day the window opens, not the write instant, so it agrees with `limitIn`.
async function budgetLimit(
    db: Database,
    amount: number,
    at: Date,
    /** Re-anchoring passes the row's own currency, or a EUR 100 budget is re-read as today's ledger currency. */
    storedCurrency?: string | null
): Promise<{ amount: number; currency: string; amountUsd: number | null }> {
    const magnitude = Math.abs(amount);
    const currency = storedCurrency ?? (await getMeta(db, META_KEYS.currency)) ?? DEFAULT_CURRENCY;
    const { amountUsd } = await canonicalUsd(localRateLookup(db), {
        amount: magnitude,
        currency,
        date: at,
        displayCurrency: currency,
    });
    return { amount: magnitude, amountUsd, currency };
}

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

async function anchorFor(db: Database, startDate: Date | null | undefined, type: number, now: Date): Promise<Date> {
    if (startDate) {
        return startDate;
    }
    const [firstWeekday, firstDayOfMonth] = await Promise.all([
        readNumberSetting(db, "firstWeekday"),
        readNumberSetting(db, "firstDayOfMonth"),
    ]);
    return startOfPeriod(now, type, { firstDayOfMonth, firstWeekday });
}

// The budget tables' AFTER DELETE triggers drop the outbox entry, so a hard delete never reaches a peer, which pushes
// the row back. `categoryId` is unique, so the tombstone clears it. `erase-core.ts` writes this same shape in bulk.
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

export const budgetsRepo = {
    async advanceBudgetStart(db: Database, id: string, start: Date): Promise<void> {
        await db.update(budgets).set({ startDate: start, updatedAt: new Date() }).where(eq(budgets.id, id));
    },

    async advanceMainStart(db: Database, id: string, start: Date): Promise<void> {
        await db.update(mainBudget).set({ startDate: start, updatedAt: new Date() }).where(eq(mainBudget.id, id));
    },
    async createBudget(db: Database, input: CreateBudgetInput): Promise<string> {
        const now = new Date();
        const id = newId();
        const start = await anchorFor(db, input.startDate, input.type, now);
        await db.insert(budgets).values({
            id,
            name: customName(input.name),
            ...(await budgetLimit(db, input.amount, start)),
            categoryId: input.categoryId,
            dateCreated: now,
            deletedAt: null,
            green: false,
            rollover: input.rollover ?? false,
            startDate: start,
            type: input.type,
            updatedAt: now,
        });
        return id;
    },

    async createMainBudget(db: Database, input: CreateMainBudgetInput): Promise<string> {
        const now = new Date();
        const existing = await db
            .select({ id: mainBudget.id })
            .from(mainBudget)
            .where(isNull(mainBudget.deletedAt))
            .limit(1);
        const start = await anchorFor(db, input.startDate, input.type, now);
        if (existing[0]) {
            await db
                .update(mainBudget)
                // drizzle's `.set()` drops an undefined value instead of writing NULL, so an omitted `name` or
                // `rollover` keeps what it had: the form opens on Overall with both blank.
                .set({
                    name: input.name === undefined ? undefined : customName(input.name),
                    ...(await budgetLimit(db, input.amount, start)),
                    rollover: input.rollover,
                    startDate: start,
                    type: input.type,
                    updatedAt: now,
                })
                .where(eq(mainBudget.id, existing[0].id));
            return existing[0].id;
        }
        const id = newId();
        await db.insert(mainBudget).values({
            id,
            name: customName(input.name),
            ...(await budgetLimit(db, input.amount, start)),
            dateCreated: now,
            deletedAt: null,
            green: false,
            rollover: input.rollover ?? false,
            startDate: start,
            type: input.type,
            updatedAt: now,
        });
        return id;
    },

    // An already-deleted row is left alone, so a repeated delete doesn't re-stamp and push an unchanged row.
    async deleteBudget(db: Database, id: string): Promise<void> {
        const now = new Date();
        await db
            .update(budgets)
            .set({ ...TOMBSTONED_BUDGET, deletedAt: now, updatedAt: now })
            .where(and(eq(budgets.id, id), isNull(budgets.deletedAt)));
    },

    async deleteMainBudget(db: Database, id: string): Promise<void> {
        const now = new Date();
        await db
            .update(mainBudget)
            .set({ ...TOMBSTONED_MAIN_BUDGET, deletedAt: now, updatedAt: now })
            .where(and(eq(mainBudget.id, id), isNull(mainBudget.deletedAt)));
    },

    async patchBudget(db: Database, id: string, input: PatchBudgetInput): Promise<void> {
        const now = new Date();
        const rows = await db
            .select({
                amount: budgets.amount,
                currency: budgets.currency,
                startDate: budgets.startDate,
                type: budgets.type,
            })
            .from(budgets)
            .where(and(eq(budgets.id, id), isNull(budgets.deletedAt)))
            .limit(1);
        const [row] = rows;
        if (!row) {
            return;
        }
        await db
            .update(budgets)
            .set(await budgetPatch(db, row, input, now))
            .where(eq(budgets.id, id));
    },

    async patchMainBudget(db: Database, id: string, input: PatchBudgetInput): Promise<void> {
        const now = new Date();
        const rows = await db
            .select({
                amount: mainBudget.amount,
                currency: mainBudget.currency,
                startDate: mainBudget.startDate,
                type: mainBudget.type,
            })
            .from(mainBudget)
            .where(and(eq(mainBudget.id, id), isNull(mainBudget.deletedAt)))
            .limit(1);
        const [row] = rows;
        if (!row) {
            return;
        }
        await db
            .update(mainBudget)
            .set(await budgetPatch(db, row, input, now))
            .where(eq(mainBudget.id, id));
    },
};

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

async function budgetPatch(
    db: Database,
    row: { amount: number; currency: string | null; startDate: Date | null; type: number },
    input: PatchBudgetInput,
    now: Date
): Promise<BudgetPatch> {
    const type = input.type ?? row.type;
    // A cadence change re-anchors to the new cadence's current window. A restated cadence is not a change: the limit
    // sheet always sends the type it opened on, and re-anchoring would discard a start date set by hand.
    const cadenceChanged = input.type !== undefined && input.type !== row.type;
    const anchor = await anchorFor(db, input.startDate ?? (cadenceChanged ? null : row.startDate), type, now);
    const patch: BudgetPatch = { updatedAt: now };
    const reAnchored = cadenceChanged || input.startDate !== undefined;

    if (reAnchored) {
        patch.startDate = anchor;
        patch.type = type;
    }
    if (input.amount !== undefined) {
        Object.assign(patch, await budgetLimit(db, input.amount, anchor));
    } else if (reAnchored) {
        // Only the window moved: re-freeze the USD value against its opening day, in the row's own currency.
        Object.assign(patch, await budgetLimit(db, row.amount, anchor, row.currency));
    }
    if (input.name !== undefined) {
        patch.name = customName(input.name);
    }
    if (input.rollover !== undefined) {
        patch.rollover = input.rollover;
    }
    return patch;
}
