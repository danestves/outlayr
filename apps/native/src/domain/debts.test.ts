import { describe, expect, it } from "@jest/globals";

import { debtLegs, debtsOverview } from "./debts";
import type { DebtsInputRow } from "./debts";

const row = (id: string, kind: DebtsInputRow["kind"], balance: number): DebtsInputRow => ({
    balance,
    exact: true,
    id,
    kind,
});

describe("the debts overview", () => {
    it("puts cards and people you owe on one side and people who owe you on the other", () => {
        const debts = debtsOverview(
            [
                row("zinli", "asset", 3412.4),
                row("pedro", "person", -50),
                row("visa", "liability", -640),
                row("luis", "person", 15),
                row("ana", "person", 80),
                row("cashea", "liability", -180),
            ],
            "USD"
        );
        expect(debts.youOwe.map((debt) => [debt.id, debt.amount])).toStrictEqual([
            ["visa", 640],
            ["cashea", 180],
            ["pedro", 50],
        ]);
        expect(debts.owedToYou.map((debt) => [debt.id, debt.amount])).toStrictEqual([
            ["ana", 80],
            ["luis", 15],
        ]);
        expect(debts.youOweTotal).toBe(870);
        expect(debts.owedToYouTotal).toBe(95);
        expect(debts.haveTotal).toBe(3507.4);
    });

    it("keeps a person whose float residue rounds to zero as settled", () => {
        const debts = debtsOverview([row("ana", "person", 0.1 + 0.2 - 0.3), row("pedro", "person", 0)], "USD");
        expect(debts.settled.map((debt) => debt.id)).toStrictEqual(["ana", "pedro"]);
        expect(debts.owedToYou).toStrictEqual([]);
        expect(Object.is(debts.owedToYouTotal, 0)).toBe(true);
    });

    it("keeps a paid-off card on the owe side at zero rather than dropping it", () => {
        const debts = debtsOverview([row("visa", "liability", 0)], "USD");
        expect(debts.youOwe.map((debt) => debt.id)).toStrictEqual(["visa"]);
        expect(Object.is(debts.youOwe[0]?.amount, 0)).toBe(true);
    });

    it("holds an overdrawn account against what you have", () => {
        const debts = debtsOverview(
            [row("zinli", "asset", 120), row("bdv", "asset", -20.5), row("ana", "person", 5)],
            "USD"
        );
        expect(debts.haveTotal).toBe(104.5);
    });

    it("is approximate when any debt is, but not when only an asset is", () => {
        const assetOnly = debtsOverview([{ ...row("zinli", "asset", 10), exact: false }], "USD");
        expect(assetOnly.exact).toBe(true);
        expect(assetOnly.assetsExact).toBe(false);
        expect(debtsOverview([{ ...row("ana", "person", 10), exact: false }], "USD").exact).toBe(false);
    });
});

describe("orienting a debt movement", () => {
    const legs = { account: "zinli", person: "pedro" };

    it("brings money from the person when you borrow or get paid back", () => {
        expect(debtLegs("borrowed", legs)).toStrictEqual({ from: "pedro", to: "zinli" });
        expect(debtLegs("gotPaidBack", legs)).toStrictEqual({ from: "pedro", to: "zinli" });
    });

    it("sends money to the person when you lend or pay back", () => {
        expect(debtLegs("lent", legs)).toStrictEqual({ from: "zinli", to: "pedro" });
        expect(debtLegs("paidBack", legs)).toStrictEqual({ from: "zinli", to: "pedro" });
    });
});
