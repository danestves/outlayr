import { FunctionImpl, GroupImpl } from "@confect/server";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import databaseSchema from "./_generated/schema";
import { DatabaseReader, QueryCtx } from "./_generated/services";
import spec from "./ledger.spec";
import { LEDGER_SETTING_KEYS } from "./ledgerView";
import { requireUserId } from "./lib/auth";
import { dieAsConvexError } from "./lib/convexError";
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

const accountsQuery = FunctionImpl.make(databaseSchema, spec, "accounts", () =>
    Effect.gen(function* accounts() {
        const userId = yield* syncedUser();
        const reader = yield* DatabaseReader;
        return yield* reader
            .table("accounts")
            .index("by_user_and_seq", (q) => q.eq("userId", userId))
            .collect();
    }).pipe(Effect.orDie)
);

const budgetsQuery = FunctionImpl.make(databaseSchema, spec, "budgets", () =>
    Effect.gen(function* budgets() {
        const userId = yield* syncedUser();
        const reader = yield* DatabaseReader;
        return yield* reader
            .table("budgets")
            .index("by_user_and_seq", (q) => q.eq("userId", userId))
            .collect();
    }).pipe(Effect.orDie)
);

const categoriesQuery = FunctionImpl.make(databaseSchema, spec, "categories", () =>
    Effect.gen(function* categories() {
        const userId = yield* syncedUser();
        const reader = yield* DatabaseReader;
        return yield* reader
            .table("categories")
            .index("by_user_and_seq", (q) => q.eq("userId", userId))
            .collect();
    }).pipe(Effect.orDie)
);

const installmentsQuery = FunctionImpl.make(databaseSchema, spec, "installments", () =>
    Effect.gen(function* installments() {
        const userId = yield* syncedUser();
        const reader = yield* DatabaseReader;
        return yield* reader
            .table("installments")
            .index("by_user_and_seq", (q) => q.eq("userId", userId))
            .collect();
    }).pipe(Effect.orDie)
);

const savingsGoalsQuery = FunctionImpl.make(databaseSchema, spec, "savingsGoals", () =>
    Effect.gen(function* savingsGoals() {
        const userId = yield* syncedUser();
        const reader = yield* DatabaseReader;
        return yield* reader
            .table("savingsGoals")
            .index("by_user_and_seq", (q) => q.eq("userId", userId))
            .collect();
    }).pipe(Effect.orDie)
);

const installmentPlansQuery = FunctionImpl.make(databaseSchema, spec, "installmentPlans", () =>
    Effect.gen(function* installmentPlans() {
        const userId = yield* syncedUser();
        const reader = yield* DatabaseReader;
        return yield* reader
            .table("installmentPlans")
            .index("by_user_and_seq", (q) => q.eq("userId", userId))
            .collect();
    }).pipe(Effect.orDie)
);

const mainBudgetQuery = FunctionImpl.make(databaseSchema, spec, "mainBudget", () =>
    Effect.gen(function* mainBudget() {
        const userId = yield* syncedUser();
        const reader = yield* DatabaseReader;
        return yield* reader
            .table("mainBudget")
            .index("by_user_and_seq", (q) => q.eq("userId", userId))
            .collect();
    }).pipe(Effect.orDie)
);

const outsideMovesQuery = FunctionImpl.make(databaseSchema, spec, "outsideMoves", () =>
    Effect.gen(function* outsideMoves() {
        const userId = yield* syncedUser();
        const reader = yield* DatabaseReader;
        return yield* reader
            .table("outsideMoves")
            .index("by_user_and_seq", (q) => q.eq("userId", userId))
            .collect();
    }).pipe(Effect.orDie)
);

const outsidePaymentsQuery = FunctionImpl.make(databaseSchema, spec, "outsidePayments", () =>
    Effect.gen(function* outsidePayments() {
        const userId = yield* syncedUser();
        const reader = yield* DatabaseReader;
        return yield* reader
            .table("outsidePayments")
            .index("by_user_and_seq", (q) => q.eq("userId", userId))
            .collect();
    }).pipe(Effect.orDie)
);

const transactionsQuery = FunctionImpl.make(databaseSchema, spec, "transactions", ({ paginationOpts }) =>
    Effect.gen(function* transactions() {
        const userId = yield* syncedUser();
        const reader = yield* DatabaseReader;
        return yield* reader
            .table("transactions")
            .index("by_user_and_deletedAt_and_date", (q) => q.eq("userId", userId).eq("deletedAt", null))
            .paginate(paginationOpts);
    }).pipe(Effect.orDie)
);

const transfersQuery = FunctionImpl.make(databaseSchema, spec, "transfers", ({ paginationOpts }) =>
    Effect.gen(function* transfers() {
        const userId = yield* syncedUser();
        const reader = yield* DatabaseReader;
        return yield* reader
            .table("transfers")
            .index("by_user_and_deletedAt_and_date", (q) => q.eq("userId", userId).eq("deletedAt", null))
            .paginate(paginationOpts);
    }).pipe(Effect.orDie)
);

const tagsQuery = FunctionImpl.make(databaseSchema, spec, "tags", () =>
    Effect.gen(function* tags() {
        const userId = yield* syncedUser();
        const reader = yield* DatabaseReader;
        return yield* reader
            .table("tags")
            .index("by_user_and_seq", (q) => q.eq("userId", userId))
            .collect();
    }).pipe(Effect.orDie)
);

const transactionTagsQuery = FunctionImpl.make(databaseSchema, spec, "transactionTags", ({ paginationOpts }) =>
    Effect.gen(function* transactionTags() {
        const userId = yield* syncedUser();
        const reader = yield* DatabaseReader;
        return yield* reader
            .table("transactionTags")
            .index("by_user_and_seq", (q) => q.eq("userId", userId))
            .paginate(paginationOpts);
    }).pipe(Effect.orDie)
);

const appMetaQuery = FunctionImpl.make(databaseSchema, spec, "appMeta", () =>
    Effect.gen(function* appMeta() {
        const userId = yield* syncedUser();
        const reader = yield* DatabaseReader;
        const rows = yield* Effect.all(
            LEDGER_SETTING_KEYS.map((key) =>
                reader
                    .table("appMeta")
                    .get("by_user_and_key", userId, key)
                    .pipe(Effect.catchTags({ GetByIndexFailure: () => Effect.succeed(null) }))
            ),
            { concurrency: "unbounded" }
        );
        return rows.filter((row) => row !== null);
    }).pipe(Effect.orDie)
);

const exchangeRatesQuery = FunctionImpl.make(databaseSchema, spec, "exchangeRates", () =>
    Effect.gen(function* exchangeRates() {
        const userId = yield* syncedUser();
        const reader = yield* DatabaseReader;
        const [currency, accounts] = yield* Effect.all(
            [
                reader
                    .table("appMeta")
                    .get("by_user_and_key", userId, "currency")
                    .pipe(Effect.catchTags({ GetByIndexFailure: () => Effect.succeed(null) })),
                reader
                    .table("accounts")
                    .index("by_user_and_seq", (q) => q.eq("userId", userId))
                    .collect(),
            ],
            { concurrency: "unbounded" }
        );
        const quotes = new Set([
            currency?.value ?? "USD",
            ...accounts.filter((row) => row.deletedAt === null).map((row) => row.currency),
        ]);
        quotes.delete("USD");
        const rows = yield* Effect.all(
            [...quotes].map((quote) =>
                reader
                    .table("exchangeRates")
                    .index("by_quote_and_rateType_and_date", (q) => q.eq("quote", quote).eq("rateType", "official"))
                    .collect()
            ),
            { concurrency: "unbounded" }
        );
        return rows.flat();
    }).pipe(Effect.orDie)
);

export default GroupImpl.make(databaseSchema, spec).pipe(
    Layer.provide(transactionsQuery),
    Layer.provide(transfersQuery),
    Layer.provide(appMetaQuery),
    Layer.provide(exchangeRatesQuery),
    Layer.provide(accountsQuery),
    Layer.provide(budgetsQuery),
    Layer.provide(categoriesQuery),
    Layer.provide(installmentPlansQuery),
    Layer.provide(installmentsQuery),
    Layer.provide(savingsGoalsQuery),
    Layer.provide(mainBudgetQuery),
    Layer.provide(outsideMovesQuery),
    Layer.provide(outsidePaymentsQuery),
    Layer.provide(tagsQuery),
    Layer.provide(transactionTagsQuery),
    GroupImpl.finalize
);
