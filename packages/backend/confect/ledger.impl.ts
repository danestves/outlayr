import { FunctionImpl, GroupImpl } from "@confect/server";
import { utcDateString } from "@outlayr/money/dates";
import { isExact, valueDatedRowsIn } from "@outlayr/money/valuation";
import * as Clock from "effect/Clock";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";

import databaseSchema from "./_generated/schema";
import { DatabaseReader, QueryCtx } from "./_generated/services";
import spec from "./ledger.spec";
import { requireUserId } from "./lib/auth";
import { dieAsConvexError } from "./lib/convexError";
import { accountLook, buildLog, entryLook, placed } from "./lib/ledgerLog";
import type { EntrySource } from "./lib/ledgerLog";
import { DAY_MS, fromWall, localDate, MAX_ENTRIES, wallDay } from "./mcpLedger";
import {
    accountBalancesOf,
    budgetStatusOf,
    cadenceOf,
    liveCategories,
    ratesIn,
    scheduleOf,
    setting,
    spendingSummaryOf,
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

const LOG_SCAN = 300;

const logOf = Effect.fn("Ledger.log")(function* log(userId: string, limit: number) {
    const reader = yield* DatabaseReader;
    const now = yield* Clock.currentTimeMillis;
    const currency = (yield* setting(userId, "currency")) ?? "USD";
    const [entries, transfers, accountRows, categories, rates, offsetAt] = yield* Effect.all(
        [
            reader
                .table("transactions")
                .index(
                    "by_user_and_deletedAt_and_date",
                    (q) => q.eq("userId", userId).eq("deletedAt", null).lte("date", now),
                    "desc"
                )
                .take(LOG_SCAN),
            reader
                .table("transfers")
                .index(
                    "by_user_and_deletedAt_and_date",
                    (q) => q.eq("userId", userId).eq("deletedAt", null).lte("date", now),
                    "desc"
                )
                .take(LOG_SCAN),
            reader
                .table("accounts")
                .index("by_user_and_seq", (q) => q.eq("userId", userId))
                .collect(),
            liveCategories(userId),
            ratesIn(currency),
            zoneOffset(userId, now),
        ],
        { concurrency: "unbounded" }
    );
    return buildLog({
        accounts: new Map(accountRows.map((row) => [row.localId, row])),
        categories,
        // The instant, not the stored `day`: that is midnight in the zone the row was saved in, which can split a day.
        clock: {
            dayOf: (row) => localDate(row.date, offsetAt(row.date)),
            timeOf: (row) => new Date(row.date + offsetAt(row.date)).toISOString().slice(11, 16),
        },
        currency,
        entries,
        entriesFull: entries.length === LOG_SCAN,
        limit: Math.min(Math.max(limit, 1), MAX_ENTRIES),
        rates,
        transfers,
        transfersFull: transfers.length === LOG_SCAN,
    });
}, Effect.orDie);

const upcomingOf = Effect.fn("Ledger.upcoming")(function* upcoming(userId: string) {
    const { categories, charges, currency, monthlyCost, rates } = yield* scheduleOf(userId);
    const valuedIn = (row: EntrySource, landsOn: Date) => {
        if (row.currency === currency) {
            return { amount: row.amount, currency, valued: null };
        }
        // Valued at the coming charge: a renewal's saved date can predate every held rate.
        const [value] = valueDatedRowsIn([{ ...row, date: landsOn }], currency, rates);
        const exact = isExact({ ...row, dateKey: utcDateString(landsOn.getTime()) }, currency, rates);
        return placed(row, currency, exact ? (value ?? null) : null);
    };
    const ids = new Set(charges.map(({ row }) => row.localId));
    const feeOf = new Map(
        charges.flatMap(({ landsOn, row }) =>
            row.feeForId && ids.has(row.feeForId) ? [[row.feeForId, valuedIn(row, landsOn)] as const] : []
        )
    );
    return {
        charges: charges
            .filter(({ row }) => !(row.feeForId && ids.has(row.feeForId)))
            .map(({ landsOn, row }) => {
                const category = row.categoryId ? categories.get(row.categoryId) : undefined;
                return {
                    ...valuedIn(row, landsOn),
                    cadence: cadenceOf(row.recurringType),
                    every: row.recurringCoefficient,
                    fee: feeOf.get(row.localId) ?? null,
                    id: row.localId,
                    kind: row.income ? ("income" as const) : ("expense" as const),
                    look: entryLook(row, category),
                    nextCharge: wallDay(landsOn),
                    note: row.note || category?.name || "",
                };
            }),
        currency,
        monthlyCost,
    };
}, Effect.orDie);

const balancesOf = Effect.fn("Ledger.balances")(function* balances(userId: string) {
    const { accounts, ...rest } = yield* accountBalancesOf(userId);
    return {
        ...rest,
        accounts: accounts.map((account) => ({
            ...account,
            look: accountLook(account),
        })),
    };
});

const overview = FunctionImpl.make(databaseSchema, spec, "overview", ({ limit }) =>
    syncedUser().pipe(
        Effect.flatMap((userId) =>
            Effect.all(
                {
                    balances: balancesOf(userId),
                    budgets: budgetStatusOf(userId),
                    log: logOf(userId, limit ?? MAX_ENTRIES),
                    nextChangeAt: nextChangeAt(userId),
                    summary: spendingSummaryOf(userId),
                    upcoming: upcomingOf(userId),
                },
                { concurrency: "unbounded" }
            )
        )
    )
);

export default GroupImpl.make(databaseSchema, spec).pipe(Layer.provide(overview), GroupImpl.finalize);
