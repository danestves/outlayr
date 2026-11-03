import * as Effect from "effect/Effect";
import { beforeEach, describe, expect, it } from "vite-plus/test";

import type { Database } from "@/db/client";
import { transactionalDatabase } from "@/db/test-database";
import { generateSchedule } from "@/domain/installments";

import { settledCellsAt } from "./accounts";
import { accountsRepo, getAccountById } from "./accounts-core";
import { cardStatement } from "./card-statement";
import { installmentsRepo, readPlans } from "./installments-core";
import { transactionsRepo } from "./transactions-core";
import { loadValuationIn } from "./valuation-source";

const OPENED = new Date(2026, 8, 1, 12);
const PURCHASE = new Date(2026, 9, 18, 15);
const NOW = new Date(2026, 10, 3, 12);

let db: Database;
let bank: string;

beforeEach(async () => {
    db = transactionalDatabase();
    bank = await Effect.runPromise(accountsRepo.create(db, { currency: "USD", name: "Zinli" }));
});

async function card(initialBalanceDate = OPENED): Promise<string> {
    return await Effect.runPromise(
        accountsRepo.create(db, {
            currency: "USD",
            initialBalanceDate,
            kind: "liability",
            name: "Visa",
            paymentDay: 10,
            statementDay: 25,
        })
    );
}

/** A $50 charge and a $100 order on 18 Oct: $40 upfront from the bank, then $20 cuotas on 1, 15 and 29 Nov. */
async function spend(accountId: string): Promise<string> {
    await Effect.runPromise(
        transactionsRepo.create(db, {
            accountId,
            amount: 50,
            categoryId: null,
            currency: "USD",
            date: PURCHASE,
            details: null,
            income: false,
            note: "Groceries",
        })
    );
    const { planId } = await Effect.runPromise(
        installmentsRepo.createOrder(db, {
            purchase: {
                accountId,
                amount: 100,
                categoryId: null,
                currency: "USD",
                date: PURCHASE,
                details: null,
                income: false,
                note: "Shoes",
            },
            schedule: generateSchedule({
                amount: { total: 60 },
                count: 3,
                currency: "USD",
                interval: { every: 14, kind: "days" },
                purchaseDay: PURCHASE,
                upfront: 40,
            }),
            upfront: {
                exchangeRate: null,
                exchangeRateType: null,
                fromAccountId: bank,
                fromAmount: 40,
                fromCurrency: "USD",
            },
        })
    );
    return planId;
}

async function pay(planId: string, amount: number, date: Date): Promise<void> {
    await Effect.runPromise(
        installmentsRepo.recordPayment(db, {
            amount,
            date,
            planId,
            source: {
                exchangeRate: null,
                exchangeRateType: null,
                fromAccountId: bank,
                fromAmount: amount,
                fromCurrency: "USD",
            },
        })
    );
}

async function statementOf(id: string) {
    const account = getAccountById(db, id);
    if (!account) {
        throw new Error(`No account ${id}`);
    }
    const [cells, { rates }] = await Effect.runPromise(
        Effect.all([settledCellsAt(db, id, NOW), loadValuationIn(db, "USD")])
    );
    const plans = readPlans(db, NOW).filter(({ plan }) => plan.accountId === id);
    return cardStatement(account, cells, rates, plans, NOW.getTime());
}

describe("a card's statement", () => {
    it("asks for the charge and the 1 Nov cuota, leaving later cuotas for later statements", async () => {
        const visa = await card();
        await spend(visa);

        await expect(statementOf(visa)).resolves.toMatchObject({ due: 70 });
    });

    it.each([
        ["after the close", new Date(2026, 10, 2, 12)],
        ["before the close", new Date(2026, 9, 20, 12)],
    ])("counts a cuota paid ahead once when it is paid %s", async (_, paidOn) => {
        const visa = await card();
        const planId = await spend(visa);
        await pay(planId, 40, paidOn);

        await expect(statementOf(visa)).resolves.toMatchObject({ due: 50 });
    });

    it("does not guess the last statement of a card added after it closed", async () => {
        const visa = await card(new Date(2026, 10, 1, 12));
        await spend(visa);

        await expect(statementOf(visa)).resolves.toMatchObject({ due: null });
    });
});
