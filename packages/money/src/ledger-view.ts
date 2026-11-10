import * as Schema from "effect/Schema";

import { accentOf } from "./accent";
import type { AccentColors } from "./accent";
import { accountBalance } from "./account-balance";
import { accountsOverview } from "./account-overview";
import { spentForCategory, spentForMain } from "./budget-spent";
import type { ExpenseContribution } from "./budget-spent";
import { budgetStanding } from "./budget-standing";
import type { StoredBudget } from "./budget-standing";
import { decimalsFor } from "./currency";
import { toCells } from "./currency-totals";
import type { CurrencyCell, CurrencyEntry } from "./currency-totals";
import { utcDateString } from "./dates";
import { accountLook, buildLog, entryLook, placed } from "./ledger-log";
import type { AccountSource, CategorySource, EntrySource, TransferSource } from "./ledger-log";
import {
    DAY_MS,
    fixedOffset,
    fromWall,
    isoDay,
    monthWindow,
    utcDayStart,
    utcOffsetOf,
    wall,
    wallDay,
    zoneOffsets,
} from "./ledger-zone";
import type { OffsetAt } from "./ledger-zone";
import { landingDate, RECURRING_TYPE } from "./recurrence";
import { roundMoney } from "./round";
import { monthlySubscriptionCost } from "./subscription-cost";
import { buildRateTable, isExact, valueDatedRowsIn } from "./valuation";
import type { RateTable } from "./valuation";

interface Transaction extends EntrySource {
    deletedAt: number | null;
    recurringAnchorDay?: number | null;
    recurringCoefficient: number;
    recurringEndDate: number | null;
    seq: number;
}

interface Transfer extends TransferSource {
    deletedAt: number | null;
    fromAmountUsd: number | null;
    seq: number;
    toAmountUsd: number | null;
}

interface Account extends AccountSource {
    archivedAt?: number | null;
    currency: string;
    deletedAt: number | null;
    initialBalance: number;
    sortOrder: number;
}

interface Category extends CategorySource {
    deletedAt: number | null;
    localId: string;
    parentId: string | null;
}

interface Budget extends StoredBudget {
    categoryId: string | null;
    deletedAt: number | null;
    name: string | null;
}

interface MainBudget extends StoredBudget {
    deletedAt: number | null;
    name: string | null;
}

interface InstallmentPlan {
    accountId: string;
    deletedAt: number | null;
    localId: string;
}

interface OutsidePayment {
    amount: number;
    amountUsd: number | null;
    date: number;
    deletedAt: number | null;
    planId: string;
    seq: number;
}

interface OutsideMove {
    accountId: string;
    amount: number;
    amountUsd: number | null;
    date: number;
    deletedAt: number | null;
    seq: number;
}

interface Setting {
    key: string;
    value: string | null;
}

type Rates = Parameters<typeof buildRateTable>[0];

export const EntryKind = Schema.Literals(["expense", "income"]);

const entryKind = (income: boolean): typeof EntryKind.Type => (income ? "income" : "expense");

const MAX_ENTRIES = 50;

// Valuation rounds per cell in input order, so rows read by date go back into the seq order a full scan gave.
export const bySeq = (a: { seq: number }, b: { seq: number }) => a.seq - b.seq;

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

const customName = (name: string | null) => (name?.trim() ? name.trim() : null);

export interface LedgerClock {
    now: number;
    offsetAt: OffsetAt;
}

export const LEDGER_SETTING_KEYS = [
    "accentColor",
    "animatedCharts",
    "currency",
    "firstDayOfMonth",
    "firstWeekday",
    "incomeTracking",
    "showCents",
    "timeZone",
    "use24HourClock",
] as const;

export interface LedgerSettings {
    accent: AccentColors;
    animatedCharts: boolean;
    currency: string;
    firstDayOfMonth: number;
    firstWeekday: number;
    incomeTracking: boolean;
    showCents: boolean;
    timeZone: string | null;
    use24HourClock: boolean;
}

export function settingsOf(rows: readonly Setting[]): LedgerSettings {
    const value = (key: (typeof LEDGER_SETTING_KEYS)[number]) => rows.find((row) => row.key === key)?.value ?? null;
    const flag = (key: (typeof LEDGER_SETTING_KEYS)[number], fallback: boolean) => {
        const raw = value(key);
        return raw === null ? fallback : raw === "true";
    };
    return {
        accent: accentOf(value("accentColor")),
        animatedCharts: flag("animatedCharts", true),
        currency: value("currency") ?? "USD",
        firstDayOfMonth: Number(value("firstDayOfMonth")) || 1,
        firstWeekday: Number.parseInt(value("firstWeekday") ?? "", 10) || 1,
        incomeTracking: flag("incomeTracking", true),
        showCents: flag("showCents", true),
        timeZone: value("timeZone"),
        use24HourClock: flag("use24HourClock", false),
    };
}

export const storedZoneOf = (timeZone: string | null) => (timeZone === null ? null : zoneOffsets(timeZone));

const live = <Row extends { deletedAt: number | null }>(rows: readonly Row[]) =>
    rows.filter((row) => row.deletedAt === null);

const happened = <Row extends { date: number; deletedAt: number | null }>(rows: readonly Row[], now: number) =>
    rows.filter((row) => row.deletedAt === null && row.date <= now);

export function zoneOf(timeZone: string | null, transactions: readonly Transaction[], now: number): OffsetAt {
    const zone = storedZoneOf(timeZone);
    if (zone !== null) {
        return zone;
    }
    let latest: Transaction | undefined;
    for (const row of happened(transactions, now)) {
        if (latest === undefined || row.date > latest.date) {
            latest = row;
        }
    }
    return fixedOffset(latest === undefined ? 0 : utcOffsetOf(latest.day));
}

export const rateTableOf = (rows: Rates): RateTable => buildRateTable(rows);

export function recentTransactions(
    {
        accounts,
        categories,
        transactions,
    }: { accounts: readonly Account[]; categories: readonly Category[]; transactions: readonly Transaction[] },
    { limit = 20, now, timeZone }: { limit?: number | undefined; now: number; timeZone: string | null }
) {
    const zone = storedZoneOf(timeZone);
    const categoryById = new Map(categories.map((row) => [row.localId, row]));
    const accountNames = new Map(accounts.map((row) => [row.localId, row.name]));
    return happened(transactions, now)
        .sort((a, b) => b.date - a.date)
        .slice(0, Math.min(Math.max(limit, 1), MAX_ENTRIES))
        .map((row) => {
            const category = row.categoryId ? categoryById.get(row.categoryId) : undefined;
            const offsetMs = utcOffsetOf(row.day, zone?.(row.day));
            return {
                account: row.accountId ? (accountNames.get(row.accountId) ?? null) : null,
                amount: row.amount,
                category: category?.name ?? null,
                currency: row.currency,
                date: isoDay(row.day, offsetMs),
                emoji: row.emoji ?? category?.emoji ?? null,
                id: row.localId,
                imageKey: row.imageKey,
                kind: entryKind(row.income),
                note: row.note,
                time: new Date(row.date + (zone?.(row.date) ?? offsetMs)).toISOString().slice(11, 16),
            };
        });
}

export function spendingSummary(
    { categories, transactions }: { categories: readonly Category[]; transactions: readonly Transaction[] },
    settings: Pick<LedgerSettings, "currency" | "firstDayOfMonth" | "timeZone">,
    rates: RateTable,
    { now, offsetAt }: LedgerClock,
    monthsAgo = 0
) {
    const { currency } = settings;
    const window = monthWindow(now, offsetAt, settings.firstDayOfMonth, Math.max(0, Math.trunc(monthsAgo)));
    // Whole UTC days around the window: a valuation cell is one UTC day, and a cell cut at the edge values
    // differently.
    const from = utcDayStart(window.start);
    const to = utcDayStart(window.end - 1) + DAY_MS;
    const rows = happened(transactions, now)
        .filter((row) => row.date >= from && row.date < to)
        .sort(bySeq);
    const values = valueDatedRowsIn(
        rows.map((row) => ({ ...row, date: new Date(row.date) })),
        currency,
        rates
    );
    const categoryById = new Map(categories.map((row) => [row.localId, row]));
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
        const day = isoDay(row.date, offsetAt(row.date));
        byDay.set(day, (byDay.get(day) ?? 0) + value);
        const category = row.categoryId ? categoryById.get(row.categoryId) : undefined;
        const top = category?.parentId ? categoryById.get(category.parentId) : category;
        const name = top?.name ?? "Uncategorized";
        byCategory.set(name, (byCategory.get(name) ?? 0) + value);
    }
    return {
        currency,
        from: window.from,
        income: roundMoney(income, decimals),
        spent: roundMoney(spent, decimals),
        spentByCategory: [...byCategory]
            .map(([category, amount]) => ({ amount: roundMoney(amount, decimals), category }))
            .sort((a, b) => b.amount - a.amount),
        spentByDay: [...byDay]
            .map(([date, amount]) => ({ amount: roundMoney(amount, decimals), date }))
            .sort((a, b) => a.date.localeCompare(b.date)),
        to: window.to,
        today: isoDay(now, offsetAt(now)),
    };
}

export function accountBalances(
    books: {
        accounts: readonly Account[];
        installmentPlans: readonly InstallmentPlan[];
        outsideMoves: readonly OutsideMove[];
        outsidePayments: readonly OutsidePayment[];
        transactions: readonly Transaction[];
        transfers: readonly Transfer[];
    },
    currency: string,
    rates: RateTable,
    { now, offsetAt }: LedgerClock
) {
    const accounts = live(books.accounts)
        .filter((account) => (account.archivedAt ?? null) === null)
        .sort((a, b) => a.sortOrder - b.sortOrder);
    const ledger = new Map<string, LegEntry[]>(accounts.map((account) => [account.localId, []]));
    for (const row of happened(books.transactions, now).sort(bySeq)) {
        if (row.accountId) {
            ledger.get(row.accountId)?.push({ ...row, date: new Date(row.date), leg: "flow" });
        }
    }
    for (const row of happened(books.transfers, now).sort(bySeq)) {
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
    const planAccount = new Map(live(books.installmentPlans).map((row) => [row.localId, row.accountId]));
    const currencyOf = new Map(accounts.map((account) => [account.localId, account.currency]));
    for (const row of [...books.outsidePayments].sort(bySeq)) {
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
    for (const row of [...books.outsideMoves].sort(bySeq)) {
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
                    (entry) => `${entry.leg}|${isoDay(entry.date.getTime(), offsetAt(entry.date.getTime()))}`
                ),
                rates
            );
            return [
                {
                    balance: roundMoney(own.total, decimalsFor(account.currency)),
                    balanceInMainCurrency: roundMoney(row.balance, decimals),
                    currency: account.currency,
                    customColor: account.customColor,
                    emoji: account.emoji,
                    exact: own.exact && row.exact,
                    icon: account.icon,
                    imageColor: account.imageColor,
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
}

export function budgetStatus(
    books: {
        budgets: readonly Budget[];
        categories: readonly Category[];
        mainBudget: readonly MainBudget[];
        transactions: readonly Transaction[];
    },
    currency: string,
    rates: RateTable,
    { now, offsetAt }: LedgerClock
) {
    const categories = new Map(live(books.categories).map((row) => [row.localId, row]));
    const expenses = happened(books.transactions, now)
        .filter((row) => !row.income)
        .sort(bySeq);
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
    const main = books.mainBudget.find((row) => row.deletedAt === null);
    return {
        categories: live(books.budgets)
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
}

function scheduleOf(
    books: { categories: readonly Category[]; transactions: readonly Transaction[] },
    currency: string,
    rates: RateTable,
    { now, offsetAt }: LedgerClock
) {
    const categories = new Map(live(books.categories).map((row) => [row.localId, row]));
    const today = wall(now, offsetAt(now));
    const scheduled = live(books.transactions)
        .filter((row) => row.recurringType > RECURRING_TYPE.none || row.date > now)
        .sort(bySeq);
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
    return {
        categories,
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
            .sort((a, b) => a.landsOn.getTime() - b.landsOn.getTime()),
        currency,
        monthlyCost: perMonth
            .filter((bucket) => bucket.transactionCount > 0)
            .map((bucket) => ({
                amount: roundMoney(-bucket.amount, decimalsFor(bucket.currencyCode)),
                currency: bucket.currencyCode,
                schedules: bucket.transactionCount,
            })),
    };
}

const CADENCES = new Map<number, string>(Object.entries(RECURRING_TYPE).map(([name, code]) => [code, name]));

const cadenceOf = (recurringType: number) =>
    recurringType === RECURRING_TYPE.none ? null : (CADENCES.get(recurringType) ?? null);

export function upcomingCharges(
    books: { categories: readonly Category[]; transactions: readonly Transaction[] },
    currency: string,
    rates: RateTable,
    clock: LedgerClock
) {
    const { categories, charges, monthlyCost } = scheduleOf(books, currency, rates, clock);
    const { offsetAt } = clock;
    return {
        charges: charges.map(({ landsOn, row }) => ({
            amount: row.amount,
            category: row.categoryId ? (categories.get(row.categoryId)?.name ?? null) : null,
            currency: row.currency,
            endsOn: row.recurringEndDate === null ? null : isoDay(row.recurringEndDate, offsetAt(row.recurringEndDate)),
            kind: entryKind(row.income),
            nextCharge: wallDay(landsOn),
            note: row.note,
            repeats:
                row.recurringType === RECURRING_TYPE.none
                    ? null
                    : { cadence: cadenceOf(row.recurringType), every: row.recurringCoefficient },
        })),
        currency,
        monthlyCost,
    };
}

function ledgerUpcoming(
    books: { categories: readonly Category[]; transactions: readonly Transaction[] },
    currency: string,
    rates: RateTable,
    clock: LedgerClock
) {
    const { categories, charges, monthlyCost } = scheduleOf(books, currency, rates, clock);
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
                    accountId: row.accountId,
                    cadence: cadenceOf(row.recurringType),
                    every: row.recurringCoefficient,
                    fee: feeOf.get(row.localId) ?? null,
                    id: row.localId,
                    kind: entryKind(row.income),
                    look: entryLook(row, category),
                    nextCharge: wallDay(landsOn),
                    note: row.note || category?.name || "",
                };
            }),
        currency,
        monthlyCost,
    };
}

export function nextChangeAt(
    books: {
        outsideMoves: readonly OutsideMove[];
        outsidePayments: readonly OutsidePayment[];
        transactions: readonly Transaction[];
        transfers: readonly Transfer[];
    },
    { now, offsetAt }: LedgerClock
) {
    const tomorrow = Date.parse(`${isoDay(now, offsetAt(now))}T00:00:00Z`) + DAY_MS;
    let next = fromWall(tomorrow, offsetAt);
    for (const row of [...books.transactions, ...books.transfers, ...books.outsidePayments, ...books.outsideMoves]) {
        if (row.deletedAt === null && row.date > now && row.date < next) {
            next = row.date;
        }
    }
    return next;
}

export interface LedgerRows {
    accounts: readonly Account[];
    appMeta: readonly Setting[];
    budgets: readonly Budget[];
    categories: readonly Category[];
    exchangeRates: Rates;
    installmentPlans: readonly InstallmentPlan[];
    mainBudget: readonly MainBudget[];
    outsideMoves: readonly OutsideMove[];
    outsidePayments: readonly OutsidePayment[];
    transactions: readonly Transaction[];
    transfers: readonly Transfer[];
}

function viewOf(books: LedgerRows, now: number) {
    const settings = settingsOf(books.appMeta);
    const offsetAt = zoneOf(settings.timeZone, books.transactions, now);
    return {
        clock: { now, offsetAt },
        currency: settings.currency,
        rates: rateTableOf(books.exchangeRates),
        settings,
    };
}

function glanceOf(books: LedgerRows, { clock, currency, rates }: ReturnType<typeof viewOf>) {
    const balances = accountBalances(books, currency, rates, clock);
    return {
        balances: {
            ...balances,
            accounts: balances.accounts.map((account) => ({ ...account, look: accountLook(account) })),
        },
        nextChangeAt: nextChangeAt(books, clock),
        upcoming: ledgerUpcoming(books, currency, rates, clock),
    };
}

export function ledgerGlance(books: LedgerRows, now: number) {
    return glanceOf(books, viewOf(books, now));
}

export function ledgerOverview(books: LedgerRows, now: number) {
    const view = viewOf(books, now);
    const { clock, currency, rates, settings } = view;
    const { offsetAt } = clock;
    return {
        ...glanceOf(books, view),
        budgets: budgetStatus(books, currency, rates, clock),
        log: buildLog({
            accounts: new Map(books.accounts.map((row) => [row.localId, row])),
            categories: new Map(live(books.categories).map((row) => [row.localId, row])),
            // Not the stored `day`: that is midnight in the zone the row was saved in, which can split a day.
            clock: {
                dayOf: (row) => isoDay(row.date, offsetAt(row.date)),
                timeOf: (row) => new Date(row.date + offsetAt(row.date)).toISOString().slice(11, 16),
            },
            currency,
            entries: happened(books.transactions, now),
            entriesFull: false,
            limit: MAX_ENTRIES,
            rates,
            transfers: happened(books.transfers, now),
            transfersFull: false,
        }),
        summary: spendingSummary(books, settings, rates, clock),
    };
}

export type LedgerGlance = ReturnType<typeof ledgerGlance>;
