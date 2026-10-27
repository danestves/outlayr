import * as Effect from "effect/Effect";

import { accountsRepo } from "@/data/accounts-core";
import type { Account } from "@/data/accounts-core";
import { budgetsRepo } from "@/data/budgets-core";
import type { CreateBudgetInput, CreateMainBudgetInput, PatchBudgetInput } from "@/data/budgets-core";
import type { Category } from "@/data/categories-core";
import {
    createPerson,
    recordBoughtOnCredit,
    recordDebtMovement,
    recordOutsideMove,
    recordSoldOnCredit,
} from "@/data/debts-core";
import { installmentsRepo } from "@/data/installments-core";
import type { InstallmentFeeInput, InstallmentPaymentInput } from "@/data/installments-core";
import { livePayoffPlanCount, setPayoffPlan } from "@/data/payoff-plans";
import { savingsGoalsRepo } from "@/data/savings-goals-core";
import type { SavingsGoalPatch } from "@/data/savings-goals-core";
import type { Database } from "@/db/client";
import { comesFromPerson } from "@/domain/debt-choices";
import type { DebtVerb } from "@/domain/debts";
import { appRuntime } from "@/lib/runtime";

import { createRuntimeCommand } from "./atom-command";

const planningCommand = <W, A, E>(label: string, execute: (input: W) => Effect.Effect<A, E>) =>
    createRuntimeCommand(appRuntime, { execute, label: `planning:${label}` });

export interface DebtDraft {
    account: Account | null;
    amount: number;
    /** Set for a sale on credit, which records income instead of a movement. */
    category: Category | null;
    currency: string;
    date: Date;
    newName: string;
    note: string;
    person: Account | null;
    /** The person's side of a cross-currency movement, in their currency. */
    theirAmount: number;
    verb: DebtVerb;
}

export interface OweDraft {
    amount: number;
    categoryId: string;
    currency: string;
    newName: string;
    note: string | undefined;
    person: Account | null;
}

export const writeDebt = Effect.fn("Planning.writeDebt")(function* writeDebt(db: Database, draft: DebtDraft) {
    const { account, amount, category, currency, person } = draft;
    const note = draft.note === "" ? undefined : draft.note;
    if (category !== null) {
        const buyer = person ?? { currency, id: yield* createPerson(db, { currency, name: draft.newName }) };
        yield* recordSoldOnCredit(db, { amount, categoryId: category.id, date: draft.date, note, person: buyer });
        return buyer.id;
    }
    if (account === null && person !== null) {
        yield* recordOutsideMove(db, { amount, date: draft.date, note, person, verb: draft.verb });
        return person.id;
    }
    if (account === null) {
        return yield* createPerson(db, {
            currency,
            name: draft.newName,
            openingBalance: comesFromPerson(draft.verb) ? -amount : amount,
        });
    }
    const target = person ?? { currency, id: yield* createPerson(db, { currency, name: draft.newName }) };
    const crossCurrency = target.currency !== account.currency;
    yield* recordDebtMovement(db, {
        account: { accountId: account.id, amount, currency: account.currency },
        date: draft.date,
        note,
        person: { accountId: target.id, amount: crossCurrency ? draft.theirAmount : amount, currency: target.currency },
        rateType: crossCurrency ? "custom" : null,
        verb: draft.verb,
    });
    return target.id;
});

export const writeOwe = Effect.fn("Planning.writeOwe")(function* writeOwe(db: Database, draft: OweDraft) {
    const { amount, categoryId, currency, note } = draft;
    const owed = draft.person ?? { currency, id: yield* createPerson(db, { currency, name: draft.newName }) };
    yield* recordBoughtOnCredit(db, { amount, categoryId, date: new Date(), note, person: owed });
    return owed.id;
});

export const writePayoffPlan = Effect.fn("Planning.writePayoffPlan")(function* writePayoffPlan(
    db: Database,
    personId: string,
    targetDate: Date
) {
    const people = yield* accountsRepo.listActive(db);
    const person = people.find((row) => row.id === personId);
    if (person) {
        yield* setPayoffPlan(db, person, targetDate);
    }
});

export const setPayoffPlanCommand = planningCommand(
    "set-payoff-plan",
    (input: { account: Account; db: Database; targetDate: Date }) =>
        setPayoffPlan(input.db, input.account, input.targetDate)
);

export const livePayoffPlanCountCommand = planningCommand(
    "live-payoff-plan-count",
    (input: { db: Database; exceptAccountId: string | null }) => livePayoffPlanCount(input.db, input.exceptAccountId)
);

export const updateSavingsGoalCommand = planningCommand(
    "update-goal",
    (input: { db: Database; id: string; patch: SavingsGoalPatch }) =>
        savingsGoalsRepo.update(input.db, input.id, input.patch)
);

export const removeSavingsGoalCommand = planningCommand("remove-goal", (input: { db: Database; id: string }) =>
    savingsGoalsRepo.remove(input.db, input.id)
);

export const createMainBudgetCommand = planningCommand(
    "create-main-budget",
    (input: { db: Database; input: CreateMainBudgetInput }) => budgetsRepo.createMainBudget(input.db, input.input)
);

export const createBudgetCommand = planningCommand(
    "create-budget",
    (input: { db: Database; input: CreateBudgetInput }) => budgetsRepo.createBudget(input.db, input.input)
);

export const patchBudgetCommand = planningCommand(
    "patch-budget",
    (input: { db: Database; id: string; patch: PatchBudgetInput }) =>
        budgetsRepo.patchBudget(input.db, input.id, input.patch)
);

export const patchMainBudgetCommand = planningCommand(
    "patch-main-budget",
    (input: { db: Database; id: string; patch: PatchBudgetInput }) =>
        budgetsRepo.patchMainBudget(input.db, input.id, input.patch)
);

export const addInstallmentFeeCommand = planningCommand(
    "add-installment-fee",
    (input: { db: Database; fee: InstallmentFeeInput }) => installmentsRepo.addFee(input.db, input.fee)
);

export const removeInstallmentFeeCommand = planningCommand(
    "remove-installment-fee",
    (input: { db: Database; installmentId: string }) => installmentsRepo.removeFee(input.db, input.installmentId)
);

export const recordInstallmentPaymentCommand = planningCommand(
    "record-installment-payment",
    (input: { db: Database; payment: InstallmentPaymentInput }) =>
        installmentsRepo.recordPayment(input.db, input.payment)
);

export const updateInstallmentCommand = planningCommand(
    "update-installment",
    (input: { db: Database; id: string; patch: { amount?: number; dueDate?: Date } }) =>
        installmentsRepo.updateInstallment(input.db, input.id, input.patch)
);

export const deleteInstallmentCommand = planningCommand("delete-installment", (input: { db: Database; id: string }) =>
    installmentsRepo.deleteInstallment(input.db, input.id)
);

export const deleteInstallmentPlanCommand = planningCommand(
    "delete-installment-plan",
    (input: { db: Database; planId: string }) => installmentsRepo.deletePlan(input.db, input.planId)
);
