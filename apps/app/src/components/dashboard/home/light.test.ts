import type { Doc, TableNames } from "@outlayr/backend/convex/_generated/dataModel";
import { BUDGET_TYPE } from "@outlayr/money/budget-window";
import { utcDateString } from "@outlayr/money/dates";
import { ledgerCellsOf, openingCells } from "@outlayr/money/ledger-cells";
import { ledgerGlance } from "@outlayr/money/ledger-view";
import { DAY_MS } from "@outlayr/money/ledger-zone";
import { describe, expect, it } from "vite-plus/test";

import type { LedgerBooks } from "@/lib/ledger-books";

import { categoryBudgets, kpis } from "../../../lib/dashboard-series";
import { prepareLedger, rowsBetween, total } from "../../../lib/dashboard-series-ledger";
import { periodOf } from "../../../lib/dashboard-series-period";
import { periodKeysOf } from "../shell/period-keys";
import { listCovered, queryRows, tally } from "../transactions/model";
import { accountBalances, budgetRows, everyDay, homeCovered, sparks } from "./model";

const NOW = Date.parse("2026-10-10T15:00:00Z");
const FIRST_DAY = Date.UTC(2024, 3, 1);
const CUTOFF = Date.UTC(2025, 8, 1);
const SCOPE = { accounts: [] };
const ACCOUNT_IDS = ["cash", "bank", "card"] as const;
const CURRENCIES = ["USD", "VES", "EUR"] as const;
const CATEGORY_IDS = ["food", "rent", "salary", null] as const;
const october = periodOf("2026-10", 1);

function seededRandom(seed: number) {
    let state = seed;
    return () => {
        state = (state * 1_664_525 + 1_013_904_223) % 2 ** 32;
        return state / 2 ** 32;
    };
}

let sequence = 0;
const doc = <Table extends TableNames>(localId: string, fields: Partial<Doc<Table>>) => {
    sequence += 1;
    // SAFETY: the read model only reads the fields each fixture sets.
    return { deletedAt: null, localId, seq: sequence, updatedAt: 0, ...fields } as unknown as Doc<Table>;
};

function books(budget: Partial<Doc<"budgets">> = {}): LedgerBooks {
    const random = seededRandom(11);
    const pick = <T>(values: readonly T[]) => values[Math.floor(random() * values.length)] as T;
    const stamp = () => {
        const date = FIRST_DAY + Math.floor(random() * (NOW - FIRST_DAY));
        return {
            amount: Math.round(random() * 100_000) / 100,
            amountUsd: random() < 0.15 ? null : Math.round(random() * 10_000) / 100,
            date,
            day: date,
            deletedAt: random() < 0.1 ? date : null,
        };
    };
    const account = (localId: string, currency: string, kind?: string) =>
        doc<"accounts">(localId, { currency, initialBalance: 250, initialBalanceDate: FIRST_DAY, kind, name: localId });
    return {
        accounts: [account("cash", "USD"), account("bank", "VES"), account("card", "EUR", "credit")],
        appMeta: [
            { key: "timeZone", value: "America/Caracas" },
            { key: "currency", value: "VES" },
        ],
        budgetPlans: [],
        budgets: [
            doc<"budgets">("budget-food", {
                amount: 400,
                amountUsd: 400,
                categoryId: "food",
                currency: "USD",
                dateCreated: FIRST_DAY,
                rollover: false,
                startDate: FIRST_DAY,
                type: BUDGET_TYPE.month,
                ...budget,
            }),
        ],
        categories: ["food", "rent", "salary"].map((localId) =>
            doc<"categories">(localId, {
                color: "#000000",
                income: localId === "salary",
                name: localId,
                parentId: null,
            })
        ),
        exchangeRates: Array.from({ length: Math.ceil((NOW - FIRST_DAY) / DAY_MS) - 40 }, (_, index) => {
            const date = utcDateString(FIRST_DAY + (index + 40) * DAY_MS);
            return [
                doc<"exchangeRates">(`ves-${date}`, { date, quote: "VES", rate: 40 + index * 0.37 }),
                doc<"exchangeRates">(`eur-${date}`, { date, quote: "EUR", rate: 0.9 + index * 0.0001 }),
            ];
        }).flat(),
        installmentPlans: [doc<"installmentPlans">("plan", { accountId: "card" })],
        installments: [],
        mainBudget: [],
        outsideMoves: Array.from({ length: 80 }, (_, index) =>
            doc<"outsideMoves">(`move-${index}`, { ...stamp(), accountId: pick(ACCOUNT_IDS) })
        ),
        outsidePayments: Array.from({ length: 80 }, (_, index) =>
            doc<"outsidePayments">(`payment-${index}`, { ...stamp(), planId: "plan" })
        ),
        savingsGoals: [],
        transactions: Array.from({ length: 4000 }, (_, index) => {
            const categoryId = pick(CATEGORY_IDS);
            return doc<"transactions">(`entry-${index}`, {
                ...stamp(),
                accountId: pick([...ACCOUNT_IDS, null]),
                categoryId,
                currency: pick(CURRENCIES),
                exchangeRate: null,
                exchangeRateType: null,
                income: categoryId === "salary",
                note: "",
                recurringCoefficient: 1,
                recurringEndDate: null,
                recurringType: index % 9 === 0 ? 1 : 0,
            });
        }),
        transfers: Array.from({ length: 200 }, (_, index) => {
            const row = stamp();
            return doc<"transfers">(`transfer-${index}`, {
                date: row.date,
                day: row.day,
                deletedAt: row.deletedAt,
                fromAccountId: pick(ACCOUNT_IDS),
                fromAmount: row.amount,
                fromAmountUsd: row.amountUsd,
                fromCurrency: pick(CURRENCIES),
                note: "",
                toAccountId: pick(ACCOUNT_IDS),
                toAmount: Math.round(random() * 100_000) / 100,
                toAmountUsd: row.amountUsd,
                toCurrency: pick(CURRENCIES),
            });
        }),
    };
}

function opened(all: LedgerBooks, cutoff = CUTOFF) {
    const before = <Row extends { date: number; deletedAt: number | null }>(rows: readonly Row[]) =>
        rows.filter((row) => row.deletedAt === null && row.date < cutoff);
    const since = <Row extends { date: number }>(rows: readonly Row[]) => rows.filter((row) => row.date >= cutoff);
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
        cutoff,
    };
    const recent: LedgerBooks = {
        ...all,
        outsideMoves: since(all.outsideMoves),
        outsidePayments: since(all.outsidePayments),
        transactions: all.transactions.filter(
            (row) => row.deletedAt === null && (row.date >= cutoff || row.recurringType > 0)
        ),
        transfers: since(all.transfers),
    };
    return { opening, recent };
}

const home = (ledger: ReturnType<typeof prepareLedger>, glance: ReturnType<typeof ledgerGlance>) => ({
    balances: accountBalances(ledger, october, false, []),
    budgets: budgetRows(ledger, categoryBudgets(ledger, october)),
    days: everyDay(ledger, october, SCOPE, []),
    figures: kpis(ledger, october, SCOPE),
    lines: sparks(ledger, october, SCOPE),
    net: glance.balances.net,
    owed: glance.balances.owed,
    rows: glance.balances.accounts.map((account) => account.balanceInMainCurrency),
    upcoming: glance.upcoming,
});

describe("Home on the rows since thirteen months back", () => {
    it("shows the figures the whole ledger gives", () => {
        const all = books();
        const { opening, recent } = opened(all);
        const light = prepareLedger(recent, NOW, opening);

        const whole = prepareLedger(all, NOW);
        const listed = periodKeysOf(light, october.key).map((key) => periodOf(key, 1));
        const spent = (ledger: typeof light) =>
            listed.map(({ from, to }) => total(ledger, rowsBetween(ledger, SCOPE, from, to, false)));

        expect(homeCovered(light, october)).toBe(true);
        expect(home(light, ledgerGlance(recent, NOW, opening))).toStrictEqual(home(whole, ledgerGlance(all, NOW)));
        expect(listed.length).toBeGreaterThan(12);
        expect(spent(light)).toStrictEqual(spent(whole));
    });

    it("waits for the whole ledger when a figure reaches further back", () => {
        const { opening, recent } = opened(books());
        const carrying = opened(books({ rollover: true }));

        expect(homeCovered(prepareLedger(recent, NOW, opening), periodOf("2026-07", 1))).toBe(false);
        expect(homeCovered(prepareLedger(carrying.recent, NOW, carrying.opening), october)).toBe(false);
    });

    it("lists a month of entries as the whole ledger does, from the rows since the month before", () => {
        const all = books();
        const { opening, recent } = opened(all, Date.UTC(2026, 8, 1));
        const light = prepareLedger(recent, NOW, opening);
        const whole = prepareLedger(all, NOW);
        const listed = (ledger: typeof light) => {
            const rows = queryRows(
                ledger,
                {
                    accounts: [],
                    categories: [],
                    max: null,
                    min: null,
                    q: "",
                    range: october,
                    sort: "newest",
                    type: undefined,
                },
                () => ""
            );
            return { rows, totals: tally(ledger, rows) };
        };

        expect(listCovered(light, october)).toBe(true);
        expect(listCovered(light, periodOf("2026-08", 1))).toBe(false);
        expect(listCovered(light, null)).toBe(false);
        expect(listed(light).rows.length).toBeGreaterThan(20);
        expect(listed(light)).toStrictEqual(listed(whole));
    });
});
