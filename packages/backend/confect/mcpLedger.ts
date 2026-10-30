import { effectiveLimit, rolloverCarry } from "@outlayr/money/budget-rollover";
import { lastMsBefore } from "@outlayr/money/budget-spent";
import { advanceBudgetWindow, BUDGET_TYPE, windowEndMs } from "@outlayr/money/budget-window";
import { decimalsFor } from "@outlayr/money/currency";
import { toCells } from "@outlayr/money/currency-totals";
import type { CurrencyCell, CurrencyEntry } from "@outlayr/money/currency-totals";
import { roundMoney } from "@outlayr/money/round";
import { limitIn } from "@outlayr/money/valuation";
import type { RateTable } from "@outlayr/money/valuation";
import * as Schema from "effect/Schema";

export const McpUser = Schema.Struct({
    clientId: Schema.optional(Schema.String),
    connectionId: Schema.String,
    scopes: Schema.Array(Schema.String),
    userId: Schema.String,
});

export const EntryKind = Schema.Literals(["expense", "income"]);

export const RecentTransactionsInput = { limit: Schema.optional(Schema.Number) };

export const RecentTransactions = Schema.mutable(
    Schema.Array(
        Schema.Struct({
            amount: Schema.Number,
            category: Schema.NullOr(Schema.String),
            currency: Schema.NullOr(Schema.String),
            date: Schema.String,
            kind: EntryKind,
            note: Schema.String,
        })
    )
);

export const SpendingSummaryInput = { monthsAgo: Schema.optional(Schema.Number) };

export const SpendingSummary = Schema.Struct({
    currency: Schema.String,
    from: Schema.String,
    income: Schema.Number,
    spent: Schema.Number,
    spentByCategory: Schema.mutable(Schema.Array(Schema.Struct({ amount: Schema.Number, category: Schema.String }))),
    to: Schema.String,
});

export const AccountBalances = Schema.Struct({
    accounts: Schema.mutable(
        Schema.Array(
            Schema.Struct({
                balance: Schema.Number,
                balanceInMainCurrency: Schema.Number,
                currency: Schema.String,
                exact: Schema.Boolean,
                kind: Schema.String,
                name: Schema.String,
            })
        )
    ),
    currency: Schema.String,
    net: Schema.Number,
    owed: Schema.Number,
    owned: Schema.Number,
});

const BudgetStanding = {
    carryOver: Schema.Number,
    effectiveLimit: Schema.Number,
    from: Schema.String,
    limit: Schema.Number,
    overBudget: Schema.Boolean,
    period: Schema.NullOr(Schema.String),
    remaining: Schema.Number,
    rollover: Schema.Boolean,
    spent: Schema.Number,
    to: Schema.String,
};

export const BudgetStatus = Schema.Struct({
    categories: Schema.mutable(
        Schema.Array(
            Schema.Struct({
                ...BudgetStanding,
                category: Schema.NullOr(Schema.String),
                name: Schema.NullOr(Schema.String),
                subcategories: Schema.mutable(Schema.Array(Schema.String)),
            })
        )
    ),
    currency: Schema.String,
    overall: Schema.NullOr(Schema.Struct({ ...BudgetStanding, name: Schema.NullOr(Schema.String) })),
});

export const UpcomingCharges = Schema.Struct({
    charges: Schema.mutable(
        Schema.Array(
            Schema.Struct({
                amount: Schema.Number,
                category: Schema.NullOr(Schema.String),
                currency: Schema.NullOr(Schema.String),
                endsOn: Schema.NullOr(Schema.String),
                kind: EntryKind,
                nextCharge: Schema.String,
                note: Schema.String,
                repeats: Schema.NullOr(Schema.Struct({ cadence: Schema.NullOr(Schema.String), every: Schema.Number })),
            })
        )
    ),
    currency: Schema.String,
    monthlyCost: Schema.mutable(
        Schema.Array(Schema.Struct({ amount: Schema.Number, currency: Schema.String, schedules: Schema.Number }))
    ),
});

export const entryKind = (income: boolean): typeof EntryKind.Type => (income ? "income" : "expense");

export const MAX_ENTRIES = 50;
export const SCAN_WINDOW = 500;

export const DAY_MS = 86_400_000;
const FARTHEST_WEST_MS = 10 * 3_600_000;
const LATEST_PAYDAY = 28;

export type OffsetAt = (instant: number) => number;

export const fixedOffset =
    (offsetMs: number): OffsetAt =>
    () =>
        offsetMs;

export function zoneOffsets(timeZone: string): OffsetAt | null {
    let format: Intl.DateTimeFormat;
    try {
        format = new Intl.DateTimeFormat("en-US", {
            day: "numeric",
            hour: "numeric",
            hourCycle: "h23",
            minute: "numeric",
            month: "numeric",
            second: "numeric",
            timeZone,
            year: "numeric",
        });
    } catch {
        return null;
    }
    return (instant) => {
        const parts = new Map(format.formatToParts(instant).map((part) => [part.type, Number(part.value)]));
        const part = (type: Intl.DateTimeFormatPartTypes) => parts.get(type) ?? 0;
        const wallMs = Date.UTC(
            part("year"),
            part("month") - 1,
            part("day"),
            part("hour"),
            part("minute"),
            part("second")
        );
        return wallMs - Math.floor(instant / 1000) * 1000;
    };
}

export const fromWall = (wallMs: number, offsetAt: OffsetAt) => wallMs - offsetAt(wallMs - offsetAt(wallMs));

export function utcOffsetOf(localMidnight: number, hintMs?: number): number {
    const sinceUtcMidnight = ((localMidnight % DAY_MS) + DAY_MS) % DAY_MS;
    const west = 0 - sinceUtcMidnight;
    const east = DAY_MS - sinceUtcMidnight;
    if (hintMs === west || hintMs === east) {
        return hintMs;
    }
    return sinceUtcMidnight <= FARTHEST_WEST_MS ? west : east;
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
export const wall = (instant: number, offsetMs: number) => new Date(instant + offsetMs);
export const wallDay = (date: Date) => date.toISOString().slice(0, 10);
export const localDate = (instant: number, offsetMs: number) => wallDay(wall(instant, offsetMs));

// Valuation rounds per cell in input order, so rows read by date go back into the seq order a full scan gave.
export const bySeq = (a: { seq: number }, b: { seq: number }) => a.seq - b.seq;
export const utcDayStart = (instant: number) => Math.floor(instant / DAY_MS) * DAY_MS;

export type LegEntry = CurrencyEntry & { date: Date; leg: "flow" | "inbound" | "outbound" };

export function groupCells(entries: readonly LegEntry[], key: (entry: LegEntry) => string): CurrencyCell[] {
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
    offsetAt: OffsetAt;
    rates: RateTable;
}

export function budgetStanding(
    budget: StoredBudget,
    carries: boolean,
    spentThrough: (start: Date, last: Date) => number,
    clock: BudgetClock
) {
    const window = advanceBudgetWindow(
        budget.startDate === null ? clock.now : wall(budget.startDate, clock.offsetAt(budget.startDate)),
        budget.type,
        clock.now
    );
    const spent = spentThrough(window.start, new Date(windowEndMs(window, clock.now.getTime())));
    const limit = limitIn(
        budget,
        new Date(fromWall(window.start.getTime(), clock.offsetAt)),
        clock.currency,
        clock.rates
    );
    const carry = carries
        ? rolloverCarry({
              anchor:
                  budget.dateCreated === null
                      ? window.start
                      : wall(budget.dateCreated, clock.offsetAt(budget.dateCreated)),
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

export const customName = (name: string | null) => (name?.trim() ? name.trim() : null);
