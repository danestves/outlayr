import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { buildRateTable } from "@outlayr/money/valuation";
import * as Cause from "effect/Cause";
import * as Layer from "effect/Layer";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";

import { savingsGoalsQuery } from "@/data/savings-goals-core";
import type { Database } from "@/db/client";
import { accounts } from "@/db/schema";
import { migratedDatabase } from "@/db/test-database";
import { appRuntime } from "@/lib/runtime";

import { createGoalFromAccountCommand, GoalAnchorUnvaluedError } from "./budget-flow-commands";

const OPENED = new Date("2026-03-04T10:00:00.000Z");
const valuation = { displayCurrency: "USD", rates: buildRateTable([]) };
const goal = { accountId: "savings", currency: "USD", name: "Fund", targetAmount: 500, targetDate: OPENED };

let db: Database;

beforeEach(() => {
    db = migratedDatabase();
});

async function create(account: typeof accounts.$inferSelect | undefined, dismiss: () => void) {
    const registry = AtomRegistry.make({ initialValues: [[appRuntime.layer, Layer.empty]] });
    const result = await createGoalFromAccountCommand.run(registry, { account, db, dismiss, goal, valuation });
    registry.dispose();
    return result;
}

describe("createGoalFromAccountCommand", () => {
    it("refuses an account it cannot read, leaving the sheet open and nothing written", async () => {
        const dismiss = jest.fn();

        const result = await create(undefined, dismiss);

        expect(AsyncResult.isFailure(result) && Cause.squash(result.cause)).toBeInstanceOf(GoalAnchorUnvaluedError);
        expect(dismiss).not.toHaveBeenCalled();
        await expect(savingsGoalsQuery(db)).resolves.toStrictEqual([]);
    });

    it("dismisses the sheet and anchors the goal at the balance read at write time", async () => {
        await db.insert(accounts).values({
            currency: "USD",
            dateCreated: OPENED,
            id: "savings",
            initialBalance: 120,
            initialBalanceDate: OPENED,
            name: "Savings",
            updatedAt: OPENED,
        });
        const [account] = await db.select().from(accounts);
        const dismiss = jest.fn();

        const result = await create(account, dismiss);

        expect(AsyncResult.isSuccess(result)).toBe(true);
        expect(dismiss).toHaveBeenCalledTimes(1);
        const [saved] = await savingsGoalsQuery(db);
        expect(saved.startAmount).toBe(120);
    });
});
