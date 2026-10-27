import * as Effect from "effect/Effect";

import type { Database } from "@/db/client";
import { appRuntime } from "@/lib/runtime";

import { createRuntimeCommand } from "./atom-command";
import { writeDebt, writeOwe, writePayoffPlan } from "./planning-commands";
import type { DebtDraft, OweDraft } from "./planning-commands";

const planAfter = Effect.fn("DebtFlow.planAfter")(function* planAfter(
    db: Database,
    personId: string,
    targetDate: Date | null
) {
    if (targetDate === null) {
        return null;
    }
    return yield* Effect.result(Effect.sandbox(writePayoffPlan(db, personId, targetDate)));
});

const saveDebt = Effect.fn("DebtFlow.saveDebt")(function* saveDebt(input: {
    db: Database;
    debt: DebtDraft;
    payBackBy: Date | null;
}) {
    const personId = yield* writeDebt(input.db, input.debt);
    return yield* planAfter(input.db, personId, input.payBackBy);
});

const saveOwe = Effect.fn("DebtFlow.saveOwe")(function* saveOwe(input: {
    db: Database;
    owe: OweDraft;
    targetDate: Date | null;
}) {
    const personId = yield* writeOwe(input.db, input.owe);
    return yield* planAfter(input.db, personId, input.targetDate);
});

export const saveDebtCommand = createRuntimeCommand(appRuntime, {
    execute: saveDebt,
    label: "debt-flow:save-debt",
});

export const saveOweCommand = createRuntimeCommand(appRuntime, {
    execute: saveOwe,
    label: "debt-flow:save-owe",
});
