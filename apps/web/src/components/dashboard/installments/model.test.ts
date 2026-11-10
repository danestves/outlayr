import type { LedgerBooks } from "@outlayr/backend/confect/ledgerView";
import { describe, expect, it } from "vite-plus/test";

import { prepareLedger } from "@/lib/dashboard-series-ledger";
import { pendingDeletion } from "@/lib/installment-writes";

import { cadenceOf, installmentsSummary, planViews } from "./model";

const NOW = Date.parse("2026-11-10T15:00:00Z");
const DUE = ["2026-10-01", "2026-11-01", "2026-12-01"] as const;

const envelope = (localId: string) => ({ deletedAt: null, deviceId: "d", localId, seq: 1, updatedAt: 0, userId: "u" });
const account = (localId: string, kind: "asset" | "liability") => ({
    ...envelope(localId),
    currency: "USD",
    initialBalance: 0,
    initialBalanceDate: 0,
    kind,
    name: localId,
});

function ledgerWith({
    outside = [],
    transfers = [],
}: {
    outside?: [number, string][];
    transfers?: [number, string][];
}) {
    return prepareLedger(
        {
            accounts: [account("card", "liability"), account("checking", "asset")],
            appMeta: [{ key: "timeZone", value: "UTC" }],
            budgets: [],
            categories: [],
            exchangeRates: [],
            installmentPlans: [{ ...envelope("plan"), accountId: "card", dateCreated: 0, transactionId: "desk" }],
            installments: DUE.map((day, index) => ({
                ...envelope(`i${index + 1}`),
                amount: 100,
                dueDate: Date.parse(`${day}T00:00:00Z`),
                planId: "plan",
                sequence: index + 1,
            })),
            mainBudget: [],
            outsideMoves: [],
            outsidePayments: outside.map(([amount, day], index) => ({
                ...envelope(`out${index}`),
                amount,
                amountUsd: amount,
                date: Date.parse(`${day}T12:00:00Z`),
                planId: "plan",
            })),
            savingsGoals: [],
            transactions: [
                {
                    ...envelope("desk"),
                    accountId: "card",
                    amount: 300,
                    amountUsd: 300,
                    categoryId: null,
                    currency: "USD",
                    date: Date.parse("2026-09-01T12:00:00Z"),
                    income: false,
                    note: "Desk",
                },
            ],
            transfers: transfers.map(([amount, day], index) => ({
                ...envelope(`move${index}`),
                date: Date.parse(`${day}T12:00:00Z`),
                fromAccountId: "checking",
                fromAmount: amount,
                installmentPlanId: "plan",
                toAccountId: "card",
                toAmount: amount,
            })),
            // SAFETY: rows carry what the plan reader reads, the validators are not under test.
        } as unknown as LedgerBooks,
        NOW
    );
}

const onlyPlan = (ledger: ReturnType<typeof ledgerWith>) => {
    const [view] = planViews(ledger);
    if (!view) {
        throw new Error("no plan");
    }
    return view;
};

describe("planViews", () => {
    it("credits each row to the payment that finished covering it", () => {
        const view = onlyPlan(ledgerWith({ outside: [[50, "2026-11-02"]], transfers: [[150, "2026-10-01"]] }));
        expect(view.rows.map((row) => [row.status, row.paidFrom])).toEqual([
            ["paid", "checking"],
            ["paid", null],
            ["unpaid", null],
        ]);
        expect([view.paid, view.left, view.next?.id]).toEqual([200, 100, "i3"]);
    });

    it("leaves a partly paid row overdue for what it still owes", () => {
        const view = onlyPlan(ledgerWith({ transfers: [[150, "2026-10-01"]] }));
        expect(view.rows[1]).toMatchObject({ covered: 50, overdue: true, remaining: 50, status: "partial" });
        expect(view.overdue).toEqual({ amount: 50, since: "2026-11-01" });
    });

    it("dates the payoff on the payment that finished the last row", () => {
        const view = onlyPlan(ledgerWith({ outside: [[200, "2026-11-05"]], transfers: [[100, "2026-10-01"]] }));
        expect([view.finished, view.paidOff, view.left]).toEqual([true, "2026-11-05", 0]);
    });
});

describe("installmentsSummary", () => {
    it("counts overdue rows in the next 30 days, and leaves paid ones out", () => {
        const ledger = ledgerWith({ transfers: [[150, "2026-10-01"]] });
        const { overdue, soon } = installmentsSummary(ledger, planViews(ledger));
        expect(soon.rows.map(({ row }) => row.id)).toEqual(["i2", "i3"]);
        expect(soon.amount).toBe(150);
        expect(overdue?.amount).toBe(50);
    });
});

describe("cadenceOf", () => {
    it("reads month ends clamped to short months as monthly", () => {
        expect(cadenceOf(["2027-01-31", "2027-02-28", "2027-03-31"])).toEqual({ kind: "monthly" });
    });

    it("tells twice a month apart from a fixed gap", () => {
        expect(cadenceOf(["2026-11-15", "2026-11-30", "2026-12-15", "2026-12-31"])).toEqual({ kind: "semimonthly" });
        expect(cadenceOf(["2026-11-01", "2026-11-15", "2026-11-29"])).toEqual({ every: 14, kind: "days" });
    });
});

describe("pendingDeletion", () => {
    it("keeps paid rows, shrinks a partly paid one to what covered it, and drops the rest", () => {
        const ledger = ledgerWith({ transfers: [[150, "2026-10-01"]] });
        const rows = pendingDeletion(ledger.books, onlyPlan(ledger), NOW);
        expect(
            rows.map((row) => [row.localId, row.deletedAt, row.table === "installments" && row.fields.amount])
        ).toEqual([
            ["i2", null, 50],
            ["i3", NOW, 100],
        ]);
    });

    it("drops a plan with nothing paid whole and keeps its transfers as plain ones", () => {
        const ledger = ledgerWith({ transfers: [[0, "2026-10-01"]] });
        const rows = pendingDeletion(ledger.books, onlyPlan(ledger), NOW);
        expect(rows.find((row) => row.table === "transfers")?.fields).toMatchObject({ installmentPlanId: null });
        expect(rows.find((row) => row.table === "installmentPlans")?.deletedAt).toBe(NOW);
        expect(rows.filter((row) => row.table === "installments")).toHaveLength(3);
    });
});
