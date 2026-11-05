import { FunctionImpl, GroupImpl } from "@confect/server";
import * as Clock from "effect/Clock";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";

import databaseSchema from "./_generated/schema";
import { DatabaseReader, QueryCtx } from "./_generated/services";
import spec from "./ledger.spec";
import { requireUserId } from "./lib/auth";
import { dieAsConvexError } from "./lib/convexError";
import { DAY_MS, fromWall, localDate } from "./mcpLedger";
import {
    accountBalancesOf,
    budgetStatusOf,
    recentTransactionsOf,
    spendingSummaryOf,
    upcomingChargesOf,
    zoneOffset,
} from "./mcpLedger.impl";
import { requirePro } from "./revenuecat";

const syncedUser = Effect.fn("Ledger.syncedUser")(
    function* syncedUser() {
        const ctx = yield* QueryCtx;
        const userId = yield* requireUserId(ctx);
        yield* requirePro(ctx, userId);
        return userId;
    },
    Effect.catchTags({ ProRequired: dieAsConvexError, Unauthenticated: dieAsConvexError })
);

const nextChangeAt = Effect.fn("Ledger.nextChangeAt")(function* nextChangeAt(userId: string) {
    const reader = yield* DatabaseReader;
    const now = yield* Clock.currentTimeMillis;
    const offsetAt = yield* zoneOffset(userId, now);
    const tomorrow = Date.parse(`${localDate(now, offsetAt(now))}T00:00:00Z`) + DAY_MS;
    const [entry, transfer] = yield* Effect.all(
        [
            reader
                .table("transactions")
                .index("by_user_and_deletedAt_and_date", (q) =>
                    q.eq("userId", userId).eq("deletedAt", null).gt("date", now)
                )
                .first(),
            reader
                .table("transfers")
                .index("by_user_and_deletedAt_and_date", (q) =>
                    q.eq("userId", userId).eq("deletedAt", null).gt("date", now)
                )
                .first(),
        ],
        { concurrency: "unbounded" }
    );
    return Math.min(
        fromWall(tomorrow, offsetAt),
        ...[entry, transfer].flatMap((row: Option.Option<{ readonly date: number }>) =>
            Option.match(row, { onNone: () => [], onSome: ({ date }) => [date] })
        )
    );
}, Effect.orDie);

const overview = FunctionImpl.make(databaseSchema, spec, "overview", ({ limit }) =>
    syncedUser().pipe(
        Effect.flatMap((userId) =>
            Effect.all(
                {
                    balances: accountBalancesOf(userId),
                    budgets: budgetStatusOf(userId),
                    entries: recentTransactionsOf(userId, { limit }),
                    nextChangeAt: nextChangeAt(userId),
                    summary: spendingSummaryOf(userId),
                    upcoming: upcomingChargesOf(userId),
                },
                { concurrency: "unbounded" }
            )
        )
    )
);

export default GroupImpl.make(databaseSchema, spec).pipe(Layer.provide(overview), GroupImpl.finalize);
