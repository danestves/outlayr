import { FunctionImpl, GroupImpl } from "@confect/server";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import databaseSchema from "./_generated/schema";
import { QueryCtx } from "./_generated/services";
import spec from "./ledger.spec";
import { requireUserId } from "./lib/auth";
import { dieAsConvexError } from "./lib/convexError";
import {
    accountBalancesOf,
    budgetStatusOf,
    recentTransactionsOf,
    spendingSummaryOf,
    upcomingChargesOf,
} from "./mcpLedger.impl";
import { requirePro } from "./revenuecat";

// Server data only exists for synced ledgers, and sync is Pro, so these gate the same way pullSince does.
const syncedUser = Effect.fn("Ledger.syncedUser")(
    function* syncedUser() {
        const ctx = yield* QueryCtx;
        const userId = yield* requireUserId(ctx);
        yield* requirePro(ctx, userId);
        return userId;
    },
    Effect.catchTags({ ProRequired: dieAsConvexError, Unauthenticated: dieAsConvexError })
);

const recentTransactions = FunctionImpl.make(databaseSchema, spec, "recentTransactions", (args) =>
    syncedUser().pipe(Effect.flatMap((userId) => recentTransactionsOf(userId, args)))
);

const spendingSummary = FunctionImpl.make(databaseSchema, spec, "spendingSummary", (args) =>
    syncedUser().pipe(Effect.flatMap((userId) => spendingSummaryOf(userId, args)))
);

const accountBalances = FunctionImpl.make(databaseSchema, spec, "accountBalances", () =>
    syncedUser().pipe(Effect.flatMap(accountBalancesOf))
);

const budgetStatus = FunctionImpl.make(databaseSchema, spec, "budgetStatus", () =>
    syncedUser().pipe(Effect.flatMap(budgetStatusOf))
);

const upcomingCharges = FunctionImpl.make(databaseSchema, spec, "upcomingCharges", () =>
    syncedUser().pipe(Effect.flatMap(upcomingChargesOf))
);

export default GroupImpl.make(databaseSchema, spec).pipe(
    Layer.provide(recentTransactions),
    Layer.provide(spendingSummary),
    Layer.provide(accountBalances),
    Layer.provide(budgetStatus),
    Layer.provide(upcomingCharges),
    GroupImpl.finalize
);
