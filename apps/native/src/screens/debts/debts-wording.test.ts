import { describe, expect, it } from "vite-plus/test";

import type { Account } from "@/data/accounts-core";
import { debtsOverview } from "@/domain/debts";

import { debtSubtitle } from "./debts-wording";

type Wording = Parameters<typeof debtSubtitle>[2];

const wording: Wording = {
    currency: "MXN",
    language: "es",
    showCents: true,
    t: ((key: string) => key) as Wording["t"],
};

function cards(...balances: number[]) {
    const rows = balances.map((balance, index) => ({
        account: { currency: "MXN", id: `card-${index}` } as Account,
        balance,
        exact: true,
        id: `card-${index}`,
        kind: "liability" as const,
        multiCurrency: false,
    }));
    return { ...debtsOverview(rows, "MXN"), due: null, installments: new Map() };
}

describe("a card's line on Debts", () => {
    it("says an overpaid card is in your favor, since its row shows the amount unsigned", () => {
        const debts = cards(3322.28);
        expect(debtSubtitle(debts.youOwe[0], debts, wording)).toStrictEqual({
            text: "debts.card.inFavor",
            tone: "income",
        });
    });

    it("stays quiet for a card you owe on", () => {
        const debts = cards(-6222.08);
        expect(debtSubtitle(debts.youOwe[0], debts, wording)).toStrictEqual({ text: null, tone: "muted" });
    });
});
