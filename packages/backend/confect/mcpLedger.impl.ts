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
    groupCells,
    localDate,
    MAX_ENTRIES,
    monthWindow,
    SCAN_WINDOW,
    utcDayStart,
    utcOffsetOf,
    wall,
    wallDay,
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

const zoneOffset = Effect.fn("McpLedger.zoneOffset")(function* zoneOffset(userId: string, now: number) {
    const reader = yield* DatabaseReader;
    const latest = yield* reader
        .table("transactions")
        .index(
            "by_user_and_deletedAt_and_date",
            (q) => q.eq("userId", userId).eq("deletedAt", null).lte("date", now),
            "desc"
        )
        .first();
    return Option.match(latest, { onNone: () => 0, onSome: (row) => utcOffsetOf(row.day) });
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

const recentTransactions = FunctionImpl.make(
    databaseSchema,
    spec,
    "recentTransactions",
    Effect.fn("McpLedger.recentTransactions")(function* recentTransactions({ user, limit = 20 }) {
        const reader = yield* DatabaseReader;
        const { userId } = user;
        const rows = yield* reader
            .table("transactions")
            .index("by_user_and_seq", (q) => q.eq("userId", userId), "desc")
            .take(SCAN_WINDOW);
        const entries = rows
            .filter((row) => row.deletedAt === null)
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
        const categoryNames = new Map(categories.flatMap((row) => (row?.name ? [[row.localId, row.name]] : [])));
        return entries.map((row) => ({
            amount: row.amount,
            category: row.categoryId ? (categoryNames.get(row.categoryId) ?? null) : null,
            currency: row.currency,
            date: localDate(row.date, utcOffsetOf(row.day)),
            kind: entryKind(row.income),
            note: row.note,
        }));
    }, Effect.orDie)
);

const spendingSummary = FunctionImpl.make(
    databaseSchema,
    spec,
    "spendingSummary",
    Effect.fn("McpLedger.spendingSummary")(function* spendingSummary({ user, monthsAgo = 0 }) {
        const reader = yield* DatabaseReader;
        const { userId } = user;
        const currency = (yield* setting(userId, "currency")) ?? "USD";
        const firstDayOfMonth = Number(yield* setting(userId, "firstDayOfMonth")) || 1;
        const now = yield* Clock.currentTimeMillis;
        const offsetMs = yield* zoneOffset(userId, now);
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
            to: localDate(window.end - 1, offsetMs),
        };
    }, Effect.orDie)
);

const accountBalances = FunctionImpl.make(
    databaseSchema,
    spec,
    "accountBalances",
    Effect.fn("McpLedger.accountBalances")(function* accountBalances({ user }) {
        const reader = yield* DatabaseReader;
        const { userId } = user;
        const now = yield* Clock.currentTimeMillis;
        const currency = (yield* setting(userId, "currency")) ?? "USD";
        const [accountRows, transactionRows, transferRows, planRows, outsideRows, moves, offsetMs] = yield* Effect.all(
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
            accounts: accounts.map((account, index) => {
                const own = accountBalance(
                    account,
                    groupCells(
                        ledger.get(account.localId) ?? [],
                        (entry) => `${entry.leg}|${localDate(entry.date.getTime(), offsetMs)}`
                    ),
                    rates
                );
                const row = overview.rows[index];
                return {
                    balance: roundMoney(own.total, decimalsFor(account.currency)),
                    balanceInMainCurrency: roundMoney(row.balance, decimals),
                    currency: account.currency,
                    exact: own.exact && row.exact,
                    kind: row.kind,
                    name: account.name,
                };
            }),
            currency,
            net: roundMoney(overview.total, decimals),
            owed: roundMoney(overview.owe, decimals),
            owned: roundMoney(overview.own, decimals),
        };
    }, Effect.orDie)
);

const budgetStatus = FunctionImpl.make(
    databaseSchema,
    spec,
    "budgetStatus",
    Effect.fn("McpLedger.budgetStatus")(function* budgetStatus({ user }) {
        const reader = yield* DatabaseReader;
        const { userId } = user;
        const now = yield* Clock.currentTimeMillis;
        const currency = (yield* setting(userId, "currency")) ?? "USD";
        const [mainRows, budgetRows, transactionRows, categories, rates, offsetMs] = yield* Effect.all(
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
            date: wall(row.date, offsetMs),
            parentId: row.categoryId ? (categories.get(row.categoryId)?.parentId ?? null) : null,
        }));
        const clock = { currency, now: wall(now, offsetMs), offsetMs, rates };
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
    }, Effect.orDie)
);

const upcomingCharges = FunctionImpl.make(
    databaseSchema,
    spec,
    "upcomingCharges",
    Effect.fn("McpLedger.upcomingCharges")(function* upcomingCharges({ user }) {
        const reader = yield* DatabaseReader;
        const { userId } = user;
        const now = yield* Clock.currentTimeMillis;
        const currency = (yield* setting(userId, "currency")) ?? "USD";
        const [recurring, future, categories, rates, offsetMs] = yield* Effect.all(
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
        const today = wall(now, offsetMs);
        // A future recurring entry is in both reads.
        const scheduled = [...new Map([...recurring, ...future].map((row) => [row._id, row])).values()].sort(bySeq);
        const perMonth = monthlySubscriptionCost(
            scheduled.map((row) => ({
                ...row,
                date: new Date(row.date),
                recurringEndDate: row.recurringEndDate === null ? null : wall(row.recurringEndDate, offsetMs),
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
                            date: wall(row.date, offsetMs),
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
                    endsOn: row.recurringEndDate === null ? null : localDate(row.recurringEndDate, offsetMs),
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
    }, Effect.orDie)
);

export default GroupImpl.make(databaseSchema, spec).pipe(
    Layer.provide(recentTransactions),
    Layer.provide(spendingSummary),
    Layer.provide(accountBalances),
    Layer.provide(budgetStatus),
    Layer.provide(upcomingCharges),
    GroupImpl.finalize
);
