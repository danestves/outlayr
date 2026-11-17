import { describe, expect, it } from "vite-plus/test";

import { utcDateString } from "./dates";
import { ledgerCellsOf, openingCells } from "./ledger-cells";
import { accountBalances, rateTableOf } from "./ledger-view";
import { DAY_MS, fixedOffset } from "./ledger-zone";

type Books = Parameters<typeof accountBalances>[0];

const FIRST_DAY = Date.UTC(2026, 0, 1);
const DAYS = 120;
const CUTOFF = FIRST_DAY + 80 * DAY_MS;
const NOW = FIRST_DAY + 110 * DAY_MS;
const RATES_FROM_DAY = 20;
const HOUR_MS = 3_600_000;
const CURRENCIES = ["USD", "VES", "EUR", null] as const;
const ACCOUNT_IDS = ["cash", "bank", "card", "closed", "gone"] as const;
const PLAN_IDS = ["plan-bank", "plan-card", "plan-dropped"] as const;
const LOOK = { customColor: null, emoji: null, icon: null, imageColor: null, imageKey: null };

function seededRandom(seed: number) {
    let state = seed;
    return () => {
        state = (state * 1_664_525 + 1_013_904_223) % 2 ** 32;
        return state / 2 ** 32;
    };
}

function ledger(seed: number): Books {
    const random = seededRandom(seed);
    const pick = <T>(values: readonly T[]) => values[Math.floor(random() * values.length)] as T;
    let seq = 0;
    const stamp = () => {
        seq += 1;
        const date = FIRST_DAY + Math.floor(random() * DAYS * DAY_MS);
        return {
            amount: Math.round(random() * 100_000) / 100,
            amountUsd: random() < 0.2 ? null : Math.round(random() * 10_000) / 100,
            date,
            deletedAt: random() < 0.1 ? date : null,
            seq,
        };
    };
    const account = (localId: string, currency: string, row: Partial<Books["accounts"][number]> = {}) => ({
        ...LOOK,
        currency,
        deletedAt: null,
        initialBalance: 250,
        localId,
        name: localId,
        sortOrder: 0,
        ...row,
    });
    return {
        accounts: [
            account("cash", "USD"),
            account("bank", "VES"),
            account("card", "EUR", { kind: "credit" }),
            account("closed", "USD", { archivedAt: NOW }),
            account("gone", "USD", { deletedAt: NOW }),
        ],
        installmentPlans: [
            { accountId: "bank", deletedAt: null, localId: "plan-bank" },
            { accountId: "card", deletedAt: null, localId: "plan-card" },
            { accountId: "cash", deletedAt: NOW, localId: "plan-dropped" },
        ],
        outsideMoves: Array.from({ length: 60 }, () => ({ ...stamp(), accountId: pick(ACCOUNT_IDS) })),
        outsidePayments: Array.from({ length: 60 }, () => ({ ...stamp(), planId: pick(PLAN_IDS) })),
        transactions: Array.from({ length: 6000 }, (_, index) => {
            const row = stamp();
            return {
                ...LOOK,
                ...row,
                accountId: pick([...ACCOUNT_IDS, null]),
                categoryId: null,
                currency: pick(CURRENCIES),
                day: row.date,
                exchangeRate: null,
                exchangeRateType: null,
                income: random() < 0.3,
                localId: `entry-${index}`,
                note: "",
                recurringCoefficient: 1,
                recurringEndDate: null,
                recurringType: index % 7 === 0 ? 1 : 0,
            };
        }),
        transfers: Array.from({ length: 120 }, (_, index) => {
            const row = stamp();
            return {
                date: row.date,
                day: row.date,
                deletedAt: row.deletedAt,
                fromAccountId: pick(ACCOUNT_IDS),
                fromAmount: row.amount,
                fromAmountUsd: row.amountUsd,
                fromCurrency: pick(["USD", "VES", "EUR"]),
                localId: `transfer-${index}`,
                note: "",
                seq: row.seq,
                toAccountId: pick(ACCOUNT_IDS),
                toAmount: Math.round(random() * 100_000) / 100,
                toAmountUsd: row.amountUsd,
                toCurrency: pick(["USD", "VES", "EUR"]),
            };
        }),
    };
}

const rates = rateTableOf(
    Array.from({ length: DAYS - RATES_FROM_DAY }, (_, index) => {
        const date = utcDateString(FIRST_DAY + (index + RATES_FROM_DAY) * DAY_MS);
        return [
            { date, quote: "VES", rate: 40 + index * 0.37 },
            { date, quote: "EUR", rate: 0.9 + index * 0.001 },
        ];
    }).flat()
);

const split = (currency: string, offsetMs: number) => {
    const clock = { now: NOW, offsetAt: fixedOffset(offsetMs) };
    const all = ledger(5);
    const before = <Row extends { date: number; deletedAt: number | null }>(rows: readonly Row[]) =>
        rows.filter((row) => row.deletedAt === null && row.date < CUTOFF);
    const after = <Row extends { date: number }>(rows: readonly Row[]) => rows.filter((row) => row.date >= CUTOFF);
    const opening = {
        cells: openingCells(
            ledgerCellsOf({
                outsideMoves: before(all.outsideMoves),
                outsidePayments: before(all.outsidePayments),
                transactions: before(all.transactions),
                transfers: before(all.transfers),
            }),
            all.accounts,
            all.installmentPlans
        ),
        cutoff: CUTOFF,
    };
    const recent = {
        ...all,
        outsideMoves: after(all.outsideMoves),
        outsidePayments: after(all.outsidePayments),
        transactions: all.transactions.filter((row) => row.date >= CUTOFF || row.recurringType > 0),
        transfers: after(all.transfers),
    };
    return {
        opened: accountBalances(recent, currency, rates, clock, opening),
        whole: accountBalances(all, currency, rates, clock),
    };
};

const inMainCurrency = ({ accounts, ...totals }: ReturnType<typeof accountBalances>) => ({
    ...totals,
    accounts: accounts.map(({ balance: _own, ...account }) => account),
});

describe("an opening", () => {
    it.each(["USD", "VES"])("gives the %s balances of every row from only the rows after it", (currency) => {
        const { opened, whole } = split(currency, 0);

        expect(opened).toStrictEqual(whole);
        expect(whole.accounts.filter((account) => !account.exact)).not.toHaveLength(0);
    });

    it("keeps every main-currency figure where the owner's day is not the UTC day", () => {
        const { opened, whole } = split("VES", -4 * HOUR_MS);

        expect(inMainCurrency(opened)).toStrictEqual(inMainCurrency(whole));
    });
});
