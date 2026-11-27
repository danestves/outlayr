import { FunctionImpl, GroupImpl } from "@confect/server";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import databaseSchema from "./_generated/schema";
import { MutationCtx } from "./_generated/services";
import spec from "./ledgerCells.spec";
import { requireUserId } from "./lib/auth";
import { dieAsConvexError } from "./lib/convexError";
import { rebuildCells, refreshDays, startCells } from "./lib/ledgerCells";
import { dieNotProfileMember, resolveLedger } from "./lib/profileLedger";
import { refuseWhileDeleting } from "./lib/syncGuards";
import { requirePro } from "./revenuecat";

const build = FunctionImpl.make(
    databaseSchema,
    spec,
    "build",
    Effect.fn("LedgerCells.build")(
        function* build(args) {
            const ctx = yield* MutationCtx;
            const accountId = yield* requireUserId(ctx);
            const ledger = yield* resolveLedger(accountId, args.profileId);
            yield* requirePro(ctx, ledger.ownerId);
            yield* refuseWhileDeleting(accountId);
            if (ledger.joined) {
                yield* refuseWhileDeleting(ledger.ownerId);
            }
            yield* startCells(ledger.key);
            return null;
        },
        Effect.catchTags({
            AccountDeleting: dieAsConvexError,
            NotProfileMember: dieNotProfileMember,
            ProRequired: dieAsConvexError,
            Unauthenticated: dieAsConvexError,
        }),
        Effect.orDie
    )
);

const refresh = FunctionImpl.make(
    databaseSchema,
    spec,
    "refresh",
    Effect.fn("LedgerCells.refresh")(function* refresh({ days, userId }) {
        yield* refreshDays(userId, days);
        return null;
    }, Effect.orDie)
);

const rebuild = FunctionImpl.make(
    databaseSchema,
    spec,
    "rebuild",
    Effect.fn("LedgerCells.rebuild")(function* rebuild({ step, userId }) {
        yield* rebuildCells(userId, step);
        return null;
    }, Effect.orDie)
);

export default GroupImpl.make(databaseSchema, spec).pipe(
    Layer.provide(build),
    Layer.provide(refresh),
    Layer.provide(rebuild),
    GroupImpl.finalize
);
