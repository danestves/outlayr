import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { BUDGET_TYPE } from "@outlayr/money/budget-window";
import { firstOfMonth, startOfDay } from "@outlayr/money/calendar";
import { eq } from "drizzle-orm";
import { toast } from "panelui-native/components/toast";
import type { ToastOptions } from "panelui-native/components/toast";
import { isValidElement } from "react";

import type { NoticeSlipProps } from "@/components/notice-slip";
import type { Database } from "@/db/client";
import { accounts, budgets, categories, mainBudget, transactions, transfers } from "@/db/schema";
import { migratedDatabase } from "@/db/test-database";

import { accountsRepo } from "./accounts-core";
import { budgetsRepo } from "./budgets-core";
import { createDeferredDeleteRegistry, UNDO_WINDOW_MS } from "./deferred-delete-registry";
import { transfersRepo } from "./transfers-core";

function slipOf(options: ToastOptions | string | undefined): NoticeSlipProps | null {
    const slip = typeof options === "string" ? null : options?.component?.({ hide: jest.fn(), id: "toast" });
    return isValidElement<NoticeSlipProps>(slip) ? slip.props : null;
}

const DAY = new Date(Date.UTC(2026, 7, 9));

/** Drains the promise chain a commit runs on; `setImmediate` is left unfaked for it. */
function settle(): Promise<void> {
    return new Promise((resolve) => {
        setImmediate(resolve);
    });
}

function registryFor(db: Database | null) {
    const registry = createDeferredDeleteRegistry();
    registry.attachDatabase(db);
    return registry;
}

function logRow(db: Database, id: string): Promise<unknown> {
    return db.insert(transactions).values({
        amount: 12,
        date: DAY,
        day: startOfDay(DAY),
        id,
        income: false,
        month: firstOfMonth(DAY),
        note: "Coffee",
        updatedAt: new Date(),
    });
}

describe("createDeferredDeleteRegistry", () => {
    beforeEach(() => {
        jest.useFakeTimers({ doNotFake: ["nextTick", "setImmediate"] });
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    it("holds the write for the undo window, then commits it", async () => {
        const db = migratedDatabase();
        await logRow(db, "tx-1");
        const registry = registryFor(db);

        registry.requestDelete("row", "tx-1");
        expect(registry.pendingId("row")).toBe("tx-1");
        const [held] = await db.select().from(transactions).where(eq(transactions.id, "tx-1"));
        expect(held.deletedAt).toBeNull();

        jest.advanceTimersByTime(UNDO_WINDOW_MS);
        await settle();

        const [written] = await db.select().from(transactions).where(eq(transactions.id, "tx-1"));
        expect(written.deletedAt).not.toBeNull();
        expect(registry.pendingId("row")).toBeNull();
    });

    it("writes nothing when the offer is taken up", async () => {
        const db = migratedDatabase();
        await logRow(db, "tx-1");
        const registry = registryFor(db);
        const show = jest.spyOn(toast, "show").mockReturnValue("toast-1");

        registry.requestDelete("row", "tx-1");
        slipOf(show.mock.calls[0]?.[0])?.onAction?.();

        jest.advanceTimersByTime(UNDO_WINDOW_MS * 2);
        await settle();

        const [row] = await db.select().from(transactions).where(eq(transactions.id, "tx-1"));
        expect(row.deletedAt).toBeNull();
        expect(registry.pendingId("row")).toBeNull();
    });

    it("takes a transfer out through the transfers repo without being told it is one", async () => {
        const db = migratedDatabase();
        const from = await accountsRepo.create(db, { currency: "USD", name: "Zinli" });
        const to = await accountsRepo.create(db, { currency: "USD", name: "Banesco" });
        const id = await transfersRepo.create(db, {
            date: DAY,
            exchangeRate: null,
            exchangeRateType: null,
            fromAccountId: from,
            fromAmount: 100,
            fromCurrency: "USD",
            toAccountId: to,
            toAmount: 100,
            toCurrency: "USD",
        });
        const registry = registryFor(db);

        registry.requestDelete("row", id);
        registry.flushAll();
        await settle();

        const [transfer] = await db.select().from(transfers).where(eq(transfers.id, id));
        expect(transfer.deletedAt).not.toBeNull();
    });

    it("routes the overall budget to its own table and a per-category one to the other", async () => {
        const db = migratedDatabase();
        await db.insert(categories).values({
            dateCreated: DAY,
            id: "cat-1",
            income: false,
            name: "Food",
            updatedAt: DAY,
        });
        const overall = await budgetsRepo.createMainBudget(db, { amount: 500, type: BUDGET_TYPE.month });
        const perCategory = await budgetsRepo.createBudget(db, {
            amount: 100,
            categoryId: "cat-1",
            type: BUDGET_TYPE.month,
        });
        const registry = registryFor(db);

        registry.requestDelete("budget", overall);
        registry.flushAll();
        await settle();
        registry.requestDelete("budget", perCategory);
        registry.flushAll();
        await settle();

        const [main] = await db.select().from(mainBudget).where(eq(mainBudget.id, overall));
        const [category] = await db.select().from(budgets).where(eq(budgets.id, perCategory));
        expect(main.deletedAt).not.toBeNull();
        expect(category.deletedAt).not.toBeNull();
    });

    it("keeps each kind's window to itself", async () => {
        const db = migratedDatabase();
        await logRow(db, "tx-1");
        const account = await accountsRepo.create(db, { currency: "USD", name: "Cash" });
        const registry = registryFor(db);

        registry.requestDelete("row", "tx-1");
        registry.requestDelete("account", account);
        expect(registry.pendingId("row")).toBe("tx-1");
        expect(registry.pendingId("account")).toBe(account);

        jest.advanceTimersByTime(UNDO_WINDOW_MS);
        await settle();

        const [row] = await db.select().from(transactions).where(eq(transactions.id, "tx-1"));
        const [held] = await db.select().from(accounts).where(eq(accounts.id, account));
        expect(row.deletedAt).not.toBeNull();
        expect(held.deletedAt).not.toBeNull();
    });

    it("says so when the write loses, and does not say it twice", async () => {
        const registry = registryFor(null);
        const show = jest.spyOn(toast, "show").mockReturnValue("toast-1");

        registry.requestDelete("account", "acc-1");
        jest.advanceTimersByTime(UNDO_WINDOW_MS);
        await settle();

        const failures = show.mock.calls.filter(([notice]) => slipOf(notice)?.tone.kind === "failure");
        expect(failures).toHaveLength(1);
    });

    it("replaces the offer rather than reusing it when a second row goes mid-window", async () => {
        const db = migratedDatabase();
        await logRow(db, "tx-1");
        await logRow(db, "tx-2");
        const registry = registryFor(db);
        const show = jest.spyOn(toast, "show").mockReturnValue("toast-1");
        const hide = jest.spyOn(toast, "hide").mockImplementation(() => {});

        registry.requestDelete("row", "tx-1");
        registry.requestDelete("row", "tx-2");

        expect(hide).toHaveBeenCalledWith("toast-1");
        expect(show).toHaveBeenCalledTimes(2);
        await settle();
        const [first] = await db.select().from(transactions).where(eq(transactions.id, "tx-1"));
        expect(first.deletedAt).not.toBeNull();
    });
});
