import { FunctionImpl, GroupImpl } from "@confect/server";
import type { RateLimitConfig } from "@convex-dev/rate-limiter";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import databaseSchema from "./_generated/schema";
import { Auth, QueryCtx } from "./_generated/services";
import { FREE_CAPTURE_CONFIG, PRO_CAPTURE_CONFIG } from "./lib/captures";
import { perUserBurst } from "./lib/limits";
import { reader } from "./limits";
import spec from "./limits.spec";
import { isPro } from "./revenuecat";

const mine = FunctionImpl.make(
    databaseSchema,
    spec,
    "mine",
    Effect.fn("Limits.mine")(function* mine() {
        const auth = yield* Auth;
        const ctx = yield* QueryCtx;
        const identity = yield* auth.getUserIdentity.pipe(
            Effect.catchTags({ NoUserIdentityFoundError: () => Effect.succeed(null) })
        );
        if (identity === null) {
            return null;
        }
        const pro = yield* Effect.promise(() => isPro(ctx, identity.subject));
        const read = (name: string, config: RateLimitConfig) =>
            Effect.promise(() => reader.getValue(ctx, name, { config, key: identity.tokenIdentifier })).pipe(
                Effect.map((state) => ({
                    capacity: state.config.capacity ?? state.config.rate,
                    kind: state.config.kind,
                    period: state.config.period,
                    rate: state.config.rate,
                    ts: state.ts,
                    value: state.value,
                }))
            );
        const [captures, csvImport, enrichment, receiptScan, voiceEntry] = yield* Effect.all(
            [
                read(pro ? "capturesPro" : "capturesFree", pro ? PRO_CAPTURE_CONFIG : FREE_CAPTURE_CONFIG),
                read("csvImportPerUser", perUserBurst("csvImport", true)),
                read("enrichmentPerUser", perUserBurst("enrichment", pro)),
                read("receiptScanPerUser", perUserBurst("receiptScan", pro)),
                read("voiceEntryPerUser", perUserBurst("voiceEntry", pro)),
            ],
            { concurrency: "unbounded" }
        );
        return { captures, csvImport: pro ? csvImport : null, enrichment, pro, receiptScan, voiceEntry };
    })
);

export default GroupImpl.make(databaseSchema, spec).pipe(Layer.provide(mine), GroupImpl.finalize);
