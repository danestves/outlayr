import { count, gt, isNotNull, isNull, or } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import type { Database } from "@/db/client";
import { accounts, budgets, categories, mainBudget, transactions, transfers } from "@/db/schema";
import type { AdoptionActions } from "@/domain/ledger-adoption";

import type { accountLedgerState, discardAccountLedger, replaceLocalFromAccount } from "./adoption-engine-core";
import { getMeta, META_KEYS, setMeta } from "./app-meta-core";
import { SEEDED_CATEGORY_NAMES } from "./categories-core";
import {
    enableSyncForAccount,
    enqueueAllForSync,
    getSyncAccountSubject,
    hasResidualSyncState,
    isSyncEnabled,
    resetSyncForAccountSwitch,
    setSyncEnabled,
} from "./sync-outbox-core";

export class LedgerAdoptionError extends Schema.TaggedError<LedgerAdoptionError>()("LedgerAdoptionError", {
    cause: Schema.Defect(),
}) {
    // oxlint-disable-next-line class-methods-use-this -- one cause, no attribute: the message has nothing on the instance to read
    override get message(): string {
        return "Reading the local ledger failed";
    }
}

export class AdoptionEngineMissingError extends Schema.TaggedError<AdoptionEngineMissingError>()(
    "AdoptionEngineMissingError",
    { wipeAccount: Schema.Boolean, wipeLocal: Schema.Boolean }
) {
    override get message(): string {
        return `Destructive adoption actions (local: ${this.wipeLocal}, account: ${this.wipeAccount}) need a sync engine.`;
    }
}

const query = <A>(run: () => PromiseLike<A>) =>
    Effect.tryPromise({ catch: (cause) => new LedgerAdoptionError({ cause }), try: run });

const SEEDED_CATEGORY_COUNT = SEEDED_CATEGORY_NAMES.expense.length + SEEDED_CATEGORY_NAMES.income.length;

// A build without an engine reports `unknown` and every plan defers, leaving both ledgers untouched.
export interface AdoptionEngine {
    accountLedger: () => ReturnType<typeof accountLedgerState>;
    discardAccountLedger: () => ReturnType<typeof discardAccountLedger>;
    replaceFromAccount: () => ReturnType<typeof replaceLocalFromAccount>;
}

// Tombstones count as content: a row deleted offline is a decision this device made. `seedCategories` stamps every
// row with `dateCreated` equal to `updatedAt`, so an edit, deletion or different count reads as touched. Every
// uncertainty resolves toward `populated`: wrong that way asks a question, wrong the other way destroys a ledger.
export const localLedgerState = Effect.fn("LedgerAdoption.localLedgerState")(function* localLedgerState(db: Database) {
    const moneyTables = [transactions, budgets, mainBudget, accounts, transfers];
    const moneyCounts = yield* Effect.all(
        moneyTables.map((table) => query(() => db.select({ total: count() }).from(table))),
        { concurrency: "unbounded" }
    );
    if (moneyCounts.some((rows) => (rows[0]?.total ?? 0) > 0)) {
        return "populated";
    }

    const [all] = yield* query(() => db.select({ total: count() }).from(categories));
    if ((all?.total ?? 0) !== SEEDED_CATEGORY_COUNT) {
        return "populated";
    }
    const [touched] = yield* query(() =>
        db
            .select({ total: count() })
            .from(categories)
            .where(
                or(
                    isNotNull(categories.deletedAt),
                    isNull(categories.dateCreated),
                    gt(categories.updatedAt, categories.dateCreated)
                )
            )
    );
    return (touched?.total ?? 0) > 0 ? "populated" : "empty";
});

export const adoptedAccount = Effect.fn("LedgerAdoption.adoptedAccount")(function* adoptedAccount(db: Database) {
    return yield* getMeta(db, META_KEYS.ledgerAdoption);
});

export const markAdopted = Effect.fn("LedgerAdoption.markAdopted")(function* markAdopted(
    db: Database,
    accountId: string
) {
    yield* setMeta(db, META_KEYS.ledgerAdoption, accountId);
});

export const prepareAccountAdoption = Effect.fn("LedgerAdoption.prepareAccountAdoption")(
    function* prepareAccountAdoption(db: Database, accountId: string) {
        const [marker, syncSubject, residual] = yield* Effect.all(
            [adoptedAccount(db), getSyncAccountSubject(db), hasResidualSyncState(db)],
            { concurrency: "unbounded" }
        );
        const sameSubject = syncSubject === accountId;
        if ((marker === accountId && sameSubject) || (marker === null && sameSubject && !residual)) {
            return;
        }
        if (marker !== null || syncSubject !== null || residual) {
            yield* resetSyncForAccountSwitch(db);
        }
    }
);

// Order matters: the account's rows go first so a later failure leaves this ledger whole and retryable; the local wipe
// runs while the sync gate is shut so triggers don't queue tombstones for discarded rows; only then does the gate open
// and the backlog queue (`enqueueAllForSync` warns about this ordering).
export const runAdoption = Effect.fn("LedgerAdoption.runAdoption")(function* runAdoption(
    db: Database,
    engine: AdoptionEngine | null,
    actions: AdoptionActions,
    accountId?: string
) {
    if (actions.wipeLocal || actions.wipeAccount) {
        if (!engine) {
            return yield* new AdoptionEngineMissingError({
                wipeAccount: actions.wipeAccount,
                wipeLocal: actions.wipeLocal,
            });
        }
        if (actions.wipeAccount) {
            yield* engine.discardAccountLedger();
        }
        if (actions.wipeLocal) {
            yield* engine.replaceFromAccount();
        }
    }

    const enabledForAttempt = accountId !== undefined && !(yield* isSyncEnabled(db));
    if (enabledForAttempt) {
        yield* enableSyncForAccount(db, accountId);
    } else if (!accountId) {
        yield* setSyncEnabled(db, true);
    }

    if (actions.pushLocal) {
        yield* enqueueAllForSync(db).pipe(
            Effect.tapError(() => (enabledForAttempt ? resetSyncForAccountSwitch(db) : Effect.void))
        );
    }
    return enabledForAttempt;
});

export const completeAdoption = Effect.fn("LedgerAdoption.completeAdoption")(function* completeAdoption(
    db: Database,
    engine: AdoptionEngine | null,
    actions: AdoptionActions,
    accountId: string,
    persistMarker: (target: Database, subject: string) => ReturnType<typeof markAdopted> = markAdopted
) {
    const enabledForAttempt = yield* runAdoption(db, engine, actions, accountId);
    yield* persistMarker(db, accountId).pipe(
        Effect.tapError(() => (enabledForAttempt ? resetSyncForAccountSwitch(db) : Effect.void))
    );
});
