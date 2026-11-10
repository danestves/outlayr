import { ledgerGlance } from "@outlayr/backend/confect/ledgerView";
import type { LedgerBooks } from "@outlayr/backend/confect/ledgerView";
import { describe, expect, it } from "vite-plus/test";

import { prepareLedger } from "../../../lib/dashboard-series-ledger";
import { accountRows } from "../accounts/model";
import { debtsModel, payoffEndedOn, standingOf } from "./model";
import { outsideMove } from "./writes";
import type { DebtVerb } from "./writes";

const NOW = Date.parse("2026-11-08T15:00:00Z");

const envelope = (localId: string) => ({
    deletedAt: null,
    deviceId: "device",
    localId,
    seq: 1,
    updatedAt: 0,
    userId: "owner",
});

const move = (localId: string, verb: DebtVerb, amount: number, date: string) => ({
    ...envelope(localId),
    ...outsideMove(
        { exchangeRates: [] },
        { amount, date: Date.parse(date), note: localId, person: { currency: "USD", id: "elena" }, usd: null, verb },
        localId,
        0
    ).fields,
});

function elena(moves: ReturnType<typeof move>[]) {
    const books = {
        accounts: [
            {
                ...envelope("elena"),
                currency: "USD",
                initialBalance: 0,
                initialBalanceDate: Date.parse("2026-06-01T12:00:00Z"),
                initialBalanceUsd: 0,
                kind: "person",
                name: "Elena",
            },
        ],
        appMeta: [{ key: "timeZone", value: "UTC" }],
        budgets: [],
        categories: [],
        exchangeRates: [],
        installmentPlans: [],
        installments: [],
        mainBudget: [],
        outsideMoves: moves,
        outsidePayments: [],
        savingsGoals: [],
        transactions: [],
        transfers: [],
    } as unknown as LedgerBooks;
    const ledger = prepareLedger(books, NOW);
    return debtsModel(ledger, accountRows(ledger, ledgerGlance(books, NOW)));
}

describe("debts model", () => {
    it("reads a loan paid back in part as owed, with each movement's label and the balance it left", () => {
        const model = elena([
            move("car", "borrowed", 1900, "2026-06-30T12:00:00Z"),
            move("july", "paidBack", 200, "2026-07-31T12:00:00Z"),
            move("august", "paidBack", 200, "2026-08-31T12:00:00Z"),
        ]);
        const [row] = model.youOwe;
        expect(row?.amount).toBe(1500);
        expect(row?.facts.movements.map(({ amount, balance, kind }) => ({ amount, balance, kind }))).toStrictEqual([
            { amount: -200, balance: 1500, kind: "paidBack" },
            { amount: -200, balance: 1700, kind: "paidBack" },
            { amount: 1900, balance: 1900, kind: "borrowed" },
        ]);
        expect(row?.facts).toMatchObject({
            added: { count: 1, total: 1900 },
            repaid: { count: 2, total: 400 },
            side: "youOwe",
            since: "2026-06-30",
        });
    });

    it("labels money back from someone who owed you as got paid back, and dates a settled debt by its last payment", () => {
        const model = elena([
            move("deposit", "lent", 200, "2026-10-12T12:00:00Z"),
            move("half", "gotPaidBack", 80, "2026-10-24T12:00:00Z"),
            move("rest", "gotPaidBack", 120, "2026-10-31T12:00:00Z"),
        ]);
        const [row] = model.settled;
        expect(row?.facts.movements.map((each) => each.kind)).toStrictEqual(["gotPaidBack", "gotPaidBack", "lent"]);
        expect(row?.facts).toMatchObject({ added: { total: 200 }, repaid: { total: 200 }, since: "2026-10-31" });
    });
});

describe("standing", () => {
    it("reads a float residue as settled", () => {
        expect(standingOf(0.1 + 0.2 - 0.3, "USD")).toBe("settled");
    });
});

describe("payoff end day", () => {
    const owed = [{ amount: 500, day: "2026-09-01" }];

    it("ends on the day the balance came back to zero", () => {
        const paid = [...owed, { amount: -200, day: "2026-09-15" }, { amount: -300, day: "2026-10-01" }];
        expect(payoffEndedOn(-500, "2026-09-01", paid, "USD")).toBe("2026-10-01");
    });

    it("still ends when the last payment and a new loan land the same day", () => {
        const again = [...owed, { amount: -500, day: "2026-10-01" }, { amount: 300, day: "2026-10-01" }];
        expect(payoffEndedOn(-500, "2026-09-01", again, "USD")).toBe("2026-10-01");
    });

    it("stays open while anything is owed", () => {
        expect(payoffEndedOn(-500, "2026-09-01", [...owed, { amount: -499, day: "2026-10-01" }], "USD")).toBeNull();
    });
});
