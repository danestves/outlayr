import { describe, expect, it } from "vite-plus/test";

import { accountDeletionPlan, categoryDeletionPlan, purchaseDeletionPlan } from "./entry-deletion";

const EARLIER = 1;

const row = <Extra extends object>(id: string, extra: Extra) => ({ deletedAt: null as number | null, id, ...extra });

const NO_PLANS = { installmentPlans: [], installments: [], outsidePayments: [] };

describe("accountDeletionPlan", () => {
    const books = {
        accounts: [row("card", { kind: "liability" }), row("cash", { kind: "asset" }), row("ana", { kind: "person" })],
        installmentPlans: [row("sofa plan", { accountId: "card", transactionId: "sofa" })],
        installments: [row("sofa 1", { planId: "sofa plan" })],
        outsideMoves: [row("card adjustment", { accountId: "card" }), row("cash adjustment", { accountId: "cash" })],
        outsidePayments: [row("sofa outside", { planId: "sofa plan" })],
        savingsGoals: [row("card goal", { accountId: "card" }), row("cash goal", { accountId: "cash" })],
        transactions: [
            row("sofa", { accountId: "card" }),
            row("sofa paid", { accountId: "cash", installmentId: "sofa 1" }),
            { ...row("refunded", { accountId: "card" }), deletedAt: EARLIER },
            row("payoff fee", { accountId: "cash", transferId: "payoff" }),
            row("savings fee", { accountId: "cash", transferId: "to savings" }),
            row("loan", { accountId: "ana" }),
            row("loan fee", { accountId: "cash", feeForId: "loan" }),
            { ...row("settled", { accountId: "ana" }), deletedAt: EARLIER },
        ],
        transfers: [
            row("payoff", { fromAccountId: "cash", toAccountId: "card" }),
            row("to savings", { fromAccountId: "cash", toAccountId: "savings" }),
            row("sofa transfer", { fromAccountId: "cash", installmentPlanId: "sofa plan", toAccountId: "savings" }),
        ],
    };

    it("takes a transfer with one leg in the account, and the fee it charged the other side", () => {
        const plan = accountDeletionPlan(books, "card");
        expect(plan.transfers).toStrictEqual(new Set(["payoff"]));
        expect(plan.transactions).toStrictEqual(new Set(["payoff fee"]));
    });

    it("keeps the account's entries and the payments made on its plans, cut loose from what went", () => {
        const plan = accountDeletionPlan(books, "card");
        expect(plan.installmentPlans).toStrictEqual(new Set(["sofa plan"]));
        expect(plan.installments).toStrictEqual(new Set(["sofa 1"]));
        expect(plan.outsidePayments).toStrictEqual(new Set(["sofa outside"]));
        expect(plan.detached).toStrictEqual({
            transactions: new Set(["sofa", "refunded"]),
            transfers: new Set(["sofa transfer"]),
        });
    });

    it("takes a person's entries with whatever each one's own delete takes, and detaches nothing", () => {
        const plan = accountDeletionPlan(books, "ana");
        expect(plan.transactions).toStrictEqual(new Set(["loan", "loan fee"]));
        expect(plan.detached.transactions).toStrictEqual(new Set());
    });

    it("still knows a person whose own tombstone a peer already wrote", () => {
        const late = { ...books, accounts: [{ ...row("ana", { kind: "person" }), deletedAt: EARLIER }] };
        const plan = accountDeletionPlan(late, "ana");
        expect(plan.accounts).toStrictEqual(new Set());
        expect(plan.transactions).toStrictEqual(new Set(["loan", "loan fee"]));
    });
});

describe("categoryDeletionPlan", () => {
    const rules = { budgetPlans: [], budgets: [], transfers: [] };

    it("takes the fee on an entry in the category, though the fee is filed under another", () => {
        const plan = categoryDeletionPlan(
            {
                ...NO_PLANS,
                ...rules,
                categories: [row("travel", {}), row("fees", {})],
                transactions: [
                    row("flight", { categoryId: "travel" }),
                    row("flight fee", { categoryId: "fees", feeForId: "flight" }),
                    row("atm fee", { categoryId: "fees" }),
                ],
            },
            "travel"
        );
        expect(plan.transactions).toStrictEqual(new Set(["flight", "flight fee"]));
    });

    it("takes a financed entry's plan, what is left to pay and what was paid", () => {
        const plan = categoryDeletionPlan(
            {
                ...rules,
                categories: [row("home", {})],
                installmentPlans: [row("sofa plan", { transactionId: "sofa" })],
                installments: [row("sofa 1", { planId: "sofa plan" }), row("sofa 2", { planId: "sofa plan" })],
                outsidePayments: [row("sofa outside", { planId: "sofa plan" })],
                transactions: [row("sofa", { categoryId: "home" }), row("sofa paid", { installmentId: "sofa 1" })],
            },
            "home"
        );
        expect(plan.installmentPlans).toStrictEqual(new Set(["sofa plan"]));
        expect(plan.installments).toStrictEqual(new Set(["sofa 1", "sofa 2"]));
        expect(plan.outsidePayments).toStrictEqual(new Set(["sofa outside"]));
        expect(plan.transactions).toStrictEqual(new Set(["sofa", "sofa paid"]));
    });

    it("promotes a subcategory and leaves its entries, budget and plans alone", () => {
        const plan = categoryDeletionPlan(
            {
                ...NO_PLANS,
                budgetPlans: [row("food plan", { categoryId: "food" }), row("snacks plan", { categoryId: "snacks" })],
                budgets: [row("food budget", { categoryId: "food" }), row("snacks budget", { categoryId: "snacks" })],
                categories: [row("food", {}), row("snacks", { parentId: "food" })],
                transactions: [row("chips", { categoryId: "snacks" })],
                transfers: [],
            },
            "food"
        );
        expect(plan).toStrictEqual({
            budgetPlans: new Set(["food plan"]),
            budgets: new Set(["food budget"]),
            categories: new Set(["food"]),
            detached: { categories: new Set(["snacks"]) },
            installmentPlans: new Set(),
            installments: new Set(),
            outsidePayments: new Set(),
            transactions: new Set(),
            transfers: new Set(),
        });
    });
});

describe("purchaseDeletionPlan", () => {
    it("takes the purchase, its schedule and fees, and every payment made on it, leaving other plans alone", () => {
        const plan = purchaseDeletionPlan(
            {
                installmentPlans: [
                    row("sofa plan", { transactionId: "sofa" }),
                    row("lamp plan", { transactionId: "lamp" }),
                ],
                installments: [
                    row("sofa 1", { planId: "sofa plan" }),
                    row("sofa 2", { planId: "sofa plan" }),
                    row("lamp 1", { planId: "lamp plan" }),
                ],
                outsidePayments: [
                    row("sofa outside", { planId: "sofa plan" }),
                    row("lamp outside", { planId: "lamp plan" }),
                ],
                transactions: [
                    row("sofa", {}),
                    row("sofa fee", { feeForId: "sofa" }),
                    row("sofa 1 fee", { installmentId: "sofa 1" }),
                    row("upfront fee", { transferId: "upfront" }),
                    { ...row("old upfront fee", { transferId: "upfront" }), deletedAt: EARLIER },
                    row("lamp", {}),
                    row("lamp payment fee", { transferId: "lamp payment" }),
                ],
                transfers: [
                    row("upfront", { installmentPlanId: "sofa plan" }),
                    row("second payment", { installmentPlanId: "sofa plan" }),
                    row("lamp payment", { installmentPlanId: "lamp plan" }),
                    row("unrelated", {}),
                ],
            },
            "sofa plan"
        );
        expect(plan).toStrictEqual({
            installmentPlans: new Set(["sofa plan"]),
            installments: new Set(["sofa 1", "sofa 2"]),
            outsidePayments: new Set(["sofa outside"]),
            transactions: new Set(["sofa", "sofa fee", "sofa 1 fee", "upfront fee"]),
            transfers: new Set(["upfront", "second payment"]),
        });
    });
});
