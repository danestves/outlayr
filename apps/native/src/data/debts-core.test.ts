import { describe, expect, it } from "@jest/globals";
import { buildRateTable } from "@outlayr/money/valuation";

import { migratedDatabase } from "@/db/test-database";

import { settledBalanceAt } from "./accounts";
import { accountsRepo, getAccountById } from "./accounts-core";
import { categoriesRepo } from "./categories-core";
import {
    createPerson,
    deleteOutsideMove,
    recordBoughtOnCredit,
    recordDebtMovement,
    recordOutsideMove,
    recordSoldOnCredit,
} from "./debts-core";
import { loadContributions } from "./insights";
import { getTransactionById } from "./transactions-core";
import { transfersRepo } from "./transfers-core";

const SEP_20 = new Date("2026-09-20T12:00:00.000Z");
const OCT_2 = new Date("2026-10-02T12:00:00.000Z");
const NOW = new Date("2026-10-18T12:00:00.000Z");
const rates = buildRateTable([]);

async function balanceOf(db: ReturnType<typeof migratedDatabase>, id: string): Promise<number> {
    const account = getAccountById(db, id);
    if (account == null) {
        throw new Error(`No account ${id}`);
    }
    return (await settledBalanceAt(db, account, { displayCurrency: account.currency, rates }, NOW)).value;
}

describe("recording a debt with a person", () => {
    it("leaves you owing a person you borrowed from, on top of an older debt", async () => {
        const db = migratedDatabase({ foreignKeys: false });
        const zinli = await accountsRepo.create(db, { currency: "USD", initialBalance: 0, name: "Zinli" });
        const pedro = await createPerson(db, { currency: "USD", name: " Pedro ", openingBalance: -20 });

        await recordDebtMovement(db, {
            account: { accountId: zinli, amount: 100, currency: "USD" },
            date: OCT_2,
            person: { accountId: pedro, amount: 100, currency: "USD" },
            rateType: null,
            verb: "borrowed",
        });

        expect(getAccountById(db, pedro)).toMatchObject({ kind: "person", name: "Pedro" });
        await expect(balanceOf(db, pedro)).resolves.toBe(-120);
        await expect(balanceOf(db, zinli)).resolves.toBe(100);
    });

    it("keeps each leg in its own currency when you lend across currencies", async () => {
        const db = migratedDatabase({ foreignKeys: false });
        const banesco = await accountsRepo.create(db, { currency: "VES", initialBalance: 5000, name: "Banesco" });
        const ana = await createPerson(db, { currency: "USD", name: "Ana" });

        const id = await recordDebtMovement(db, {
            account: { accountId: banesco, amount: 3650, currency: "VES" },
            date: OCT_2,
            person: { accountId: ana, amount: 100, currency: "USD" },
            rateType: "official",
            verb: "lent",
        });

        await expect(balanceOf(db, ana)).resolves.toBe(100);
        await expect(balanceOf(db, banesco)).resolves.toBe(1350);
        const stored = await transfersRepo.getById(db, id);
        expect(stored).toMatchObject({ exchangeRateType: "official", fromCurrency: "VES", toCurrency: "USD" });
        expect(stored?.exchangeRate).toBeCloseTo(100 / 3650, 10);
    });

    it("counts a sale on credit as income once, titled as a sale, and being paid back only settles it", async () => {
        const db = migratedDatabase({ foreignKeys: false });
        const zinli = await accountsRepo.create(db, { currency: "USD", initialBalance: 0, name: "Zinli" });
        const ana = await createPerson(db, { currency: "USD", name: "Ana" });
        const sales = await categoriesRepo.create(db, {
            color: "#2f855a",
            icon: "Store01",
            income: true,
            name: "Sales",
        });

        const sale = await recordSoldOnCredit(db, {
            amount: 35,
            categoryId: sales,
            date: OCT_2,
            person: { currency: "USD", id: ana },
        });
        await expect(balanceOf(db, ana)).resolves.toBe(35);
        expect(getTransactionById(db, sale)?.note).toBe("Sold on credit");

        await recordDebtMovement(db, {
            account: { accountId: zinli, amount: 35, currency: "USD" },
            date: OCT_2,
            person: { accountId: ana, amount: 35, currency: "USD" },
            rateType: null,
            verb: "gotPaidBack",
        });

        await expect(balanceOf(db, ana)).resolves.toBe(0);
        await expect(balanceOf(db, zinli)).resolves.toBe(35);
        const income = (await loadContributions(db, NOW)).filter((row) => row.income);
        expect(income).toStrictEqual([expect.objectContaining({ amount: 35, categoryId: sales })]);
    });

    it("counts a job owed as spending once, and paying it back only settles it", async () => {
        const db = migratedDatabase({ foreignKeys: false });
        const zinli = await accountsRepo.create(db, { currency: "USD", initialBalance: 100, name: "Zinli" });
        const jose = await createPerson(db, { currency: "USD", name: "José" });
        const repairs = await categoriesRepo.create(db, {
            color: "#937f2b",
            icon: "Wrench01",
            income: false,
            name: "Repairs",
        });

        const job = await recordBoughtOnCredit(db, {
            amount: 80,
            categoryId: repairs,
            date: OCT_2,
            person: { currency: "USD", id: jose },
        });
        await expect(balanceOf(db, jose)).resolves.toBe(-80);
        expect(getTransactionById(db, job)?.note).toBe("Bought on credit");

        await recordDebtMovement(db, {
            account: { accountId: zinli, amount: 80, currency: "USD" },
            date: OCT_2,
            person: { accountId: jose, amount: 80, currency: "USD" },
            rateType: null,
            verb: "paidBack",
        });

        await expect(balanceOf(db, jose)).resolves.toBe(0);
        await expect(balanceOf(db, zinli)).resolves.toBe(20);
        const spent = (await loadContributions(db, NOW)).filter((row) => !row.income);
        expect(spent).toStrictEqual([expect.objectContaining({ amount: 80, categoryId: repairs })]);
    });

    it("settles a debt with moves made outside Outlayr, and moves no account", async () => {
        const db = migratedDatabase({ foreignKeys: false });
        const zinli = await accountsRepo.create(db, { currency: "USD", initialBalance: 100, name: "Zinli" });
        const pedro = await createPerson(db, { currency: "USD", name: "Pedro", openingBalance: -300 });
        const person = { currency: "USD", id: pedro };

        await recordOutsideMove(db, { amount: 100, date: SEP_20, person, verb: "paidBack" });
        await recordOutsideMove(db, { amount: 30, date: OCT_2, person, verb: "borrowed" });
        const mistaken = await recordOutsideMove(db, { amount: 50, date: OCT_2, person, verb: "paidBack" });

        await expect(balanceOf(db, pedro)).resolves.toBe(-180);
        await expect(balanceOf(db, zinli)).resolves.toBe(100);

        await deleteOutsideMove(db, mistaken);
        await expect(balanceOf(db, pedro)).resolves.toBe(-230);
    });
});
