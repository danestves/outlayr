import { describe, expect, it, test } from "@jest/globals";
import { BUDGET_TYPE } from "@outlayr/money/budget-window";
import * as Effect from "effect/Effect";

import { accounts } from "@/db/schema";
import { migratedDatabase } from "@/db/test-database";

import { WIDGET_PALETTE } from "../palette";
import { NIGHT_COLORS } from "./envelope";
import { androidWidgetProps, buildAndroidWidgetProps } from "./props";
import type { AndroidWidgetFigures } from "./props";

const JUNE_1 = new Date("2026-06-01T12:00:00.000Z");
const JUNE_2 = new Date("2026-06-02T12:00:00.000Z");

const account = (id: string, kind: string, initialBalance: number) => ({
    currency: "USD",
    dateCreated: JUNE_1,
    id,
    initialBalance,
    initialBalanceDate: JUNE_1,
    kind,
    name: id,
    updatedAt: JUNE_1,
});

const JUNE_11 = new Date(2026, 5, 11, 12);

const figures: AndroidWidgetFigures = {
    balance: { currency: "EUR", total: 1240.5 },
    budget: {
        limit: 100,
        spent: 130,
        type: BUDGET_TYPE.month,
        window: { end: new Date(2026, 6, 1), start: new Date(2026, 5, 1) },
    },
    calendar: { firstDayOfMonth: 1, firstWeekday: 1 },
    categoriesById: new Map(),
    contributions: [],
    currency: "EUR",
    entries: [],
    now: JUNE_11,
    period: "week",
    showCents: true,
    todayCount: 1,
    todaySpent: 12,
    use24HourClock: true,
};

const entry = (id: string, date: Date, income = false) => ({
    amount: 4.5,
    category: "Coffee",
    color: "#3b82f6",
    currency: "EUR",
    date,
    emoji: "",
    id,
    income,
    note: id,
    rootCategoryId: null,
});

describe("buildAndroidWidgetProps", () => {
    it("counts only asset accounts in the balance, leaving cards and people out", async () => {
        const db = migratedDatabase({ foreignKeys: false });
        await db
            .insert(accounts)
            .values([
                account("checking", "asset", 1200),
                account("savings", "asset", 40.5),
                account("card", "liability", -300),
                account("friend", "person", 75),
            ]);

        const props = await Effect.runPromise(buildAndroidWidgetProps(db, JUNE_2));

        expect(props.Wallet.locales.en.balance).toBe("$1,240.50");
        expect(props.Overview.locales.en.balance).toBe("$1,240.50");
    });

    it("keeps the minus on an overdrawn balance", async () => {
        const db = migratedDatabase({ foreignKeys: false });
        await db.insert(accounts).values([account("checking", "asset", 16), account("overdraft", "asset", -1645)]);

        const props = await Effect.runPromise(buildAndroidWidgetProps(db, JUNE_2));

        expect(props.Wallet.locales.en.balance).toBe("-$1,629.00");
    });
});

describe("androidWidgetProps", () => {
    it("words each language on its own", () => {
        const { Overview, Today } = androidWidgetProps(figures);

        expect(Overview.locales.es.actions[0]?.label).toBe("Monto");
        expect(Overview.locales["es-ES"].actions[0]?.label).toBe("Importe");
        expect(Today.locales["pt-PT"].count).toBe("1 registo");
    });

    it("words an overspent budget as over, with the overspend as the figure", () => {
        const { budget } = androidWidgetProps(figures).Overview.locales.en;

        expect(budget).toMatchObject({ fraction: 1, label: "Over budget", over: true });
        expect(budget.left).toContain("30.00");
    });

    it("marks how far into the budget period today is, with the days still left", () => {
        const { budget } = androidWidgetProps(figures).Overview.locales.en;

        expect(budget.pace).toBeCloseTo(10.5 / 30, 2);
        expect(budget.timeLeft).toBe("20d left");
    });

    it("says when each recent entry happened, relative to today", () => {
        const { entries } = androidWidgetProps({
            ...figures,
            entries: [
                entry("latte", new Date(2026, 5, 11, 9, 12)),
                entry("taxi", new Date(2026, 5, 10, 22, 5)),
                entry("salary", new Date(2026, 5, 3, 8), true),
            ],
        }).Entries.locales.es;

        expect(entries.map(({ amount, when }) => [amount, when])).toStrictEqual([
            ["-€4.50", "09:12"],
            ["-€4.50", "Ayer"],
            ["+€4.50", "3 JUN"],
        ]);
    });
});

test("maps every light color to its own dark one", () => {
    expect(Object.keys(NIGHT_COLORS)).toHaveLength(Object.keys(WIDGET_PALETTE.light).length);
    expect(NIGHT_COLORS[WIDGET_PALETTE.light.ink]).toBe(WIDGET_PALETTE.dark.ink);
});
