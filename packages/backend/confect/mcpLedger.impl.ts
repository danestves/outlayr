import { FunctionImpl, GroupImpl } from "@confect/server";
import {
    accountBalances as accountBalancesFrom,
    budgetStatus as budgetStatusFrom,
    recentTransactions as recentTransactionsFrom,
    spendingSummary as spendingSummaryFrom,
    upcomingCharges as upcomingChargesFrom,
} from "@outlayr/money/ledger-view";
import { DAY_MS, fixedOffset, monthWindow, utcDayStart, utcOffsetOf, zoneOffsets } from "@outlayr/money/ledger-zone";
import { RECURRING_TYPE } from "@outlayr/money/recurrence";
import { buildRateTable } from "@outlayr/money/valuation";
import * as Clock from "effect/Clock";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";

import databaseSchema from "./_generated/schema";
import { DatabaseReader } from "./_generated/services";
import { SCAN_WINDOW } from "./mcpLedger";
import spec from "./mcpLedger.spec";

export const setting = Effect.fn("McpLedger.setting")(function* setting(userId: string, key: string) {
    const reader = yield* DatabaseReader;
    const row = yield* reader
        .table("appMeta")
        .get("by_user_and_key", userId, key)
        .pipe(Effect.catchTags({ GetByIndexFailure: () => Effect.succeed(null) }));
    return row?.value ?? null;
});

export const storedZone = Effect.fn("McpLedger.storedZone")(function* storedZone(userId: string) {
    const timeZone = yield* setting(userId, "timeZone");
    return timeZone === null ? null : zoneOffsets(timeZone);
});

export const zoneOffset = Effect.fn("McpLedger.zoneOffset")(function* zoneOffset(userId: string, now: number) {
    const zone = yield* storedZone(userId);
    if (zone !== null) {
        return zone;
    }
    const reader = yield* DatabaseReader;
    const latest = yield* reader
        .table("transactions")
        .index(
            "by_user_and_deletedAt_and_date",
            (q) => q.eq("userId", userId).eq("deletedAt", null).lte("date", now),
            "desc"
        )
        .first();
    return fixedOffset(Option.match(latest, { onNone: () => 0, onSome: (row) => utcOffsetOf(row.day) }));
});

const ratesIn = Effect.fn("McpLedger.ratesIn")(function* ratesIn(...codes: string[]) {
    const reader = yield* DatabaseReader;
    const quotes = [...new Set(codes)].filter((code) => code !== "USD");
    const rows = yield* Effect.all(
        quotes.map((code) =>
            reader
                .table("exchangeRates")
                .index("by_quote_and_rateType_and_date", (q) => q.eq("quote", code).eq("rateType", "official"))
                .collect()
        ),
        { concurrency: "unbounded" }
    );
    return buildRateTable(rows.flat());
});

const lookup = <Row, E>(read: (localId: string) => Effect.Effect<Row | null, E>, localIds: readonly string[]) =>
    Effect.all(
        [...new Set(localIds)].map((localId) => read(localId)),
        { concurrency: "unbounded" }
    ).pipe(Effect.map((rows) => rows.filter((row): row is Row => row !== null)));

export const recentTransactionsOf = Effect.fn("McpLedger.recentTransactions")(function* recentTransactions(
    userId: string,
    { limit }: { readonly limit?: number | undefined } = {}
) {
    const reader = yield* DatabaseReader;
    const timeZone = yield* setting(userId, "timeZone");
    const now = yield* Clock.currentTimeMillis;
    const transactions = yield* reader
        .table("transactions")
        .index("by_user_and_seq", (q) => q.eq("userId", userId), "desc")
        .take(SCAN_WINDOW);
    const shown = new Set(
        recentTransactionsFrom({ accounts: [], categories: [], transactions }, { limit, now, timeZone }).map(
            (row) => row.id
        )
    );
    const picked = transactions.filter((row) => shown.has(row.localId));
    const [categories, accounts] = yield* Effect.all(
        [
            lookup(
                (localId) =>
                    reader
                        .table("categories")
                        .get("by_user_and_localId", userId, localId)
                        .pipe(Effect.catchTags({ GetByIndexFailure: () => Effect.succeed(null) })),
                picked.flatMap((row) => (row.categoryId ? [row.categoryId] : []))
            ),
            lookup(
                (localId) =>
                    reader
                        .table("accounts")
                        .get("by_user_and_localId", userId, localId)
                        .pipe(Effect.catchTags({ GetByIndexFailure: () => Effect.succeed(null) })),
                picked.flatMap((row) => (row.accountId ? [row.accountId] : []))
            ),
        ],
        { concurrency: "unbounded" }
    );
    return recentTransactionsFrom({ accounts, categories, transactions: picked }, { limit, now, timeZone });
}, Effect.orDie);

const ledgerClock = Effect.fn("McpLedger.ledgerClock")(function* ledgerClock(userId: string) {
    const now = yield* Clock.currentTimeMillis;
    return { now, offsetAt: yield* zoneOffset(userId, now) };
});

export const spendingSummaryOf = Effect.fn("McpLedger.spendingSummary")(function* spendingSummary(
    userId: string,
    { monthsAgo = 0 }: { readonly monthsAgo?: number | undefined } = {}
) {
    const reader = yield* DatabaseReader;
    const currency = (yield* setting(userId, "currency")) ?? "USD";
    const firstDayOfMonth = Number(yield* setting(userId, "firstDayOfMonth")) || 1;
    const clock = yield* ledgerClock(userId);
    const window = monthWindow(clock.now, clock.offsetAt, firstDayOfMonth, Math.max(0, Math.trunc(monthsAgo)));
    const [transactions, categories, rates] = yield* Effect.all(
        [
            reader
                .table("transactions")
                .index("by_user_and_deletedAt_and_date", (q) =>
                    q
                        .eq("userId", userId)
                        .eq("deletedAt", null)
                        .gte("date", utcDayStart(window.start))
                        .lt("date", utcDayStart(window.end - 1) + DAY_MS)
                )
                .collect(),
            reader
                .table("categories")
                .index("by_user_and_seq", (q) => q.eq("userId", userId))
                .collect(),
            ratesIn(currency),
        ],
        { concurrency: "unbounded" }
    );
    return spendingSummaryFrom(
        { categories, transactions },
        { currency, firstDayOfMonth, timeZone: null },
        rates,
        clock,
        monthsAgo
    );
}, Effect.orDie);

export const accountBalancesOf = Effect.fn("McpLedger.accountBalances")(function* accountBalances(userId: string) {
    const reader = yield* DatabaseReader;
    const currency = (yield* setting(userId, "currency")) ?? "USD";
    const clock = yield* ledgerClock(userId);
    const [accounts, transactions, transfers, installmentPlans, outsidePayments, outsideMoves] = yield* Effect.all(
        [
            reader
                .table("accounts")
                .index("by_user_and_seq", (q) => q.eq("userId", userId))
                .collect(),
            reader
                .table("transactions")
                .index("by_user_and_deletedAt_and_date", (q) =>
                    q.eq("userId", userId).eq("deletedAt", null).lte("date", clock.now)
                )
                .collect(),
            reader
                .table("transfers")
                .index("by_user_and_deletedAt_and_date", (q) =>
                    q.eq("userId", userId).eq("deletedAt", null).lte("date", clock.now)
                )
                .collect(),
            reader
                .table("installmentPlans")
                .index("by_user_and_seq", (q) => q.eq("userId", userId))
                .collect(),
            reader
                .table("outsidePayments")
                .index("by_user_and_seq", (q) => q.eq("userId", userId))
                .collect(),
            reader
                .table("outsideMoves")
                .index("by_user_and_seq", (q) => q.eq("userId", userId))
                .collect(),
        ],
        { concurrency: "unbounded" }
    );
    const rates = yield* ratesIn(
        currency,
        ...accounts.filter((row) => row.deletedAt === null).map((row) => row.currency)
    );
    return accountBalancesFrom(
        { accounts, installmentPlans, outsideMoves, outsidePayments, transactions, transfers },
        currency,
        rates,
        clock
    );
}, Effect.orDie);

export const budgetStatusOf = Effect.fn("McpLedger.budgetStatus")(function* budgetStatus(userId: string) {
    const reader = yield* DatabaseReader;
    const currency = (yield* setting(userId, "currency")) ?? "USD";
    const clock = yield* ledgerClock(userId);
    const [mainBudget, budgets, transactions, categories, rates] = yield* Effect.all(
        [
            reader
                .table("mainBudget")
                .index("by_user_and_seq", (q) => q.eq("userId", userId))
                .collect(),
            reader
                .table("budgets")
                .index("by_user_and_seq", (q) => q.eq("userId", userId))
                .collect(),
            reader
                .table("transactions")
                .index("by_user_and_deletedAt_and_date", (q) =>
                    q.eq("userId", userId).eq("deletedAt", null).lte("date", clock.now)
                )
                .collect(),
            reader
                .table("categories")
                .index("by_user_and_seq", (q) => q.eq("userId", userId))
                .collect(),
            ratesIn(currency),
        ],
        { concurrency: "unbounded" }
    );
    return budgetStatusFrom({ budgets, categories, mainBudget, transactions }, currency, rates, clock);
}, Effect.orDie);

export const upcomingChargesOf = Effect.fn("McpLedger.upcomingCharges")(function* upcomingCharges(userId: string) {
    const reader = yield* DatabaseReader;
    const currency = (yield* setting(userId, "currency")) ?? "USD";
    const clock = yield* ledgerClock(userId);
    const [recurring, future, categories, rates] = yield* Effect.all(
        [
            reader
                .table("transactions")
                .index("by_user_and_deletedAt_and_recurringType", (q) =>
                    q.eq("userId", userId).eq("deletedAt", null).gt("recurringType", RECURRING_TYPE.none)
                )
                .collect(),
            reader
                .table("transactions")
                .index("by_user_and_deletedAt_and_date", (q) =>
                    q.eq("userId", userId).eq("deletedAt", null).gt("date", clock.now)
                )
                .collect(),
            reader
                .table("categories")
                .index("by_user_and_seq", (q) => q.eq("userId", userId))
                .collect(),
            ratesIn(currency),
        ],
        { concurrency: "unbounded" }
    );
    // A future recurring entry is in both reads.
    const transactions = [...new Map([...recurring, ...future].map((row) => [row._id, row])).values()];
    return upcomingChargesFrom({ categories, transactions }, currency, rates, clock);
}, Effect.orDie);

const recentTransactions = FunctionImpl.make(databaseSchema, spec, "recentTransactions", ({ user, ...args }) =>
    recentTransactionsOf(user.userId, args)
);

const spendingSummary = FunctionImpl.make(databaseSchema, spec, "spendingSummary", ({ user, ...args }) =>
    spendingSummaryOf(user.userId, args)
);

const accountBalances = FunctionImpl.make(databaseSchema, spec, "accountBalances", ({ user }) =>
    accountBalancesOf(user.userId)
);

const budgetStatus = FunctionImpl.make(databaseSchema, spec, "budgetStatus", ({ user }) => budgetStatusOf(user.userId));

const upcomingCharges = FunctionImpl.make(databaseSchema, spec, "upcomingCharges", ({ user }) =>
    upcomingChargesOf(user.userId)
);

export default GroupImpl.make(databaseSchema, spec).pipe(
    Layer.provide(recentTransactions),
    Layer.provide(spendingSummary),
    Layer.provide(accountBalances),
    Layer.provide(budgetStatus),
    Layer.provide(upcomingCharges),
    GroupImpl.finalize
);
