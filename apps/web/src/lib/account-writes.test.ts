import { describe, expect, it } from "vite-plus/test";

import { netAfterDelete } from "../components/dashboard/accounts/model";
import {
    archivedAccount,
    checkedAccount,
    createdAccount,
    deletedAccount,
    editedAccount,
    frozenUsd,
    parseAmount,
} from "./account-writes";
import { prepareLedger } from "./dashboard-series-ledger";
import type { LedgerBooks } from "./ledger-books";

const AT = Date.UTC(2026, 10, 8);
const EARLIER = AT - 1000;

const stamp = { deletedAt: null, updatedAt: EARLIER };

const account = (localId: string, extra: Partial<LedgerBooks["accounts"][number]> = {}) =>
    ({
        ...stamp,
        currency: "USD",
        customColor: null,
        dateCreated: EARLIER,
        emoji: null,
        icon: null,
        imageColor: null,
        imageKey: null,
        initialBalance: 100,
        initialBalanceDate: EARLIER,
        initialBalanceUsd: 100,
        kind: "asset",
        localId,
        name: localId,
        sortOrder: 0,
        ...extra,
    }) as LedgerBooks["accounts"][number];

const entry = (localId: string, extra: Partial<LedgerBooks["transactions"][number]>) =>
    ({
        ...stamp,
        accountId: null,
        amount: 10,
        amountUsd: 10,
        categoryId: null,
        currency: "USD",
        date: EARLIER,
        day: 0,
        exchangeRate: null,
        exchangeRateType: null,
        income: false,
        localId,
        note: "",
        ...extra,
    }) as LedgerBooks["transactions"][number];

const transfer = (localId: string, from: string, to: string, extra: Partial<LedgerBooks["transfers"][number]> = {}) =>
    ({
        ...stamp,
        date: EARLIER,
        fromAccountId: from,
        fromAmount: 10,
        fromAmountUsd: 10,
        fromCurrency: "USD",
        localId,
        toAccountId: to,
        toAmount: 10,
        toAmountUsd: 10,
        toCurrency: "USD",
        ...extra,
    }) as LedgerBooks["transfers"][number];

const books = (extra: Partial<LedgerBooks>): LedgerBooks => ({
    accounts: [],
    appMeta: [],
    budgets: [],
    categories: [],
    exchangeRates: [],
    installmentPlans: [],
    installments: [],
    mainBudget: [],
    outsideMoves: [],
    outsidePayments: [],
    savingsGoals: [],
    transactions: [],
    transfers: [],
    ...extra,
});

const child = <Row>(localId: string, extra: Partial<NoInfer<Row>>) => ({ ...stamp, localId, ...extra }) as Row;

describe("netAfterDelete", () => {
    const after = (archivedAt: number | null) => {
        const gone = account("gone", { archivedAt });
        const ledger = prepareLedger(
            books({
                accounts: [gone, account("kept", { sortOrder: 1 })],
                transfers: [transfer("moved", "gone", "kept")],
            }),
            AT
        );
        return netAfterDelete(ledger, gone);
    };

    it("takes the account's transfers back out of the account on the other side", () => {
        expect(after(null)).toBe(100);
        expect(after(EARLIER)).toBe(100);
    });
});

describe("deletedAccount", () => {
    const chase = account("chase");
    const rows = deletedAccount(
        books({
            accounts: [chase],
            installmentPlans: [child("plan", { accountId: "chase" }), child("other-plan", { accountId: "cash" })],
            installments: [child("slot", { planId: "plan" }), child("other-slot", { planId: "other-plan" })],
            outsideMoves: [child("move", { accountId: "chase" }), child("cash-move", { accountId: "cash" })],
            outsidePayments: [child("paid", { planId: "plan" })],
            savingsGoals: [child("goal", { accountId: "chase" }), child("cash-goal", { accountId: "cash" })],
            transactions: [
                entry("kept", { accountId: "chase" }),
                entry("old", { accountId: "chase", deletedAt: EARLIER }),
                entry("fee", { accountId: "cash", transferId: "moved" }),
                entry("unrelated", { accountId: "cash" }),
            ],
            transfers: [
                transfer("moved", "chase", "cash"),
                transfer("linked", "cash", "amex", { installmentPlanId: "plan" }),
                transfer("away", "cash", "amex"),
            ],
        }),
        chase,
        AT
    );
    const row = (table: string, id: string) => rows.find((each) => each.table === table && each.localId === id);

    it("tombstones the account last, so a push that dies midway leaves it there to delete again", () => {
        expect(rows.at(-1)).toMatchObject({ deletedAt: AT, localId: "chase", table: "accounts" });
    });

    it("tombstones fees before their transfers, because deleting again finds fees through live transfers", () => {
        const at = (table: string, id: string) => rows.findIndex((each) => each.table === table && each.localId === id);
        expect(at("transactions", "fee")).toBeLessThan(at("transfers", "moved"));
    });

    it("keeps entries but detaches them, tombstoned ones too", () => {
        expect(row("transactions", "kept")).toMatchObject({ deletedAt: null, fields: { accountId: null } });
        expect(row("transactions", "old")).toMatchObject({ deletedAt: EARLIER, fields: { accountId: null } });
    });

    it("deletes transfers touching the account with their fees, and unlinks surviving ones from doomed plans", () => {
        expect(row("transfers", "moved")?.deletedAt).toBe(AT);
        expect(row("transactions", "fee")).toMatchObject({ deletedAt: AT, fields: { accountId: "cash" } });
        expect(row("transfers", "linked")).toMatchObject({ deletedAt: null, fields: { installmentPlanId: null } });
    });

    it("deletes plans with their children, outside moves and goals, and leaves other accounts alone", () => {
        for (const [table, id] of [
            ["installmentPlans", "plan"],
            ["installments", "slot"],
            ["outsidePayments", "paid"],
            ["outsideMoves", "move"],
            ["savingsGoals", "goal"],
            ["accounts", "chase"],
        ] as const) {
            expect(row(table, id)?.deletedAt).toBe(AT);
        }
        expect(rows.map((each) => each.localId)).not.toStrictEqual(
            expect.arrayContaining(["other-plan", "other-slot", "cash-move", "cash-goal", "unrelated", "away"])
        );
    });
});

describe("deletedAccount for a person", () => {
    it("takes their entries with them, schedule retired, where a bank's would only be detached", () => {
        const ana = account("ana", { kind: "person" });
        const rows = deletedAccount(
            books({
                accounts: [ana],
                transactions: [
                    entry("loan", { accountId: "ana", recurringType: 3 }),
                    entry("loan fee", { accountId: "cash", feeForId: "loan" }),
                    entry("settled", { accountId: "ana", deletedAt: EARLIER }),
                ],
            }),
            ana,
            AT
        );
        // The fee is found through its live loan, so it goes first or a push that dies midway strands it.
        expect(rows.map((row) => row.localId)).toStrictEqual(["loan fee", "loan", "ana"]);
        expect(rows[1]).toMatchObject({ deletedAt: AT, fields: { accountId: "ana", recurringType: 0 } });
    });
});

describe("rows the server must not drop", () => {
    it("carries restoredAt, or a restored row reads as an older era and loses", () => {
        const restored = account("chase", { restoredAt: EARLIER });
        expect(archivedAccount(restored, AT, AT).restoredAt).toBe(EARLIER);
    });

    it("moves updatedAt past a stored clock that runs ahead", () => {
        const ahead = account("chase", { updatedAt: AT + 5000 });
        expect(archivedAccount(ahead, AT, AT).updatedAt).toBe(AT + 5001);
    });
});

describe("frozenUsd", () => {
    const rate = (date: string, value: number) =>
        ({ date, quote: "EUR", rate: value, rateType: "official" }) as LedgerBooks["exchangeRates"][number];

    it("uses the newest rate on or before the day and keeps the sign", () => {
        const exchangeRates = [rate("2026-11-01", 0.5), rate("2026-11-07", 0.8), rate("2026-11-20", 0.1)];
        expect(frozenUsd({ exchangeRates }, -8, "EUR", AT)).toBe(-10);
    });

    it("leaves the USD value unknown with no rate, and zero is always zero", () => {
        expect(frozenUsd({ exchangeRates: [] }, 8, "EUR", AT)).toBeNull();
        expect(frozenUsd({ exchangeRates: [] }, 0, "EUR", AT)).toBe(0);
    });
});

describe("balances", () => {
    const draft = {
        creditLimit: null,
        currency: "USD",
        customColor: null,
        emoji: null,
        icon: null,
        imageColor: null,
        imageKey: null,
        kind: "asset" as const,
        name: "Chase",
        paymentDay: null,
        statementDay: null,
    };
    const chase = account("chase");

    it("backs the opening out of what is booked, so the account lands on the typed balance", () => {
        const spent = entry("spent", { accountId: "chase", amount: 40 });
        const row = editedAccount(books({ accounts: [chase], transactions: [spent] }), chase, draft, 500, AT);
        expect(row).toMatchObject({ fields: { initialBalance: 540, initialBalanceUsd: 540 } });
    });

    it("leaves the opening alone when the form did not touch the money", () => {
        const row = editedAccount(books({ accounts: [chase] }), chase, draft, null, AT);
        expect(row).toMatchObject({ fields: { initialBalance: 100, initialBalanceUsd: 100 } });
    });

    it("sorts a new account after the live ones, archived included", () => {
        const shelved = account("shelved", { archivedAt: EARLIER, sortOrder: 3 });
        const gone = account("gone", { deletedAt: EARLIER, sortOrder: 7 });
        const row = createdAccount(books({ accounts: [chase, shelved, gone] }), draft, 25, "new", AT);
        expect(row).toMatchObject({ fields: { initialBalance: 25, sortOrder: 4 }, localId: "new" });
    });

    it("books a difference as an adjustment and stamps the check", () => {
        const rows = checkedAccount(books({}), chase, { amount: -12, id: "move", note: "Balance adjustment" }, AT);
        expect(rows[0]).toMatchObject({
            fields: { adjustment: true, amount: -12, amountUsd: -12 },
            table: "outsideMoves",
        });
        expect(rows[1]).toMatchObject({ fields: { checkedAt: AT }, table: "accounts" });
    });
});

describe("parseAmount", () => {
    it.each([
        ["$25,993.52", 2, 25_993.52],
        ["25.993,52", 2, 25_993.52],
        ["1,000", 2, 1000],
        ["1.000.000", 2, 1_000_000],
        ["12,5", 2, 12.5],
        ["12.345", 3, 12.345],
        ["1,5", 0, 2],
        ["", 2, 0],
    ])("reads %s with %i decimals", (text, decimals, value) => {
        expect(parseAmount(text, decimals)).toBe(value);
    });
});
