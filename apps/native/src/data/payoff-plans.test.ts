import { describe, expect, it } from "@jest/globals";
import { buildRateTable } from "@outlayr/money/valuation";

import { migratedDatabase } from "@/db/test-database";
import type { PlottedCell } from "@/domain/goal-balance-series";

import { getAccountById, accountsRepo } from "./accounts-core";
import { createPerson, recordDebtMovement } from "./debts-core";
import { livePayoffPlanCount, payoffEndedOn, payoffLines, setPayoffPlan } from "./payoff-plans";
import { savingsGoalsQuery } from "./savings-goals-core";
import type { SavingsGoal } from "./savings-goals-core";

const SET = new Date(2026, 8, 1);
const NOW = new Date(2026, 9, 18, 12).getTime();

// Ana owed Bs 1,000 when the plan was set, at 40 a dollar; the bolivar is now at 80.
const plan: SavingsGoal = {
    accountId: "ana",
    currency: "VES",
    dateCreated: SET,
    deletedAt: null,
    exchangeRate: 40,
    id: "plan",
    name: "Ana",
    sortOrder: 0,
    startAmount: 1000,
    startAmountUsd: 25,
    targetAmount: 0,
    targetAmountUsd: 0,
    targetDate: new Date(2026, 11, 1),
    updatedAt: SET,
};
const rates = buildRateTable([
    { date: "2026-09-01", quote: "VES", rate: 40 },
    { date: "2026-10-01", quote: "VES", rate: 80 },
]);
const row = (balance: number, exact = true) => ({
    balance,
    exact,
    id: "ana",
    kind: "person" as const,
    multiCurrency: false,
});

describe("payoffLines", () => {
    it("reads a debt in a currency that fell as unpaid until it is paid", () => {
        // Still Bs 1,000, now $12.50. Against the $25 it was frozen at, half would read as paid.
        const line = payoffLines([plan], [row(12.5)], { displayCurrency: "USD", rates }, NOW).get("ana");
        expect(line?.fraction).toBe(0);
        expect(line?.reached).toBe(false);
    });

    it("draws no fill before the rates arrive, rather than paid off", () => {
        const noRates = { displayCurrency: "USD", rates: buildRateTable([]) };
        const line = payoffLines([plan], [row(0, false)], noRates, NOW).get("ana");
        expect(line).toMatchObject({ fraction: null, reached: false, tick: null });
    });

    it("states how far behind the date's line a card is, as a positive figure", () => {
        // Visa owed $1,600 on 1 Sep with a plan to 1 Mar; on 18 Oct it owes $1,240.
        const visa = {
            ...plan,
            accountId: "visa",
            currency: "USD",
            startAmount: -1600,
            targetDate: new Date(2027, 2, 1),
        };
        const card = { ...row(-1240), id: "visa", kind: "liability" as const };
        const line = payoffLines([visa], [card], { displayCurrency: "USD", rates }, NOW).get("visa");
        expect(line?.behind).toBeCloseTo(55.47, 2);
        const ahead = payoffLines([visa], [{ ...card, balance: -1000 }], { displayCurrency: "USD", rates }, NOW);
        expect(ahead.get("visa")?.behind).toBeNull();
    });
});

const usd = { currency: "USD" } as const;
const cell = (plotDay: string, amount: number, income: boolean): PlottedCell => ({
    amount,
    amountUsd: amount,
    count: 1,
    currencyCode: "USD",
    dateKey: plotDay,
    income,
    plotDay,
    unconvertedAmount: 0,
    unconvertedCount: 0,
});
const noRates = buildRateTable([]);

describe("payoffEndedOn", () => {
    it("ends a card's plan on the day it reached zero, and a purchase the next day does not reopen it", () => {
        const card = { ...usd, initialBalance: -100 };
        const cells = [cell("2027-02-12", 100, true), cell("2027-02-13", 5, false)];
        const set = { dateCreated: new Date(2027, 1, 1, 9), startAmount: -100 };
        expect(payoffEndedOn(set, card, cells, noRates)).toBe("2027-02-12");
    });

    it("ends a person's plan on the day they paid back past zero", () => {
        // Ana owed you $80 and paid back $100: now you owe her $20.
        const ana = { ...usd, initialBalance: 80 };
        const set = { dateCreated: new Date(2026, 9, 1, 9), startAmount: 80 };
        expect(payoffEndedOn(set, ana, [cell("2026-10-20", 100, false)], noRates)).toBe("2026-10-20");
    });

    it("ends on a day paid off in the morning and used again by night", () => {
        const card = { ...usd, initialBalance: -100 };
        const cells = [cell("2027-01-10", 100, true), cell("2027-01-10", 30, false)];
        const set = { dateCreated: new Date(2027, 0, 5, 9), startAmount: -100 };
        expect(payoffEndedOn(set, card, cells, noRates)).toBe("2027-01-10");
    });

    it("is not ended by a zero from before the plan was set, nor by payments short of zero", () => {
        const card = { ...usd, initialBalance: 0 };
        const cells = [
            cell("2027-01-02", 50, false),
            cell("2027-01-03", 50, true),
            cell("2027-01-04", 100, false),
            // Paid it off, spent $100 again and then set the plan, all the same day.
            cell("2027-01-05", 100, true),
            cell("2027-01-05", 100, false),
            cell("2027-01-10", 30, false),
            cell("2027-01-10", 60, true),
        ];
        const set = { dateCreated: new Date(2027, 0, 5, 9), startAmount: -100 };
        expect(payoffEndedOn(set, card, cells, noRates)).toBeNull();
    });
});

const DAY_MS = 86_400_000;

describe("setting payoff plans", () => {
    it("counts only live plans, and a new plan replaces the one that ended", async () => {
        const db = migratedDatabase({ foreignKeys: false });
        // Plans are stamped with the real clock, so every movement comes after it.
        const start = Date.now();
        const at = (days: number) => new Date(start + days * DAY_MS);
        const zinli = await accountsRepo.create(db, { currency: "USD", initialBalance: 0, name: "Zinli" });
        const pedro = await createPerson(db, { currency: "USD", name: "Pedro", openingBalance: 80 });
        const ana = await createPerson(db, { currency: "USD", name: "Ana", openingBalance: -30 });
        const person = (id: string) => {
            const account = getAccountById(db, id);
            if (account == null) {
                throw new Error(`No account ${id}`);
            }
            return account;
        };
        const move = (verb: "gotPaidBack" | "lent", amount: number, day: number) =>
            recordDebtMovement(db, {
                account: { accountId: zinli, amount, currency: "USD" },
                date: at(day),
                person: { accountId: pedro, amount, currency: "USD" },
                rateType: null,
                verb,
            });

        await setPayoffPlan(db, person(pedro), at(30));
        await setPayoffPlan(db, person(ana), at(30));
        await expect(livePayoffPlanCount(db, null, at(1))).resolves.toBe(2);
        await expect(livePayoffPlanCount(db, ana, at(1))).resolves.toBe(1);

        await move("gotPaidBack", 80, 2);
        await move("lent", 20, 3);
        await expect(livePayoffPlanCount(db, null, at(4))).resolves.toBe(1);
        await accountsRepo.softDelete(db, ana);
        await expect(livePayoffPlanCount(db, null, at(4))).resolves.toBe(0);

        await setPayoffPlan(db, person(pedro), at(40), at(4));
        const plans = (await savingsGoalsQuery(db)).filter((goal) => goal.accountId === pedro);
        expect(plans).toHaveLength(1);
        expect(plans[0]).toMatchObject({ startAmount: 20, targetDate: at(40) });
    });

    it("sets no plan on a settled person", async () => {
        const db = migratedDatabase({ foreignKeys: false });
        const luis = await createPerson(db, { currency: "USD", name: "Luis" });
        const account = getAccountById(db, luis);
        if (account == null) {
            throw new Error("No Luis");
        }
        await expect(setPayoffPlan(db, account, new Date(Date.now() + 30 * DAY_MS))).resolves.toBeNull();
        await expect(savingsGoalsQuery(db)).resolves.toHaveLength(0);
    });
});
