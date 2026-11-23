import { describe, expect, it } from "vite-plus/test";

import type { Account } from "@/data/accounts-core";
import type { PlanWithStanding } from "@/data/installments-core";

import { openInstallments, withoutInstallmentApps } from "./installment-rows";

function account(id: string, name: string, kind: Account["kind"] = "liability") {
    return { id, kind, name } as Account;
}

function plan(id: string, accountId: string, dueDate: string, paid = 0, total = 3): PlanWithStanding {
    return {
        outsidePayments: [],
        plan: {
            accountId,
            currency: "USD",
            dateCreated: new Date("2026-01-01"),
            id,
            transactionId: `${id}-purchase`,
        },
        purchase: { amount: total * 100, date: new Date("2026-01-01"), id: `${id}-purchase`, note: id },
        standing: {
            finished: paid === total,
            installmentsPaid: paid,
            installmentsTotal: total,
            next:
                paid === total
                    ? null
                    : {
                          covered: 0,
                          overdue: false,
                          owed: 100,
                          remaining: 100,
                          row: {
                              amount: 100,
                              dueDate: new Date(dueDate),
                              fee: 0,
                              id: `${id}-${paid + 1}`,
                              planId: id,
                              sequence: paid + 1,
                          },
                          status: "unpaid",
                      },
            overpaid: 0,
            paid: paid * 100,
            remaining: (total - paid) * 100,
            rows: [],
            scheduled: total * 100,
        },
    };
}

describe("the open installments on the Accounts tab", () => {
    it("keeps only plans with something left, soonest due first", () => {
        const rows = openInstallments(
            [
                plan("later", "cashea", "2026-03-10"),
                plan("done", "cashea", "2026-03-01", 3),
                plan("orphan", "gone", "2026-02-01"),
                plan("sooner", "affirm", "2026-02-20"),
            ],
            [account("cashea", "Cashea"), account("affirm", "Affirm")]
        );
        expect(rows.map((row) => row.id)).toStrictEqual(["sooner", "later"]);
        expect(rows[0]?.account.name).toBe("Affirm");
    });

    it("drops an installment app from Debts while cards and people stay", () => {
        const rows = [account("cashea", "Cashea"), account("visa", "Visa"), account("ana", "Ana", "person")];
        const listed = withoutInstallmentApps(rows.map((entry) => ({ account: entry })));
        expect(listed.map((row) => row.account.id)).toStrictEqual(["visa", "ana"]);
    });
});
