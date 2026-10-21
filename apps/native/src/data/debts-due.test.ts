import { describe, expect, it } from "@jest/globals";
import { buildRateTable } from "@outlayr/money/valuation";

import { dueWindow, installmentsByAccount } from "./debts-due";
import { assemblePlans } from "./installments-core";

// Late evening, when the UTC day is already tomorrow.
const NOW = new Date(2026, 9, 18, 21, 30);
const NO_RATES = buildRateTable([]);

const plan = (id: string, accountId = "cashea") => ({
    accountId,
    currency: "USD",
    dateCreated: new Date(2026, 8, 1),
    id,
    transactionId: `${id}-purchase`,
});

const cuota = (planId: string, sequence: number, dueDate: Date, amount = 30) => ({
    amount,
    dueDate,
    id: `${planId}-${sequence}`,
    planId,
    sequence,
});

function plansOf(rows: ReturnType<typeof cuota>[], paid: Record<string, number>, plans = [plan("shoes")]) {
    return assemblePlans(
        {
            fees: [],
            installments: rows,
            outside: [],
            payments: Object.entries(paid).map(([planId, amount]) => ({ paid: amount, planId })),
            plans,
            purchases: [],
        },
        NOW
    );
}

describe("dueWindow", () => {
    it("counts what is left of overdue cuotas and those due today through 14 days ahead", () => {
        const plans = plansOf(
            [
                cuota("shoes", 1, new Date(2026, 9, 4)),
                cuota("shoes", 2, new Date(2026, 9, 11)),
                cuota("shoes", 3, new Date(2026, 9, 18)),
                cuota("shoes", 4, new Date(2026, 10, 1)),
                cuota("shoes", 5, new Date(2026, 10, 2)),
            ],
            // Cuota 1 paid, cuota 2 half paid.
            { shoes: 45 }
        );
        const due = dueWindow(plans, NOW.getTime(), "USD", NO_RATES);
        expect(due?.count).toBe(3);
        expect(due?.total).toBe(75);
        expect(due?.next.standing.row.sequence).toBe(2);
    });

    it("is null once everything in the window is paid", () => {
        const plans = plansOf([cuota("shoes", 1, new Date(2026, 9, 18)), cuota("shoes", 2, new Date(2026, 10, 2))], {
            shoes: 30,
        });
        expect(dueWindow(plans, NOW.getTime(), "USD", NO_RATES)).toBeNull();
    });
});

describe("installmentsByAccount", () => {
    it("takes the soonest unpaid cuota across an account's open orders and leaves paid-off ones out", () => {
        const plans = plansOf(
            [
                cuota("shoes", 1, new Date(2026, 9, 24), 15),
                cuota("phone", 1, new Date(2026, 9, 20), 25),
                cuota("done", 1, new Date(2026, 9, 1), 10),
            ],
            { done: 10 },
            [plan("shoes"), plan("phone"), plan("done")]
        );
        const cashea = installmentsByAccount(plans).get("cashea");
        expect(cashea?.next.row.id).toBe("phone-1");
        expect(cashea?.open.map(({ plan: { id } }) => id)).toStrictEqual(["shoes", "phone"]);
    });
});
