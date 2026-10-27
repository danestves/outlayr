import * as Context from "effect/Context";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Queue from "effect/Queue";
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";
import * as Stream from "effect/Stream";

import { getMeta, META_KEYS, setMeta } from "@/data/app-meta-core";
import type { AppMetaError } from "@/data/app-meta-core";
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
import type { PullRatesFn, RateWireRow, RatesError } from "@/data/rates";
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
    "logos",
    "publish",
    "purchases",
    "repriced",
    "wallet",
]);

const FAILED: Record<typeof SystemStep.Type, string> = {
    canonicalize: "Canonicalization backfill failed",
    currency: "Currency stamp failed",
    drain: "Pending writes failed to apply",
    index: "Spotlight index failed",
    logos: "Logo backfill failed",
    publish: "Widget publish failed",
    purchases: "Waiting purchases failed to file",
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
        readonly indexSpotlight: (db: Database) => Effect.Effect<void>;
        readonly publishWidgets: (db: Database) => Effect.Effect<void>;
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

const failedStep =
    (step: typeof SystemStep.Type) =>
    <A, E, R>(effect: Effect.Effect<A, E, R>) =>
        effect.pipe(
            Effect.mapError(failedAt(step)),
            Effect.catchDefect((defect) => Effect.fail(failedAt(step)(defect)))
        );

const attempt = <A>(step: typeof SystemStep.Type, task: () => Promise<A>) =>
    Effect.tryPromise({ catch: failedAt(step), try: task });

const warnRatesFailed =
    (message: string) =>
    <R>(effect: Effect.Effect<boolean, AppMetaError | RatesError, R>) =>
        effect.pipe(
            Effect.catch((error) => Effect.logWarning(message, error.cause).pipe(Effect.as(false))),
            Effect.catchDefect((defect) => Effect.logWarning(message, defect).pipe(Effect.as(false)))
        );

const attemptOr = <A>(step: typeof SystemStep.Type, task: () => Promise<A>, fallback: A) =>
    attempt(step, task).pipe(Effect.catchTags({ SystemSyncError: (error) => warn(error).pipe(Effect.as(fallback)) }));

const surfaceStep = (step: typeof SystemStep.Type, surface: Effect.Effect<void>) =>
    surface.pipe(failedStep(step), Effect.catchTags({ SystemSyncError: warn }));

const anyCounted = Effect.fn("SystemSync.anyCounted")(function* anyCounted(
    step: typeof SystemStep.Type,
    counts: readonly Effect.Effect<number, { readonly cause: unknown }>[]
) {
    let changed = false;
    for (const count of counts) {
        const result = yield* Effect.result(
            count.pipe(
                Effect.mapError((error) => failedAt(step)(error.cause)),
                Effect.catchDefect((defect) => Effect.fail(failedAt(step)(defect)))
            )
        );
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
    const stamped = yield* anyCounted("currency", [stampLedgerCurrency(db)]);
    // Always: an offline entry can leave rows unvalued even when the rate cache was already fresh.
    const backfilled = yield* anyCounted("canonicalize", [
        backfillCanonicalUsd(db),
        backfillBudgetUsd(db),
        backfillOpeningUsd(db),
        settlePendingFees(db),
    ]);
    return stamped || backfilled;
});

const mirrorWalletRun = Effect.fn("SystemSync.mirrorWalletRun")(function* mirrorWalletRun(db: Database) {
    const at = yield* Effect.try(() => readWalletLastRun());
    if (at == null) {
        return;
    }
    const stamp = String(at);
    if ((yield* getMeta(db, META_KEYS.walletLastRunAt)) === stamp) {
        return;
    }
    yield* setMeta(db, META_KEYS.walletLastRunAt, stamp);
});

const announceRepriced = Effect.fn("SystemSync.announceRepriced")(function* announceRepriced(db: Database) {
    for (const entry of yield* takeRepriced(db)) {
        yield* Effect.try(() => {
            notifyWarning({
                body: translateNow("log.repriced.body", { from: formatAmount(entry.from, entry.currency) }),
                title: translateNow("log.repriced.title", {
                    name: entry.note,
                    to: formatAmount(entry.to, entry.currency),
                }),
            });
        });
    }
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

        const publishNow = surfaceStep("publish", surfaces.publishWidgets(db));
        const reindexNow = surfaceStep("index", surfaces.indexSpotlight(db));
        const publishRequests = yield* Queue.sliding<undefined>(1);
        const publishSoon = Queue.offer(publishRequests, undefined).pipe(Effect.asVoid);
        const publishIf = (changed: boolean) => (changed ? publishSoon : Effect.void);

        // The drain's writes trip the change listener, so it publishes itself only when nothing applied. Logos run
        // after the drain so a Wallet purchase that just landed is in the set they read.
        const mirrorRun = mirrorWalletRun(db).pipe(
            failedStep("wallet"),
            Effect.catchTags({ SystemSyncError: (error) => warn(error) })
        );
        const drainRun = drainPendingWrites(db, claimPendingWrites, releasePendingWrites).pipe(
            failedStep("drain"),
            Effect.flatMap((applied) => publishIf(applied === 0)),
            Effect.catchTags({ SystemSyncError: (error) => warn(error).pipe(Effect.andThen(publishSoon)) }),
            Effect.andThen(
                Effect.try(() => sendEnrichmentQueue(db)).pipe(
                    Effect.andThen(fileWaitingPurchases(db)),
                    failedStep("purchases"),
                    Effect.catchTags({ SystemSyncError: (error) => warn(error) })
                )
            ),
            Effect.andThen(
                announceRepriced(db).pipe(
                    failedStep("repriced"),
                    Effect.catchTags({ SystemSyncError: (error) => warn(error) })
                )
            ),
            Effect.andThen(attemptOr("logos", () => backfillLogos(db), 0))
        );
        const catchUp = Effect.all([mirrorRun, drainRun], { concurrency: "unbounded", discard: true }).pipe(
            Effect.uninterruptible
        );

        // Republished explicitly: a refresh's unqualified `DELETE FROM exchangeRates` hits SQLite's truncate
        // optimization, which skips the update hook the listener relies on (expo-sqlite `sqlite3.h:7090-7095`).
        const refreshRates = Effect.gen(function* refreshRates() {
            const pulled = yield* pullRatesIfDue(db, sources.pullRates).pipe(warnRatesFailed("Rate refresh failed"));
            yield* publishIf((yield* revalueLedger(db)) || pulled);
        }).pipe(Effect.uninterruptible);
        const applyLiveRates = Effect.fn("SystemSync.applyLiveRates")(function* applyLiveRates(rows: RateWireRow[]) {
            const applied = yield* applyRecentRates(db, rows).pipe(warnRatesFailed("Live rates failed to apply"));
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
