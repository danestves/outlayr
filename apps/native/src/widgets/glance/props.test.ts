import { describe, expect, it, test } from "@jest/globals";
import * as Effect from "effect/Effect";

import { accounts } from "@/db/schema";
import { migratedDatabase } from "@/db/test-database";

import { WIDGET_PALETTE } from "../palette";
import { NIGHT_COLORS } from "./envelope";
import { androidWidgetProps, buildAndroidWidgetProps } from "./props";

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

const figures = {
    balance: { currency: "EUR", total: 1240.5 },
    budget: { limit: 100, spent: 130 },
    currency: "EUR",
    showCents: true,
    todayCount: 1,
    todaySpent: 12,
};

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
});

test("maps every light color to its own dark one", () => {
    expect(Object.keys(NIGHT_COLORS)).toHaveLength(Object.keys(WIDGET_PALETTE.light).length);
    expect(NIGHT_COLORS[WIDGET_PALETTE.light.ink]).toBe(WIDGET_PALETTE.dark.ink);
});
