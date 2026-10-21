import { beforeEach, describe, expect, it } from "@jest/globals";
import { utcDateString } from "@outlayr/money/dates";
import { buildRateTable } from "@outlayr/money/valuation";
import { and, eq, isNotNull, isNull } from "drizzle-orm";

import type { Database } from "@/db/client";
import { exchangeRates, installmentPlans, installments, outsidePayments, transactions, transfers } from "@/db/schema";
import { transactionalDatabase } from "@/db/test-database";
import { generateSchedule } from "@/domain/installments";

import { settledBalanceAt } from "./accounts";
import { accountsRepo, getAccountById } from "./accounts-core";
import { installmentsRepo, readPlans, upcomingInstallments } from "./installments-core";
import type { PaymentSource } from "./installments-core";
import { transactionsRepo } from "./transactions-core";
import { transfersRepo } from "./transfers-core";

const PURCHASE = new Date(2026, 9, 18, 15, 0);
const VES_PER_USD = 200;

let db: Database;
let bank: string;
let bolivares: string;
let cashea: string;

beforeEach(async () => {
    db = transactionalDatabase();
    await db.insert(exchangeRates).values({
        date: utcDateString(PURCHASE.getTime()),
        fetchedAt: 0,
        quote: "VES",
        rate: VES_PER_USD,
        rateType: "official",
        source: "test",
    });
    bank = await accountsRepo.create(db, { currency: "USD", name: "Zinli" });
    bolivares = await accountsRepo.create(db, { currency: "VES", name: "Banesco" });
    cashea = await accountsRepo.create(db, { currency: "USD", kind: "liability", name: "Cashea" });
});

const fromBank = (amount: number): PaymentSource => ({
    exchangeRate: null,
    exchangeRateType: null,
    fromAccountId: bank,
    fromAmount: amount,
    fromCurrency: "USD",
});

/** A $100 Cashea order: $40 upfront from the bank, then 3 cuotas every 14 days. */
async function order(accountId = cashea): Promise<string> {
    const { planId } = await installmentsRepo.createOrder(db, {
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
        upfront: fromBank(40),
    });
    return planId;
}

describe("creating an order", () => {
    it("writes the purchase at full price, the schedule, and the upfront paid from the bank", async () => {
        const planId = await order();

        const [plan] = await db.select().from(installmentPlans);
        const [purchase] = await db
            .select()
            .from(transactions)
            .where(eq(transactions.id, plan?.transactionId ?? ""));
        expect(purchase).toMatchObject({ accountId: cashea, amount: 100, income: false });
        const rows = await db.select().from(installments).where(eq(installments.planId, planId));
        expect(rows.map((row) => [row.sequence, row.amount]).sort()).toStrictEqual([
            [0, 40],
            [1, 20],
            [2, 20],
            [3, 20],
        ]);
        const [upfront] = await db.select().from(transfers);
        expect(upfront).toMatchObject({
            day: new Date(2026, 9, 18),
            fromAccountId: bank,
            installmentPlanId: planId,
            toAccountId: cashea,
            toAmount: 40,
        });

        const [standing] = readPlans(db, PURCHASE);
        expect(standing?.standing).toMatchObject({ installmentsPaid: 0, paid: 40, remaining: 60 });
        expect(standing?.purchase?.note).toBe("Shoes");
    });

    it("refuses an asset account and leaves nothing behind", async () => {
        await expect(order(bank)).rejects.toThrow("liability");
        await expect(db.select().from(transactions)).resolves.toStrictEqual([]);
        await expect(db.select().from(transfers)).resolves.toStrictEqual([]);
    });
});

describe("paying an order", () => {
    it("counts what arrives in the plan's currency when bolivares pay a dollar cuota", async () => {
        const planId = await order();
        await installmentsRepo.recordPayment(db, {
            amount: 20,
            date: PURCHASE,
            planId,
            source: {
                exchangeRate: VES_PER_USD,
                exchangeRateType: "official",
                fromAccountId: bolivares,
                fromAmount: 4000,
                fromCurrency: "VES",
            },
        });

        const [{ standing } = { standing: null }] = readPlans(db, PURCHASE);
        expect(standing).toMatchObject({ installmentsPaid: 1, paid: 60, remaining: 40 });
        expect(standing?.next?.row.sequence).toBe(2);
    });

    it("stops counting a payment once it is deleted", async () => {
        const planId = await order();
        const payment = await installmentsRepo.recordPayment(db, {
            amount: 20,
            date: PURCHASE,
            planId,
            source: fromBank(20),
        });
        await transfersRepo.softDelete(db, payment);
        expect(readPlans(db, PURCHASE)[0]?.standing.paid).toBe(40);
    });

    it("keeps the link when the transfer editor saves without knowing about it", async () => {
        await order();
        const [upfront] = await db.select().from(transfers);
        await transfersRepo.update(db, upfront?.id ?? "", {
            ...fromBank(40),
            date: PURCHASE,
            note: "inicial",
            toAccountId: cashea,
            toAmount: 40,
            toCurrency: "USD",
        });
        expect(readPlans(db, PURCHASE)[0]?.standing.paid).toBe(40);
    });
});

describe("editing and removing", () => {
    it("lists an overdue row and rows due within the window, after moving one", async () => {
        const planId = await order();
        const rows = await db.select().from(installments).where(eq(installments.planId, planId));
        const third = rows.find((row) => row.sequence === 3);
        await installmentsRepo.updateInstallment(db, third?.id ?? "", { dueDate: new Date(2026, 10, 10, 9) });

        const today = new Date(2026, 10, 3);
        const upcoming = upcomingInstallments(readPlans(db, today), new Date(2026, 10, 17));
        expect(upcoming.map(({ standing }) => [standing.row.sequence, standing.overdue])).toStrictEqual([
            [1, true],
            [3, false],
            [2, false],
        ]);
    });

    it("drops a deleted row from what is owed", async () => {
        const planId = await order();
        const rows = await db.select().from(installments).where(eq(installments.planId, planId));
        await installmentsRepo.deleteInstallment(db, rows.find((row) => row.sequence === 3)?.id ?? "");
        expect(readPlans(db, PURCHASE)[0]?.standing.remaining).toBe(40);
    });

    it("deletes the order with its purchase entry", async () => {
        await order();
        const [plan] = await db.select().from(installmentPlans);
        await transactionsRepo.remove(db, plan?.transactionId ?? "");
        expect(readPlans(db, PURCHASE)).toStrictEqual([]);
        await expect(db.select().from(installments).where(isNull(installments.deletedAt))).resolves.toStrictEqual([]);
    });

    it("brings the order back with its payments when the purchase is restored", async () => {
        const planId = await order();
        await installmentsRepo.recordPayment(db, { amount: 20, date: PURCHASE, planId, source: fromBank(20) });
        const before = readPlans(db, PURCHASE)[0]?.standing;
        const [plan] = await db.select().from(installmentPlans);

        await transactionsRepo.remove(db, plan?.transactionId ?? "");
        await transactionsRepo.restore(db, plan?.transactionId ?? "");

        const after = readPlans(db, PURCHASE)[0]?.standing;
        expect(after).toMatchObject({ paid: 60, remaining: 40 });
        expect(after?.rows.map((row) => [row.row.sequence, row.status])).toStrictEqual(
            before?.rows.map((row) => [row.row.sequence, row.status])
        );
    });

    it("deletes the order with its account", async () => {
        await order();
        await accountsRepo.softDelete(db, cashea);
        expect(readPlans(db, PURCHASE)).toStrictEqual([]);
    });
});

async function balanceOf(id: string, now: Date): Promise<number> {
    const account = getAccountById(db, id);
    if (!account) {
        throw new Error(`No account ${id}`);
    }
    return (await settledBalanceAt(db, account, { displayCurrency: "USD", rates: buildRateTable([]) }, now)).value;
}

/** The $100 order bought on Aug 1, before Outlayr: the upfront and the first `paid` cuotas settled outside it. */
async function startedBefore(paid: number): Promise<string> {
    const bought = new Date(2026, 7, 1, 12);
    const { planId } = await installmentsRepo.createOrder(db, {
        installmentsPaidOutside: paid,
        purchase: {
            accountId: cashea,
            amount: 100,
            categoryId: null,
            currency: "USD",
            date: bought,
            details: null,
            income: false,
            note: "Phone",
        },
        schedule: generateSchedule({
            amount: { total: 60 },
            count: 3,
            currency: "USD",
            interval: { every: 14, kind: "days" },
            purchaseDay: bought,
            upfront: 40,
        }),
        upfront: null,
    });
    return planId;
}

describe("payments made outside Outlayr", () => {
    const tonight = new Date(2026, 9, 18, 23);

    it("starts an order part paid, owing only the rest, and a later payment continues from there", async () => {
        const planId = await startedBefore(2);

        const standing = readPlans(db, PURCHASE)[0]?.standing;
        expect(standing?.rows.map((row) => [row.row.sequence, row.status])).toStrictEqual([
            [0, "paid"],
            [1, "paid"],
            [2, "paid"],
            [3, "unpaid"],
        ]);
        expect(standing).toMatchObject({ installmentsPaid: 2, paid: 80, remaining: 20 });
        await expect(balanceOf(cashea, tonight)).resolves.toBe(-20);
        await expect(balanceOf(bank, tonight)).resolves.toBe(0);
        await expect(db.select().from(transfers)).resolves.toStrictEqual([]);

        await installmentsRepo.recordPayment(db, { amount: 20, date: PURCHASE, planId, source: fromBank(20) });
        expect(readPlans(db, PURCHASE)[0]?.standing).toMatchObject({ finished: true, installmentsPaid: 3 });
        await expect(balanceOf(cashea, tonight)).resolves.toBe(0);
        await expect(balanceOf(bank, tonight)).resolves.toBe(-20);
    });

    it("takes its effect on the balance away with the purchase and brings it back on restore", async () => {
        await startedBefore(1);
        const [plan] = await db.select().from(installmentPlans);

        await transactionsRepo.remove(db, plan?.transactionId ?? "");
        await expect(balanceOf(cashea, tonight)).resolves.toBe(0);
        expect(readPlans(db, PURCHASE)).toStrictEqual([]);

        await transactionsRepo.restore(db, plan?.transactionId ?? "");
        await expect(balanceOf(cashea, tonight)).resolves.toBe(-40);
        expect(readPlans(db, PURCHASE)[0]?.standing).toMatchObject({ installmentsPaid: 1, paid: 60 });
    });

    it("counts a mid-plan payment with no account, moves no bank, and undoes it on its own", async () => {
        const planId = await order();
        const outside = await installmentsRepo.recordPayment(db, { amount: 20, date: PURCHASE, planId, source: null });
        await installmentsRepo.recordPayment(db, { amount: 20, date: PURCHASE, planId, source: fromBank(20) });

        expect(readPlans(db, PURCHASE)[0]?.standing).toMatchObject({ installmentsPaid: 2, remaining: 20 });
        await expect(balanceOf(cashea, tonight)).resolves.toBe(-20);
        await expect(balanceOf(bank, tonight)).resolves.toBe(-60);

        await installmentsRepo.deleteOutsidePayment(db, outside);
        expect(readPlans(db, PURCHASE)[0]?.standing).toMatchObject({ installmentsPaid: 1, remaining: 40 });
        await expect(balanceOf(cashea, tonight)).resolves.toBe(-40);
        await expect(db.select().from(outsidePayments).where(isNull(outsidePayments.deletedAt))).resolves.toStrictEqual(
            []
        );
    });
});

describe("deleting an order", () => {
    const tonight = new Date(2026, 9, 18, 23);
    const schedule = () => readPlans(db, PURCHASE)[0]?.standing.rows.map((row) => [row.row.sequence, row.row.amount]);

    it("drops the pending cuotas, trims a partly paid one, and keeps the balance its payments made", async () => {
        const planId = await order();
        await installmentsRepo.recordPayment(db, { amount: 20, date: PURCHASE, planId, source: null });
        await installmentsRepo.recordPayment(db, { amount: 5, date: PURCHASE, planId, source: fromBank(5) });
        await expect(balanceOf(cashea, tonight)).resolves.toBe(-35);

        await installmentsRepo.deletePlan(db, planId);

        expect(schedule()).toStrictEqual([
            [0, 40],
            [1, 20],
            [2, 5],
        ]);
        expect(readPlans(db, PURCHASE)[0]?.standing).toMatchObject({ finished: true, paid: 65, remaining: 0 });
        await expect(balanceOf(cashea, tonight)).resolves.toBe(-35);
        await expect(balanceOf(bank, tonight)).resolves.toBe(-45);
    });

    it("removes an order with nothing paid entirely", async () => {
        const planId = await order();
        const [upfront] = await db.select().from(transfers);
        await transfersRepo.softDelete(db, upfront?.id ?? "");

        await installmentsRepo.deletePlan(db, planId);

        expect(readPlans(db, PURCHASE)).toStrictEqual([]);
        await expect(db.select().from(installments).where(isNull(installments.deletedAt))).resolves.toStrictEqual([]);
    });

    it("leaves a finished order as it is", async () => {
        const planId = await startedBefore(3);
        const before = await db.select().from(installments);

        await installmentsRepo.deletePlan(db, planId);

        await expect(db.select().from(installments)).resolves.toStrictEqual(before);
        await expect(balanceOf(cashea, tonight)).resolves.toBe(0);
    });
});

describe("late fees", () => {
    const tonight = new Date(2026, 9, 18, 23);
    const cuota = async (planId: string, sequence: number) =>
        (await db.select().from(installments).where(eq(installments.planId, planId))).find(
            (row) => row.sequence === sequence
        )?.id ?? "";
    const liveFees = () =>
        db
            .select()
            .from(transactions)
            .where(and(isNotNull(transactions.installmentId), isNull(transactions.deletedAt)));

    it("owes the fee on the order and settles the liability at zero once base and fee are paid", async () => {
        const planId = await order();
        await installmentsRepo.addFee(db, { amount: 4, date: PURCHASE, installmentId: await cuota(planId, 3) });
        expect(readPlans(db, PURCHASE)[0]?.standing).toMatchObject({ remaining: 64, scheduled: 104 });
        await expect(balanceOf(cashea, tonight)).resolves.toBe(-64);

        await installmentsRepo.recordPayment(db, { amount: 64, date: PURCHASE, planId, source: fromBank(64) });

        expect(readPlans(db, PURCHASE)[0]?.standing).toMatchObject({ finished: true, overpaid: 0 });
        await expect(balanceOf(cashea, tonight)).resolves.toBe(0);
        await expect(balanceOf(bank, tonight)).resolves.toBe(-104);
    });

    it("replaces the cuota's fee instead of adding a second one", async () => {
        const planId = await order();
        const installmentId = await cuota(planId, 2);
        const first = await installmentsRepo.addFee(db, { amount: 4, date: PURCHASE, installmentId });
        const second = await installmentsRepo.addFee(db, { amount: 5, installmentId });

        expect(second).toBe(first);
        await expect(liveFees()).resolves.toMatchObject([{ amount: 5, date: PURCHASE, income: false }]);
        expect(readPlans(db, PURCHASE)[0]?.standing.remaining).toBe(65);
    });

    it("leaves the order when the fee is deleted from the ledger or removed from the cuota", async () => {
        const planId = await order();
        const installmentId = await cuota(planId, 1);
        const fee = await installmentsRepo.addFee(db, { amount: 4, date: PURCHASE, installmentId });

        await transactionsRepo.remove(db, fee);
        expect(readPlans(db, PURCHASE)[0]?.standing.remaining).toBe(60);
        await expect(balanceOf(cashea, tonight)).resolves.toBe(-60);

        await installmentsRepo.addFee(db, { amount: 4, date: PURCHASE, installmentId });
        await installmentsRepo.removeFee(db, installmentId);
        expect(readPlans(db, PURCHASE)[0]?.standing.remaining).toBe(60);
        await expect(liveFees()).resolves.toStrictEqual([]);
    });

    it("goes with the purchase and comes back when it is restored", async () => {
        const planId = await order();
        await installmentsRepo.addFee(db, { amount: 4, date: PURCHASE, installmentId: await cuota(planId, 3) });
        const [plan] = await db.select().from(installmentPlans);

        await transactionsRepo.remove(db, plan?.transactionId ?? "");
        await expect(balanceOf(cashea, tonight)).resolves.toBe(40);
        await expect(liveFees()).resolves.toStrictEqual([]);

        await transactionsRepo.restore(db, plan?.transactionId ?? "");
        await expect(balanceOf(cashea, tonight)).resolves.toBe(-64);
        expect(readPlans(db, PURCHASE)[0]?.standing.remaining).toBe(64);
    });

    it("keeps charged fees in the ledger when the pending cuotas are deleted", async () => {
        const planId = await order();
        await installmentsRepo.addFee(db, { amount: 4, date: PURCHASE, installmentId: await cuota(planId, 2) });
        await installmentsRepo.addFee(db, { amount: 4, date: PURCHASE, installmentId: await cuota(planId, 3) });
        await installmentsRepo.recordPayment(db, { amount: 42.2, date: PURCHASE, planId, source: fromBank(42.2) });
        await expect(balanceOf(cashea, tonight)).resolves.toBeCloseTo(-25.8, 10);

        await installmentsRepo.deletePlan(db, planId);

        const standing = readPlans(db, PURCHASE)[0]?.standing;
        expect(standing?.rows.map(({ row }) => [row.sequence, row.amount, row.fee])).toStrictEqual([
            [0, 40, 0],
            [1, 20, 0],
            [2, 18.2, 4],
        ]);
        expect(standing).toMatchObject({ finished: true, remaining: 0 });
        await expect(balanceOf(cashea, tonight)).resolves.toBeCloseTo(-25.8, 10);
        await expect(liveFees()).resolves.toHaveLength(2);
    });

    it("detaches the fee from a cuota trimmed below it", async () => {
        const planId = await order();
        await installmentsRepo.addFee(db, { amount: 4, date: PURCHASE, installmentId: await cuota(planId, 2) });
        await installmentsRepo.recordPayment(db, { amount: 23, date: PURCHASE, planId, source: fromBank(23) });

        await installmentsRepo.deletePlan(db, planId);

        const standing = readPlans(db, PURCHASE)[0]?.standing;
        expect(standing?.rows.map(({ row }) => [row.sequence, row.amount, row.fee])).toStrictEqual([
            [0, 40, 0],
            [1, 20, 0],
            [2, 3, 0],
        ]);
        expect(standing).toMatchObject({ finished: true, paid: 63 });
        await expect(balanceOf(cashea, tonight)).resolves.toBe(-41);
    });
});
