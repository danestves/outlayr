import * as Context from "effect/Context";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Queue from "effect/Queue";
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";
import * as Stream from "effect/Stream";

import { getMeta, META_KEYS, setMeta } from "@/data/app-meta-core";
import {
    backfillBudgetUsd,
    backfillCanonicalUsd,
    backfillOpeningUsd,
    stampLedgerCurrency,
} from "@/data/canonicalize-backfill";
import { settlePendingFees } from "@/data/card-fees-core";
import { subscribeToSettingChanges } from "@/data/database-changes";
import { drainPendingWrites, fileWaitingPurchases, takeRepriced } from "@/data/pending-writes-core";
import { applyRecentRates, pullRatesIfDue } from "@/data/rates";
import type { PullRatesFn, RateWireRow } from "@/data/rates";
import type { Database } from "@/db/client";
import { formatAmount } from "@/domain/money";
import { translateNow } from "@/i18n/runtime";
import { ratesPuller, watchRecentRates } from "@/lib/convex";
import { sendEnrichmentQueue } from "@/lib/enrichment-queue";
import { armLogoBackfill, backfillLogos } from "@/lib/logo-backfill";
import { notifyWarning } from "@/lib/notify";
import { onWatchPendingWrite } from "@/lib/watch-link";

import { appStates, launchAndForegrounds, listen, signals, WatchAppState, WatchTableWrites } from "./app-events";
import type { Signal, Watch } from "./app-events";
import { affectsSpotlight, affectsWidgets, PUBLISH_DEBOUNCE_MS, SPOTLIGHT_DEBOUNCE_MS } from "./sync-cadence";
import { claimPendingWrites, readWalletLastRun, releasePendingWrites } from "./widget-bridge";

const PUBLISH_DEBOUNCE = Duration.millis(PUBLISH_DEBOUNCE_MS);
const SPOTLIGHT_DEBOUNCE = Duration.millis(SPOTLIGHT_DEBOUNCE_MS);

const SystemStep = Schema.Literals([
    "canonicalize",
    "currency",
    "drain",
    "index",
    "live-rates",
    "logos",
    "publish",
    "purchases",
    "rates",
    "repriced",
    "wallet",
]);

const FAILED: Record<typeof SystemStep.Type, string> = {
    canonicalize: "Canonicalization backfill failed",
    currency: "Currency stamp failed",
    drain: "Pending writes failed to apply",
    index: "Spotlight index failed",
    "live-rates": "Live rates failed to apply",
    logos: "Logo backfill failed",
    publish: "Widget publish failed",
    purchases: "Waiting purchases failed to file",
    rates: "Rate refresh failed",
    repriced: "Repriced subscriptions failed to announce",
    wallet: "Wallet run stamp failed",
};

export class SystemSyncError extends Schema.TaggedError<SystemSyncError>()("SystemSyncError", {
    cause: Schema.Defect(),
    message: Schema.String,
    step: SystemStep,
}) {}

export class SystemSurfaces extends Context.Service<
    SystemSurfaces,
    {
        readonly indexSpotlight: (db: Database) => Promise<void>;
        readonly publishWidgets: (db: Database) => Promise<void>;
    }
>()("outlayr/lib/SystemSync/SystemSurfaces") {}

export const SystemSources = Context.Reference<{
    readonly pullRates: PullRatesFn;
    readonly watchPendingWrites: Signal;
    readonly watchRecentRates: Watch<RateWireRow[]>;
}>("outlayr/lib/SystemSync/SystemSources", {
    defaultValue: () => ({
        pullRates: ratesPuller(),
        watchPendingWrites: onWatchPendingWrite,
        watchRecentRates,
    }),
});

export class SystemSync extends Context.Service<
    SystemSync,
    { readonly run: (db: Database, swept: Stream.Stream<unknown>) => Effect.Effect<void, never, SystemSurfaces> }
>()("outlayr/lib/SystemSync") {}

const failedAt = (step: typeof SystemStep.Type) => (cause: unknown) =>
    new SystemSyncError({ cause, message: FAILED[step], step });

const warn = (error: SystemSyncError) => Effect.logWarning(error.message, error.cause);

const attempt = <A>(step: typeof SystemStep.Type, task: () => Promise<A>) =>
    Effect.tryPromise({ catch: failedAt(step), try: task });

const attemptOr = <A>(step: typeof SystemStep.Type, task: () => Promise<A>, fallback: A) =>
    attempt(step, task).pipe(Effect.catchTags({ SystemSyncError: (error) => warn(error).pipe(Effect.as(fallback)) }));

const anyCounted = Effect.fn("SystemSync.anyCounted")(function* anyCounted(
    step: typeof SystemStep.Type,
    counts: readonly (() => Promise<number>)[]
) {
    let changed = false;
    for (const count of counts) {
        const result = yield* Effect.result(attempt(step, count));
        if (Result.isFailure(result)) {
            yield* warn(result.failure);
            return changed;
        }
        changed = result.success > 0 || changed;
    }
    return changed;
});

const revalueLedger = Effect.fn("SystemSync.revalueLedger")(function* revalueLedger(db: Database) {
    // Stamp first: canonicalization skips rows that do not yet name the currency they were kept in.
    const stamped = yield* anyCounted("currency", [() => stampLedgerCurrency(db)]);
    // Always: an offline entry can leave rows unvalued even when the rate cache was already fresh.
    const backfilled = yield* anyCounted("canonicalize", [
        () => backfillCanonicalUsd(db),
        () => backfillBudgetUsd(db),
        () => backfillOpeningUsd(db),
        () => settlePendingFees(db),
    ]);
    return stamped || backfilled;
});

export const make = Effect.gen(function* make() {
    const sources = yield* SystemSources;
    const watchAppState = yield* WatchAppState;
    const watchTableWrites = yield* WatchTableWrites;

    const run = Effect.fn("SystemSync.run")(function* run(db: Database, swept: Stream.Stream<unknown>) {
        const surfaces = yield* SystemSurfaces;
        yield* Effect.sync(() => {
            armLogoBackfill(db);
        });

        const publishNow = attemptOr("publish", () => surfaces.publishWidgets(db), undefined);
        const reindexNow = attemptOr("index", () => surfaces.indexSpotlight(db), undefined);
        const publishRequests = yield* Queue.sliding<undefined>(1);
        const publishSoon = Queue.offer(publishRequests, undefined).pipe(Effect.asVoid);
        const publishIf = (changed: boolean) => (changed ? publishSoon : Effect.void);

        // The drain's writes trip the change listener, so it publishes itself only when nothing applied. Logos run
        // after the drain so a Wallet purchase that just landed is in the set they read.
        const catchUp = Effect.all(
            [
                attemptOr("wallet", () => mirrorWalletRun(db), undefined),
                attempt("drain", () => drainPendingWrites(db, claimPendingWrites, releasePendingWrites)).pipe(
                    Effect.flatMap((applied) => publishIf(applied === 0)),
                    Effect.catchTags({ SystemSyncError: (error) => warn(error).pipe(Effect.andThen(publishSoon)) }),
                    Effect.andThen(
                        attemptOr(
                            "purchases",
                            () => {
                                sendEnrichmentQueue(db);
                                return fileWaitingPurchases(db);
                            },
                            undefined
                        )
                    ),
                    Effect.andThen(attemptOr("repriced", () => announceRepriced(db), undefined)),
                    Effect.andThen(attemptOr("logos", () => backfillLogos(db), 0))
                ),
            ],
            { concurrency: "unbounded", discard: true }
        ).pipe(Effect.uninterruptible);

        // Republished explicitly: a refresh's unqualified `DELETE FROM exchangeRates` hits SQLite's truncate
        // optimization, which skips the update hook the listener relies on (expo-sqlite `sqlite3.h:7090-7095`).
        const refreshRates = Effect.gen(function* refreshRates() {
            const pulled = yield* attemptOr("rates", () => pullRatesIfDue(db, sources.pullRates), false);
            yield* publishIf((yield* revalueLedger(db)) || pulled);
        }).pipe(Effect.uninterruptible);
        const applyLiveRates = Effect.fn("SystemSync.applyLiveRates")(function* applyLiveRates(rows: RateWireRow[]) {
            const applied = yield* attemptOr("live-rates", () => applyRecentRates(db, rows), false);
            yield* publishIf((yield* revalueLedger(db)) || applied);
        });

        const backgrounds = appStates(watchAppState, "background");
        const settingChanges = signals((listener) => subscribeToSettingChanges(db, listener));
        const debounced = (requests: Stream.Stream<unknown>, delay: Duration.Duration) =>
            Stream.merge(requests.pipe(Stream.as(true)), backgrounds.pipe(Stream.as(false))).pipe(
                Stream.debounce(delay),
                Stream.filter(Boolean)
            );

        const publishRequested: Stream.Stream<unknown>[] = [
            Stream.fromQueue(publishRequests),
            listen(watchTableWrites, affectsWidgets),
            settingChanges,
        ];
        const publishes = debounced(
            Stream.mergeAll(publishRequested, { concurrency: "unbounded" }),
            PUBLISH_DEBOUNCE
        ).pipe(Stream.runForEach(() => publishNow));
        const reindexes = debounced(
            Stream.merge(listen(watchTableWrites, affectsSpotlight), settingChanges),
            SPOTLIGHT_DEBOUNCE
        ).pipe(Stream.runForEach(() => reindexNow));
        const flushes = backgrounds.pipe(
            Stream.runForEach(() => Effect.all([publishNow, reindexNow], { concurrency: "unbounded", discard: true }))
        );
        const catchUps = Stream.merge(swept, signals(sources.watchPendingWrites)).pipe(
            Stream.mapEffect(() => catchUp, { concurrency: "unbounded" }),
            Stream.runDrain
        );
        const rates = launchAndForegrounds(watchAppState).pipe(
            Stream.switchMap(() =>
                Stream.concat(Stream.fromEffectDrain(refreshRates), listen(sources.watchRecentRates))
            ),
            Stream.runForEach(applyLiveRates)
        );

        yield* Effect.all([reindexNow, catchUps, rates, publishes, reindexes, flushes], {
            concurrency: "unbounded",
            discard: true,
        });
    });

    return SystemSync.of({ run });
});

export const layer = Layer.effect(SystemSync, make);

async function mirrorWalletRun(db: Database): Promise<void> {
    const at = readWalletLastRun();
    if (at == null) {
        return;
    }
    const stamp = String(at);
    if ((await getMeta(db, META_KEYS.walletLastRunAt)) === stamp) {
        return;
    }
    await setMeta(db, META_KEYS.walletLastRunAt, stamp);
}

async function announceRepriced(db: Database): Promise<void> {
    for (const entry of await takeRepriced(db)) {
        notifyWarning({
            body: translateNow("log.repriced.body", { from: formatAmount(entry.from, entry.currency) }),
            title: translateNow("log.repriced.title", { name: entry.note, to: formatAmount(entry.to, entry.currency) }),
        });
    }
}
