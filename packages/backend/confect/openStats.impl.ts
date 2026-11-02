import { FunctionImpl, GroupImpl } from "@confect/server";
import * as Clock from "effect/Clock";
import * as Console from "effect/Console";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";

import type { OpenStatsDoc } from "./_generated/docs";
import refs from "./_generated/refs";
import databaseSchema from "./_generated/schema";
import { DatabaseReader, DatabaseWriter, MutationRunner, QueryRunner } from "./_generated/services";
import { gitHubToken, postHogConfig, revenueCatMetricsConfig } from "./lib/config";
import { outboundHttp } from "./lib/http";
import { accountStats, fetchGitHubStats, fetchPostHogStats, fetchRevenueStats } from "./openStats";
import type { OpenStatsError } from "./openStats";
import spec from "./openStats.spec";

const toSnapshot = ({ _creationTime: _created, _id, ...snapshot }: OpenStatsDoc) => snapshot;

const latestDoc = Effect.gen(function* latestDoc() {
    const reader = yield* DatabaseReader;
    return yield* reader.table("openStats").index("by_creation_time", "desc").first();
});

const orNull = <A, R>(effect: Effect.Effect<A, OpenStatsError, R>) =>
    effect.pipe(
        Effect.map(Option.some),
        Effect.catchTags({
            OpenStatsError: (error) =>
                Console.error(error.message, error.cause ?? "").pipe(Effect.as(Option.none<A>())),
        })
    );

const optional = <C, A, R>(config: Option.Option<C>, fetch: (value: C) => Effect.Effect<A, OpenStatsError, R>) =>
    Option.isSome(config) ? orNull(fetch(config.value)) : Effect.succeed(Option.none<A>());

const refresh = FunctionImpl.make(
    databaseSchema,
    spec,
    "refresh",
    Effect.fn("OpenStats.refresh")(function* refresh() {
        const now = yield* Clock.currentTimeMillis;
        const { runQuery } = yield* QueryRunner;
        const { runMutation } = yield* MutationRunner;
        const { previous, syncedAt } = yield* runQuery(refs.internal.openStats.inputs, {});
        const [posthog, revenue, github] = yield* Effect.all(
            [
                optional(yield* postHogConfig, fetchPostHogStats),
                optional(yield* revenueCatMetricsConfig, (config) => fetchRevenueStats(config, now)),
                orNull(fetchGitHubStats(yield* gitHubToken, now)),
            ],
            { concurrency: "unbounded" }
        ).pipe(Effect.provide(outboundHttp));
        yield* runMutation(refs.internal.openStats.save, {
            snapshot: {
                accounts: accountStats(syncedAt, now),
                computedAt: now,
                github: Option.getOrElse(github, () => previous?.github ?? null),
                posthog: Option.getOrElse(posthog, () => previous?.posthog ?? null),
                revenue: Option.getOrElse(revenue, () => previous?.revenue ?? null),
            },
        });
        return null;
    }, Effect.orDie)
);

const inputs = FunctionImpl.make(
    databaseSchema,
    spec,
    "inputs",
    Effect.fn("OpenStats.inputs")(function* inputs() {
        const reader = yield* DatabaseReader;
        const states = yield* reader.table("syncState").index("by_creation_time").collect();
        const previous = yield* latestDoc;
        return {
            previous: Option.match(previous, { onNone: () => null, onSome: toSnapshot }),
            syncedAt: states.map((state) => state._creationTime),
        };
    }, Effect.orDie)
);

const save = FunctionImpl.make(
    databaseSchema,
    spec,
    "save",
    Effect.fn("OpenStats.save")(function* save({ snapshot }) {
        const writer = yield* DatabaseWriter;
        const existing = yield* latestDoc;
        yield* Option.isSome(existing)
            ? writer.table("openStats").patch(existing.value._id, snapshot)
            : writer.table("openStats").insert(snapshot);
        return null;
    }, Effect.orDie)
);

const latest = FunctionImpl.make(
    databaseSchema,
    spec,
    "latest",
    Effect.fn("OpenStats.latest")(function* latest() {
        return Option.match(yield* latestDoc, { onNone: () => null, onSome: toSnapshot });
    }, Effect.orDie)
);

export default GroupImpl.make(databaseSchema, spec).pipe(
    Layer.provide(refresh),
    Layer.provide(inputs),
    Layer.provide(save),
    Layer.provide(latest),
    GroupImpl.finalize
);
