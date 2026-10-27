import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import { settledBalanceAt } from "@/data/accounts";
import type { Account } from "@/data/accounts-core";
import { savingsGoalsRepo } from "@/data/savings-goals-core";
import type { SavingsGoalInput } from "@/data/savings-goals-core";
import type { Valuation } from "@/data/valuation-source";
import type { Database } from "@/db/client";
import { appRuntime } from "@/lib/runtime";

import { createRuntimeCommand } from "./atom-command";

export class GoalAnchorUnvaluedError extends Schema.TaggedError<GoalAnchorUnvaluedError>()(
    "GoalAnchorUnvaluedError",
    {}
) {
    // oxlint-disable-next-line class-methods-use-this -- one fixed sentence, no attribute to read
    override get message(): string {
        return "The goal's account balance could not be valued exactly.";
    }
}

const createGoalFromAccount = Effect.fn("BudgetFlow.createGoalFromAccount")(function* createGoalFromAccount(input: {
    account: Account | undefined;
    db: Database;
    dismiss: () => void;
    goal: Omit<SavingsGoalInput, "startAmount">;
    valuation: Valuation;
}) {
    const { account, db, goal, valuation } = input;
    const balance = account === undefined ? undefined : yield* settledBalanceAt(db, account, valuation, new Date());
    if (!balance?.exact) {
        return yield* new GoalAnchorUnvaluedError();
    }
    yield* Effect.sync(input.dismiss);
    return yield* savingsGoalsRepo.create(db, { ...goal, startAmount: balance.value });
});

const readGoalAnchor = Effect.fn("BudgetFlow.readGoalAnchor")(function* readGoalAnchor(input: {
    account: Account;
    db: Database;
    valuation: Valuation;
}) {
    const balance = yield* settledBalanceAt(input.db, input.account, input.valuation, new Date());
    return { account: input.account, balance };
});

export const createGoalFromAccountCommand = createRuntimeCommand(appRuntime, {
    execute: createGoalFromAccount,
    label: "budget-flow:create-goal-from-account",
});

export const readGoalAnchorCommand = createRuntimeCommand(appRuntime, {
    execute: readGoalAnchor,
    label: "budget-flow:read-goal-anchor",
});
