import { accountBalance } from "@outlayr/money/account-balance";
import { accountsOverview } from "@outlayr/money/account-overview";
import { effectiveLimit, rolloverCarry } from "@outlayr/money/budget-rollover";
import { lastMsBefore, spentForCategory, spentForMain } from "@outlayr/money/budget-spent";
import type { ExpenseContribution } from "@outlayr/money/budget-spent";
import { advanceBudgetWindow, BUDGET_TYPE, windowEndMs } from "@outlayr/money/budget-window";
import { decimalsFor } from "@outlayr/money/currency";
import { toCells } from "@outlayr/money/currency-totals";
import type { CurrencyCell, CurrencyEntry } from "@outlayr/money/currency-totals";
import { landingDate, RECURRING_TYPE } from "@outlayr/money/recurrence";
import { roundMoney } from "@outlayr/money/round";
import { monthlySubscriptionCost } from "@outlayr/money/subscription-cost";
import { buildRateTable, limitIn, valueDatedRowsIn } from "@outlayr/money/valuation";
import type { RateTable } from "@outlayr/money/valuation";
import { defineMcpQuery, mcpCallerValidator } from "convex-mcp-gateway";
import type { McpToolRegistration } from "convex-mcp-gateway";
import { v } from "convex/values";

import { internal } from "./_generated/api";
import { internalQuery } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";

const MAX_ENTRIES = 50;
const SCAN_WINDOW = 500;

export const recentTransactions = internalQuery({
    args: { caller: mcpCallerValidator, limit: v.optional(v.number()) },
    handler: async (ctx, { caller, limit = 20 }) => {
        const userId = caller.subject;
        const rows = await ctx.db
            .query("transactions")
            .withIndex("by_user_and_seq", (q) => q.eq("userId", userId))
            .order("desc")
            .take(SCAN_WINDOW);
        const entries = rows
            .filter((row) => row.deletedAt === null)
            .sort((a, b) => b.date - a.date)
            .slice(0, Math.min(Math.max(limit, 1), MAX_ENTRIES));
        const categoryIds = [...new Set(entries.flatMap((row) => (row.categoryId ? [row.categoryId] : [])))];
        const categories = await Promise.all(
            categoryIds.map((localId) =>
                ctx.db
                    .query("categories")
                    .withIndex("by_user_and_localId", (q) => q.eq("userId", userId).eq("localId", localId))
                    .unique()
            )
        );
        const categoryNames = new Map(categories.flatMap((row) => (row?.name ? [[row.localId, row.name]] : [])));
        return entries.map((row) => ({
            amount: row.amount,
            category: row.categoryId ? (categoryNames.get(row.categoryId) ?? null) : null,
            currency: row.currency,
            date: new Date(row.date).toISOString().slice(0, 10),
            kind: row.income ? "income" : "expense",
            note: row.note,
        }));
    },
});

const DAY_MS = 86_400_000;
const LATEST_PAYDAY = 28;

export function utcOffsetOf(localMidnight: number): number {
    const sinceUtcMidnight = ((localMidnight % DAY_MS) + DAY_MS) % DAY_MS;
    return sinceUtcMidnight <= DAY_MS / 2 ? 0 - sinceUtcMidnight : DAY_MS - sinceUtcMidnight;
}

export function monthWindow(nowMs: number, offsetMs: number, firstDayOfMonth: number, monthsAgo: number) {
    const local = new Date(nowMs + offsetMs);
    const anchor = Math.min(Math.max(1, firstDayOfMonth), LATEST_PAYDAY);
    const month = local.getUTCMonth() - monthsAgo - (local.getUTCDate() < anchor ? 1 : 0);
    return {
        end: Date.UTC(local.getUTCFullYear(), month + 1, anchor) - offsetMs,
        start: Date.UTC(local.getUTCFullYear(), month, anchor) - offsetMs,
    };
}

// ponytail: one fixed offset, so a window across a DST change is cut an hour off; sync the IANA zone to fix.
const wall = (instant: number, offsetMs: number) => new Date(instant + offsetMs);
const wallDay = (date: Date) => date.toISOString().slice(0, 10);
const localDate = (instant: number, offsetMs: number) => wallDay(wall(instant, offsetMs));

async function zoneOffset(ctx: QueryCtx, userId: string, now: number): Promise<number> {
    const latest = await ctx.db
        .query("transactions")
        .withIndex("by_user_and_deletedAt_and_date", (q) =>
            q.eq("userId", userId).eq("deletedAt", null).lte("date", now)
        )
        .order("desc")
        .first();
    return latest ? utcOffsetOf(latest.day) : 0;
}

// Valuation rounds per cell in input order, so rows read by date go back into the seq order a full scan gave.
const bySeq = (a: { seq: number }, b: { seq: number }) => a.seq - b.seq;
const utcDayStart = (instant: number) => Math.floor(instant / DAY_MS) * DAY_MS;

async function ratesIn(ctx: QueryCtx, ...codes: string[]): Promise<RateTable> {
    const quotes = [...new Set(codes)].filter((code) => code !== "USD");
    const rows = await Promise.all(
        quotes.map((code) =>
            ctx.db
                .query("exchangeRates")
                .withIndex("by_quote_and_rateType_and_date", (q) => q.eq("quote", code).eq("rateType", "official"))
                .collect()
        )
    );
    return buildRateTable(rows.flat());
}

async function liveCategories(ctx: QueryCtx, userId: string) {
    const rows = await ctx.db
        .query("categories")
        .withIndex("by_user_and_seq", (q) => q.eq("userId", userId))
        .collect();
    return new Map(rows.filter((row) => row.deletedAt === null).map((row) => [row.localId, row]));
}

export async function setting(ctx: QueryCtx, userId: string, key: string): Promise<string | null> {
    const row = await ctx.db
        .query("appMeta")
        .withIndex("by_user_and_key", (q) => q.eq("userId", userId).eq("key", key))
        .unique();
    return row?.value ?? null;
}

export const spendingSummary = internalQuery({
    args: { caller: mcpCallerValidator, monthsAgo: v.optional(v.number()) },
    handler: async (ctx, { caller, monthsAgo = 0 }) => {
        const userId = caller.subject;
        const currency = (await setting(ctx, userId, "currency")) ?? "USD";
        const firstDayOfMonth = Number(await setting(ctx, userId, "firstDayOfMonth")) || 1;
        const now = Date.now();
        const offsetMs = await zoneOffset(ctx, userId, now);
        const window = monthWindow(now, offsetMs, firstDayOfMonth, Math.max(0, Math.trunc(monthsAgo)));
        // Whole UTC days around the window: a valuation cell is one UTC day, and a cell cut at the edge values
        // differently.
        const stored = await ctx.db
            .query("transactions")
            .withIndex("by_user_and_deletedAt_and_date", (q) =>
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
            await ratesIn(ctx, currency)
        );
        const categoryRows = await ctx.db
            .query("categories")
            .withIndex("by_user_and_seq", (q) => q.eq("userId", userId))
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
    },
});

type LegEntry = CurrencyEntry & { date: Date; leg: "flow" | "inbound" | "outbound" };

function groupCells(entries: readonly LegEntry[], key: (entry: LegEntry) => string): CurrencyCell[] {
    const groups = new Map<string, LegEntry[]>();
    for (const entry of entries) {
        const name = key(entry);
        const group = groups.get(name);
        if (group) {
            group.push(entry);
        } else {
            groups.set(name, [entry]);
        }
    }
    return [...groups.values()].flatMap((group) => toCells(group));
}

export const accountBalances = internalQuery({
    args: { caller: mcpCallerValidator },
    handler: async (ctx, { caller }) => {
        const userId = caller.subject;
        const now = Date.now();
        const currency = (await setting(ctx, userId, "currency")) ?? "USD";
        const [accountRows, transactionRows, transferRows, planRows, outsideRows, moves, offsetMs] = await Promise.all([
            ctx.db
                .query("accounts")
                .withIndex("by_user_and_seq", (q) => q.eq("userId", userId))
                .collect(),
            ctx.db
                .query("transactions")
                .withIndex("by_user_and_deletedAt_and_date", (q) =>
                    q.eq("userId", userId).eq("deletedAt", null).lte("date", now)
                )
                .collect(),
            ctx.db
                .query("transfers")
                .withIndex("by_user_and_deletedAt_and_date", (q) =>
                    q.eq("userId", userId).eq("deletedAt", null).lte("date", now)
                )
                .collect(),
            ctx.db
                .query("installmentPlans")
                .withIndex("by_user_and_seq", (q) => q.eq("userId", userId))
                .collect(),
            ctx.db
                .query("outsidePayments")
                .withIndex("by_user_and_seq", (q) => q.eq("userId", userId))
                .collect(),
            ctx.db
                .query("outsideMoves")
                .withIndex("by_user_and_seq", (q) => q.eq("userId", userId))
                .collect(),
            zoneOffset(ctx, userId, now),
        ]);
        const accounts = accountRows.filter((row) => row.deletedAt === null).sort((a, b) => a.sortOrder - b.sortOrder);
        const rates = await ratesIn(ctx, currency, ...accounts.map((row) => row.currency));
        const ledger = new Map<string, LegEntry[]>(accounts.map((account) => [account.localId, []]));
        for (const row of transactionRows.sort(bySeq)) {
            if (row.accountId) {
                ledger.get(row.accountId)?.push({ ...row, date: new Date(row.date), leg: "flow" });
            }
        }
        for (const row of transferRows.sort(bySeq)) {
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
        for (const row of outsideRows.sort(bySeq)) {
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
        for (const row of moves.sort(bySeq)) {
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
    },
});

const BUDGET_PERIODS = new Map<number, string>(Object.entries(BUDGET_TYPE).map(([name, code]) => [code, name]));

interface StoredBudget {
    amount: number;
    amountUsd: number | null;
    currency: string | null;
    dateCreated: number | null;
    rollover: boolean;
    startDate: number | null;
    type: number;
}

interface BudgetClock {
    currency: string;
    now: Date;
    offsetMs: number;
    rates: RateTable;
}

function budgetStanding(
    budget: StoredBudget,
    carries: boolean,
    spentThrough: (start: Date, last: Date) => number,
    clock: BudgetClock
) {
    const window = advanceBudgetWindow(
        budget.startDate === null ? clock.now : wall(budget.startDate, clock.offsetMs),
        budget.type,
        clock.now
    );
    const spent = spentThrough(window.start, new Date(windowEndMs(window, clock.now.getTime())));
    const limit = limitIn(budget, new Date(window.start.getTime() - clock.offsetMs), clock.currency, clock.rates);
    const carry = carries
        ? rolloverCarry({
              anchor: budget.dateCreated === null ? window.start : wall(budget.dateCreated, clock.offsetMs),
              current: window,
              limit,
              spentIn: (start, end) => spentThrough(start, lastMsBefore(end)),
              type: budget.type,
          }).credit
        : 0;
    const amount = effectiveLimit(limit, carry);
    const decimals = decimalsFor(clock.currency);
    return {
        carryOver: roundMoney(carry, decimals),
        effectiveLimit: roundMoney(amount, decimals),
        from: wallDay(window.start),
        limit: roundMoney(limit, decimals),
        overBudget: spent > amount,
        period: BUDGET_PERIODS.get(budget.type) ?? null,
        remaining: roundMoney(amount - spent, decimals),
        rollover: budget.rollover,
        spent: roundMoney(spent, decimals),
        to: wallDay(new Date(window.end.getTime() - 1)),
    };
}

const customName = (name: string | null) => (name?.trim() ? name.trim() : null);

export const budgetStatus = internalQuery({
    args: { caller: mcpCallerValidator },
    handler: async (ctx, { caller }) => {
        const userId = caller.subject;
        const now = Date.now();
        const currency = (await setting(ctx, userId, "currency")) ?? "USD";
        const [mainRows, budgetRows, transactionRows, categories, rates, offsetMs] = await Promise.all([
            ctx.db
                .query("mainBudget")
                .withIndex("by_user_and_seq", (q) => q.eq("userId", userId))
                .collect(),
            ctx.db
                .query("budgets")
                .withIndex("by_user_and_seq", (q) => q.eq("userId", userId))
                .collect(),
            ctx.db
                .query("transactions")
                .withIndex("by_user_and_deletedAt_and_date", (q) =>
                    q.eq("userId", userId).eq("deletedAt", null).lte("date", now)
                )
                .collect(),
            liveCategories(ctx, userId),
            ratesIn(ctx, currency),
            zoneOffset(ctx, userId, now),
        ]);
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
    },
});

export const upcomingCharges = internalQuery({
    args: { caller: mcpCallerValidator },
    handler: async (ctx, { caller }) => {
        const userId = caller.subject;
        const now = Date.now();
        const currency = (await setting(ctx, userId, "currency")) ?? "USD";
        const [recurring, future, categories, rates, offsetMs] = await Promise.all([
            ctx.db
                .query("transactions")
                .withIndex("by_user_and_deletedAt_and_recurringType", (q) =>
                    q.eq("userId", userId).eq("deletedAt", null).gt("recurringType", RECURRING_TYPE.none)
                )
                .collect(),
            ctx.db
                .query("transactions")
                .withIndex("by_user_and_deletedAt_and_date", (q) =>
                    q.eq("userId", userId).eq("deletedAt", null).gt("date", now)
                )
                .collect(),
            liveCategories(ctx, userId),
            ratesIn(ctx, currency),
            zoneOffset(ctx, userId, now),
        ]);
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
                    kind: row.income ? "income" : "expense",
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
    },
});

export const ledgerTools: McpToolRegistration[] = [
    defineMcpQuery({
        annotations: { readOnlyHint: true },
        args: { caller: mcpCallerValidator, limit: v.optional(v.number()) },
        description:
            "The signed-in user's most recent Outlayr entries, newest first: date, amount, currency, category, note, and whether each is an expense or income. Reads what the user's devices last synced. `limit` defaults to 20, at most 50.",
        fn: internal.mcpLedger.recentTransactions,
        identityArg: "caller",
        name: "recent_transactions",
    }),
    defineMcpQuery({
        annotations: { readOnlyHint: true },
        args: { caller: mcpCallerValidator, monthsAgo: v.optional(v.number()) },
        description:
            "What the signed-in user spent and earned in one budgeting month, in their main currency, with spending by category: the same figures as Outlayr's Insights screen. A month starts on the user's payday setting. `monthsAgo` is 0 for the current month (default), 1 for the previous one, and so on. Reads what the user's devices last synced.",
        fn: internal.mcpLedger.spendingSummary,
        identityArg: "caller",
        name: "spending_summary",
    }),
    defineMcpQuery({
        annotations: { readOnlyHint: true },
        args: { caller: mcpCallerValidator },
        description:
            "Every account's balance today, as on Outlayr's Accounts screen: in the account's own currency and in the user's main currency, with its kind and what the user owns, owes and is worth in total. A kind is `asset`, `liability`, or `person`: someone the user lent to or borrowed from, positive when they owe the user and negative when the user owes them, so it counts as owned or owed by its sign. People are listed here though the Accounts screen leaves them out. Entries and transfers dated later than now are not counted. `exact` is false when a rate was missing and part of a figure stayed at face value.",
        fn: internal.mcpLedger.accountBalances,
        identityArg: "caller",
        name: "account_balances",
    }),
    defineMcpQuery({
        annotations: { readOnlyHint: true },
        args: { caller: mcpCallerValidator },
        description:
            "Where the user's budgets stand in the current window, as on Outlayr's Budgets screen, in their main currency: the overall budget and each category budget with its period, window dates (`from` and `to`, inclusive), limit, carry-over from earlier windows when rollover is on, the effective limit, spent, remaining and whether it is over. A category budget counts its subcategories, which are listed.",
        fn: internal.mcpLedger.budgetStatus,
        identityArg: "caller",
        name: "budget_status",
    }),
    defineMcpQuery({
        annotations: { readOnlyHint: true },
        args: { caller: mcpCallerValidator },
        description:
            "The user's recurring and future-dated entries, soonest first, as on Outlayr's Upcoming list: the date each next lands, its amount and currency, category, note, cadence and end date. `monthlyCost` is what the recurring expenses cost per month, per currency, converted into the main currency where a rate allows.",
        fn: internal.mcpLedger.upcomingCharges,
        identityArg: "caller",
        name: "upcoming_charges",
    }),
];
