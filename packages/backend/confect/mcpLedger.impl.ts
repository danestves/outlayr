import { FunctionImpl, GroupImpl } from "@confect/server";
import { accountBalance } from "@outlayr/money/account-balance";
import { accountsOverview } from "@outlayr/money/account-overview";
import { spentForCategory, spentForMain } from "@outlayr/money/budget-spent";
import type { ExpenseContribution } from "@outlayr/money/budget-spent";
import { decimalsFor } from "@outlayr/money/currency";
import { landingDate, RECURRING_TYPE } from "@outlayr/money/recurrence";
import { roundMoney } from "@outlayr/money/round";
import { monthlySubscriptionCost } from "@outlayr/money/subscription-cost";
import { buildRateTable, valueDatedRowsIn } from "@outlayr/money/valuation";
import * as Clock from "effect/Clock";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";

import databaseSchema from "./_generated/schema";
import { DatabaseReader } from "./_generated/services";
import {
    budgetStanding,
    bySeq,
    customName,
    DAY_MS,
    entryKind,
    fixedOffset,
    groupCells,
    localDate,
    MAX_ENTRIES,
    monthWindow,
    SCAN_WINDOW,
    utcDayStart,
    utcOffsetOf,
    wall,
    wallDay,
    zoneOffsets,
} from "./mcpLedger";
import type { LegEntry } from "./mcpLedger";
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

const liveCategories = Effect.fn("McpLedger.liveCategories")(function* liveCategories(userId: string) {
    const reader = yield* DatabaseReader;
    const rows = yield* reader
        .table("categories")
        .index("by_user_and_seq", (q) => q.eq("userId", userId))
        .collect();
    return new Map(rows.filter((row) => row.deletedAt === null).map((row) => [row.localId, row]));
});

export const recentTransactionsOf = Effect.fn("McpLedger.recentTransactions")(function* recentTransactions(
    userId: string,
    { limit = 20 }: { readonly limit?: number | undefined } = {}
) {
    const reader = yield* DatabaseReader;
    const zone = yield* storedZone(userId);
    const now = yield* Clock.currentTimeMillis;
    const rows = yield* reader
        .table("transactions")
        .index("by_user_and_seq", (q) => q.eq("userId", userId), "desc")
        .take(SCAN_WINDOW);
    const entries = rows
        // A scheduled entry has not happened yet; upcomingCharges lists it.
        .filter((row) => row.deletedAt === null && row.date <= now)
        .sort((a, b) => b.date - a.date)
        .slice(0, Math.min(Math.max(limit, 1), MAX_ENTRIES));
    const categoryIds = [...new Set(entries.flatMap((row) => (row.categoryId ? [row.categoryId] : [])))];
    const categories = yield* Effect.all(
        categoryIds.map((localId) =>
            reader
                .table("categories")
                .get("by_user_and_localId", userId, localId)
                .pipe(Effect.catchTags({ GetByIndexFailure: () => Effect.succeed(null) }))
        ),
        { concurrency: "unbounded" }
    );
    const accountIds = [...new Set(entries.flatMap((row) => (row.accountId ? [row.accountId] : [])))];
    const accounts = yield* Effect.all(
        accountIds.map((localId) =>
            reader
                .table("accounts")
                .get("by_user_and_localId", userId, localId)
                .pipe(Effect.catchTags({ GetByIndexFailure: () => Effect.succeed(null) }))
        ),
        { concurrency: "unbounded" }
    );
    const categoryById = new Map(categories.flatMap((row) => (row ? [[row.localId, row]] : [])));
    const accountNames = new Map(accounts.flatMap((row) => (row ? [[row.localId, row.name]] : [])));
    return entries.map((row) => {
        const category = row.categoryId ? categoryById.get(row.categoryId) : undefined;
        const offsetMs = utcOffsetOf(row.day, zone?.(row.day));
        return {
            account: row.accountId ? (accountNames.get(row.accountId) ?? null) : null,
            amount: row.amount,
            category: category?.name ?? null,
            currency: row.currency,
            date: localDate(row.day, offsetMs),
            emoji: row.emoji ?? category?.emoji ?? null,
            imageKey: row.imageKey,
            kind: entryKind(row.income),
            note: row.note,
            time: new Date(row.date + (zone?.(row.date) ?? offsetMs)).toISOString().slice(11, 16),
        };
    });
}, Effect.orDie);

export const spendingSummaryOf = Effect.fn("McpLedger.spendingSummary")(function* spendingSummary(
    userId: string,
    { monthsAgo = 0 }: { readonly monthsAgo?: number | undefined } = {}
) {
    const reader = yield* DatabaseReader;
    const currency = (yield* setting(userId, "currency")) ?? "USD";
    const firstDayOfMonth = Number(yield* setting(userId, "firstDayOfMonth")) || 1;
    const now = yield* Clock.currentTimeMillis;
    const offsetAt = yield* zoneOffset(userId, now);
    const offsetMs = offsetAt(now);
    const window = monthWindow(now, offsetMs, firstDayOfMonth, Math.max(0, Math.trunc(monthsAgo)));
    // Whole UTC days around the window: a valuation cell is one UTC day, and a cell cut at the edge values
    // differently.
    const stored = yield* reader
        .table("transactions")
        .index("by_user_and_deletedAt_and_date", (q) =>
            q
                .eq("userId", userId)
                .eq("deletedAt", null)
                .gte("date", utcDayStart(window.start))
                .lt("date", utcDayStart(window.end - 1) + DAY_MS)
        )
        .collect();
    const rows = stored.filter((row) => row.date <= now).sort(bySeq);
    const values = valueDatedRowsIn(
        rows.map((row) => ({ ...row, date: new Date(row.date) })),
        currency,
        yield* ratesIn(currency)
    );
    const categoryRows = yield* reader
        .table("categories")
        .index("by_user_and_seq", (q) => q.eq("userId", userId))
        .collect();
    const categories = new Map(categoryRows.map((row) => [row.localId, row]));
    const decimals = decimalsFor(currency);
    let spent = 0;
    let income = 0;
    const byCategory = new Map<string, number>();
    const byDay = new Map<string, number>();
    for (const [index, row] of rows.entries()) {
        if (row.date < window.start || row.date >= window.end) {
            continue;
        }
        const value = values[index] ?? 0;
        if (row.income) {
            income += value;
            continue;
        }
        spent += value;
        // The saved day, as the log reads it, so a bar and its entry never land on different days.
        const day = localDate(row.day, utcOffsetOf(row.day, offsetAt(row.day)));
        byDay.set(day, (byDay.get(day) ?? 0) + value);
        const category = row.categoryId ? categories.get(row.categoryId) : undefined;
        const top = category?.parentId ? categories.get(category.parentId) : category;
        const name = top?.name ?? "Uncategorized";
        byCategory.set(name, (byCategory.get(name) ?? 0) + value);
    }
    return {
        currency,
        from: localDate(window.start, offsetMs),
        income: roundMoney(income, decimals),
        spent: roundMoney(spent, decimals),
        spentByCategory: [...byCategory]
            .map(([category, amount]) => ({ amount: roundMoney(amount, decimals), category }))
            .sort((a, b) => b.amount - a.amount),
        spentByDay: [...byDay]
            .map(([date, amount]) => ({ amount: roundMoney(amount, decimals), date }))
            .sort((a, b) => a.date.localeCompare(b.date)),
        to: localDate(window.end - 1, offsetMs),
        today: localDate(now, offsetMs),
    };
}, Effect.orDie);

export const accountBalancesOf = Effect.fn("McpLedger.accountBalances")(function* accountBalances(userId: string) {
    const reader = yield* DatabaseReader;
    const now = yield* Clock.currentTimeMillis;
    const currency = (yield* setting(userId, "currency")) ?? "USD";
    const [accountRows, transactionRows, transferRows, planRows, outsideRows, moves, offsetAt] = yield* Effect.all(
        [
            reader
                .table("accounts")
                .index("by_user_and_seq", (q) => q.eq("userId", userId))
                .collect(),
            reader
                .table("transactions")
                .index("by_user_and_deletedAt_and_date", (q) =>
                    q.eq("userId", userId).eq("deletedAt", null).lte("date", now)
                )
                .collect(),
            reader
                .table("transfers")
                .index("by_user_and_deletedAt_and_date", (q) =>
                    q.eq("userId", userId).eq("deletedAt", null).lte("date", now)
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
            zoneOffset(userId, now),
        ],
        { concurrency: "unbounded" }
    );
    const accounts = accountRows.filter((row) => row.deletedAt === null).sort((a, b) => a.sortOrder - b.sortOrder);
    const rates = yield* ratesIn(currency, ...accounts.map((row) => row.currency));
    const ledger = new Map<string, LegEntry[]>(accounts.map((account) => [account.localId, []]));
    for (const row of transactionRows.toSorted(bySeq)) {
        if (row.accountId) {
            ledger.get(row.accountId)?.push({ ...row, date: new Date(row.date), leg: "flow" });
        }
    }
    for (const row of transferRows.toSorted(bySeq)) {
        const date = new Date(row.date);
        ledger.get(row.fromAccountId)?.push({
            amount: row.fromAmount,
            amountUsd: row.fromAmountUsd,
            currency: row.fromCurrency,
            date,
            income: false,
            leg: "outbound",
        });
        ledger.get(row.toAccountId)?.push({
            amount: row.toAmount,
            amountUsd: row.toAmountUsd,
            currency: row.toCurrency,
            date,
            income: true,
            leg: "inbound",
        });
    }
    // A payment made outside Outlayr arrives on its order's account from nowhere.
    const planAccount = new Map(
        planRows.filter((row) => row.deletedAt === null).map((row) => [row.localId, row.accountId])
    );
    const currencyOf = new Map(accounts.map((account) => [account.localId, account.currency]));
    for (const row of outsideRows.toSorted(bySeq)) {
        const accountId = planAccount.get(row.planId);
        const accountCurrency = accountId === undefined ? undefined : currencyOf.get(accountId);
        if (row.deletedAt !== null || row.date > now || accountId === undefined || accountCurrency === undefined) {
            continue;
        }
        ledger.get(accountId)?.push({
            amount: row.amount,
            amountUsd: row.amountUsd,
            currency: accountCurrency,
            date: new Date(row.date),
            income: true,
            leg: "inbound",
        });
    }
    for (const row of moves.toSorted(bySeq)) {
        const accountCurrency = currencyOf.get(row.accountId);
        if (row.deletedAt !== null || row.date > now || accountCurrency === undefined) {
            continue;
        }
        ledger.get(row.accountId)?.push({
            amount: row.amount,
            amountUsd: row.amountUsd,
            currency: accountCurrency,
            date: new Date(row.date),
            income: true,
            leg: "inbound",
        });
    }
    const overview = accountsOverview(
        accounts.map((row) => ({ ...row, id: row.localId })),
        accounts.flatMap((account) =>
            groupCells(ledger.get(account.localId) ?? [], (entry) => entry.leg).map((cell) => ({
                ...cell,
                accountId: account.localId,
            }))
        ),
        currency,
        rates,
        new Date(now)
    );
    const decimals = decimalsFor(currency);
    if (overview === null) {
        return { accounts: [], currency, net: 0, owed: 0, owned: 0 };
    }
    return {
        accounts: accounts.flatMap((account, index) => {
            const row = overview.rows[index];
            if (row === undefined) {
                return [];
            }
            const own = accountBalance(
                account,
                groupCells(
                    ledger.get(account.localId) ?? [],
                    (entry) => `${entry.leg}|${localDate(entry.date.getTime(), offsetAt(entry.date.getTime()))}`
                ),
                rates
            );
            return [
                {
                    balance: roundMoney(own.total, decimalsFor(account.currency)),
                    balanceInMainCurrency: roundMoney(row.balance, decimals),
                    currency: account.currency,
                    emoji: account.emoji,
                    exact: own.exact && row.exact,
                    imageKey: account.imageKey,
                    kind: row.kind,
                    name: account.name,
                },
            ];
        }),
        currency,
        net: roundMoney(overview.total, decimals),
        owed: roundMoney(overview.owe, decimals),
        owned: roundMoney(overview.own, decimals),
    };
}, Effect.orDie);

export const budgetStatusOf = Effect.fn("McpLedger.budgetStatus")(function* budgetStatus(userId: string) {
    const reader = yield* DatabaseReader;
    const now = yield* Clock.currentTimeMillis;
    const currency = (yield* setting(userId, "currency")) ?? "USD";
    const [mainRows, budgetRows, transactionRows, categories, rates, offsetAt] = yield* Effect.all(
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
                    q.eq("userId", userId).eq("deletedAt", null).lte("date", now)
                )
                .collect(),
            liveCategories(userId),
            ratesIn(currency),
            zoneOffset(userId, now),
        ],
        { concurrency: "unbounded" }
    );
    const expenses = transactionRows.filter((row) => !row.income).sort(bySeq);
    const values = valueDatedRowsIn(
        expenses.map((row) => ({ ...row, date: new Date(row.date) })),
        currency,
        rates
    );
    const contributions: ExpenseContribution[] = expenses.map((row, index) => ({
        amount: values[index] ?? 0,
        categoryId: row.categoryId,
        date: wall(row.date, offsetAt(row.date)),
        parentId: row.categoryId ? (categories.get(row.categoryId)?.parentId ?? null) : null,
    }));
    const clock = { currency, now: wall(now, offsetAt(now)), offsetAt, rates };
    const main = mainRows.find((row) => row.deletedAt === null);
    return {
        categories: budgetRows
            .filter((row) => row.deletedAt === null)
            .sort((a, b) => (a.dateCreated ?? 0) - (b.dateCreated ?? 0))
            .map((row) => {
                const { categoryId } = row;
                return {
                    ...budgetStanding(
                        row,
                        row.rollover && categoryId !== null,
                        (start, last) =>
                            categoryId === null ? 0 : spentForCategory(contributions, categoryId, start, last),
                        clock
                    ),
                    category: categoryId ? (categories.get(categoryId)?.name ?? null) : null,
                    name: customName(row.name),
                    subcategories: [...categories.values()].flatMap((child) =>
                        categoryId !== null && child.parentId === categoryId && child.name ? [child.name] : []
                    ),
                };
            }),
        currency,
        overall: main
            ? {
                  ...budgetStanding(
                      main,
                      main.rollover,
                      (start, last) => spentForMain(contributions, start, last),
                      clock
                  ),
                  name: customName(main.name),
              }
            : null,
    };
}, Effect.orDie);

export const upcomingChargesOf = Effect.fn("McpLedger.upcomingCharges")(function* upcomingCharges(userId: string) {
    const reader = yield* DatabaseReader;
    const now = yield* Clock.currentTimeMillis;
    const currency = (yield* setting(userId, "currency")) ?? "USD";
    const [recurring, future, categories, rates, offsetAt] = yield* Effect.all(
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
                    q.eq("userId", userId).eq("deletedAt", null).gt("date", now)
                )
                .collect(),
            liveCategories(userId),
            ratesIn(currency),
            zoneOffset(userId, now),
        ],
        { concurrency: "unbounded" }
    );
    const today = wall(now, offsetAt(now));
    // A future recurring entry is in both reads.
    const scheduled = [...new Map([...recurring, ...future].map((row) => [row._id, row])).values()].sort(bySeq);
    const perMonth = monthlySubscriptionCost(
        scheduled.map((row) => ({
            ...row,
            date: new Date(row.date),
            recurringEndDate:
                row.recurringEndDate === null ? null : wall(row.recurringEndDate, offsetAt(row.recurringEndDate)),
        })),
        currency,
        rates,
        today
    );
    const cadences = new Map<number, string>(Object.entries(RECURRING_TYPE).map(([name, code]) => [code, name]));
    return {
        charges: scheduled
            .map((row) => ({
                landsOn: landingDate(
                    {
                        date: wall(row.date, offsetAt(row.date)),
                        recurringAnchorDay: row.recurringAnchorDay ?? null,
                        recurringCoefficient: row.recurringCoefficient,
                        recurringType: row.recurringType,
                    },
                    today
                ),
                row,
            }))
            .sort((a, b) => a.landsOn.getTime() - b.landsOn.getTime())
            .map(({ landsOn, row }) => ({
                amount: row.amount,
                category: row.categoryId ? (categories.get(row.categoryId)?.name ?? null) : null,
                currency: row.currency,
                endsOn:
                    row.recurringEndDate === null
                        ? null
                        : localDate(row.recurringEndDate, offsetAt(row.recurringEndDate)),
                kind: entryKind(row.income),
                nextCharge: wallDay(landsOn),
                note: row.note,
                repeats:
                    row.recurringType === RECURRING_TYPE.none
                        ? null
                        : { cadence: cadences.get(row.recurringType) ?? null, every: row.recurringCoefficient },
            })),
        currency,
        monthlyCost: perMonth
            .filter((bucket) => bucket.transactionCount > 0)
            .map((bucket) => ({
                amount: roundMoney(-bucket.amount, decimalsFor(bucket.currencyCode)),
                currency: bucket.currencyCode,
                schedules: bucket.transactionCount,
            })),
    };
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
