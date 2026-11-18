import * as Effect from "effect/Effect";

import { dropNotificationDebt } from "@/data/notification-debts";
import type { Database } from "@/db/client";
import { appRuntime } from "@/lib/runtime";
import { warnAndContinue } from "@/lib/warn-and-continue";

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
    fromPush?: string;
    payBackBy: Date | null;
}) {
    const personId = yield* writeDebt(input.db, input.debt);
    yield* dropNotificationDebt(input.db, input.fromPush).pipe(warnAndContinue("[outlayr] debt draft not dropped"));
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

export const dropNotificationDebtCommand = createRuntimeCommand(appRuntime, {
    execute: (input: { db: Database; id: string }) => dropNotificationDebt(input.db, input.id),
    label: "debt-flow:drop-notification-debt",
});
