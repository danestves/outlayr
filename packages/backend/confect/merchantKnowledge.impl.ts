import { FunctionImpl, GroupImpl } from "@confect/server";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import databaseSchema from "./_generated/schema";
import { DatabaseReader, DatabaseWriter } from "./_generated/services";
import { MODEL_TTL_MS, WEB_TTL_MS } from "./lib/merchantTrust";
import { expiresAt, MAX_KEYS, sourceOf } from "./merchantKnowledge";
import spec from "./merchantKnowledge.spec";

const findByKey = Effect.fn("MerchantKnowledge.findByKey")(function* findByKey(key: string) {
    const reader = yield* DatabaseReader;
    return yield* reader
        .table("merchantKnowledge")
        .get("by_key", key)
        .pipe(Effect.catchTags({ GetByIndexFailure: () => Effect.succeed(null) }));
});

const findKnowledge = Effect.fn("MerchantKnowledge.findKnowledge")(function* findKnowledge(
    keys: readonly string[],
    now: number
) {
    // The keys are tried in order of trust, raw name first, and the first live row answers.
    for (const key of keys.slice(0, MAX_KEYS)) {
        const row = yield* findByKey(key);
        if (row !== null && expiresAt(row) > now) {
            return {
                categoryName: row.categoryName,
                domain: row.domain,
                emoji: row.emoji,
                key: row.key,
                merchantName: row.merchantName,
                modelId: row.modelId,
                parentCategoryName: row.parentCategoryName,
                resolvedAt: row.resolvedAt,
                source: sourceOf(row),
                tags: row.tags,
            };
        }
    }
    return null;
});

const lookup = FunctionImpl.make(
    databaseSchema,
    spec,
    "lookup",
    Effect.fn("MerchantKnowledge.lookup")(function* lookup(args) {
        return yield* findKnowledge(args.keys, args.now);
    }, Effect.orDie)
);

const lookupMany = FunctionImpl.make(
    databaseSchema,
    spec,
    "lookupMany",
    Effect.fn("MerchantKnowledge.lookupMany")(function* lookupMany(args) {
        return yield* Effect.all(
            args.keyLists.map((keys) => findKnowledge(keys, args.now)),
            { concurrency: "unbounded" }
        );
    }, Effect.orDie)
);

const record = FunctionImpl.make(
    databaseSchema,
    spec,
    "record",
    Effect.fn("MerchantKnowledge.record")(function* record({ keys, ...args }) {
        const writer = yield* DatabaseWriter;
        const row = {
            ...args,
            expiresAt: args.resolvedAt + (args.source === "web" ? WEB_TTL_MS : MODEL_TTL_MS),
        };
        // One indexed point read and write per key, inside one transaction.
        for (const key of keys.slice(0, MAX_KEYS)) {
            const existing = yield* findByKey(key);
            if (existing === null) {
                yield* writer.table("merchantKnowledge").insert({ ...row, key });
            } else if (
                args.source === "web" ||
                sourceOf(existing) === "model" ||
                expiresAt(existing) <= args.resolvedAt
            ) {
                yield* writer.table("merchantKnowledge").patch(existing._id, { ...row, key });
            }
        }
        return null;
    }, Effect.orDie)
);

const purge = FunctionImpl.make(
    databaseSchema,
    spec,
    "purge",
    Effect.fn("MerchantKnowledge.purge")(function* purge(args) {
        const writer = yield* DatabaseWriter;
        const existing = yield* findByKey(args.key);
        if (existing !== null) {
            yield* writer.table("merchantKnowledge").delete(existing._id);
        }
        return null;
    }, Effect.orDie)
);

export default GroupImpl.make(databaseSchema, spec).pipe(
    Layer.provide(lookup),
    Layer.provide(lookupMany),
    Layer.provide(record),
    Layer.provide(purge),
    GroupImpl.finalize
);
