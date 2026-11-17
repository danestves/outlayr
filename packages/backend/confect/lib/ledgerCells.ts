import { utcDateString } from "@outlayr/money/dates";
import { compareLedgerCells, LEDGER_CELLS_VERSION, ledgerCellsOf } from "@outlayr/money/ledger-cells";
import type { LedgerCell } from "@outlayr/money/ledger-cells";
import { DAY_MS, utcDayStart } from "@outlayr/money/ledger-zone";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";

import type { Docs } from "../_generated/docs";
import refs from "../_generated/refs";
import { DatabaseReader, DatabaseWriter, Scheduler } from "../_generated/services";

export const MONEY_TABLES = ["transactions", "transfers", "outsidePayments", "outsideMoves"] as const;

export type MoneyTable = (typeof MONEY_TABLES)[number];

const REFRESH_DAYS = 64;

const MONTH_CELLS_MAX = 8000;

const MONTH_KEY_LENGTH = 7;

const monthKey = (instant: number) => utcDateString(instant).slice(0, MONTH_KEY_LENGTH);

function monthBounds(instant: number) {
    const date = new Date(instant);
    return {
        from: Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1),
        to: Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1),
    };
}

const syncStateOf = Effect.fn("LedgerCells.syncStateOf")(function* syncStateOf(userId: string) {
    const reader = yield* DatabaseReader;
    return yield* reader
        .table("syncState")
        .get("by_user", userId)
        .pipe(Effect.catchTags({ GetByIndexFailure: () => Effect.succeed(null) }));
});

const monthDoc = Effect.fn("LedgerCells.monthDoc")(function* monthDoc(userId: string, month: string) {
    const reader = yield* DatabaseReader;
    return yield* reader
        .table("ledgerCells")
        .get("by_user_and_month", userId, month)
        .pipe(Effect.catchTags({ GetByIndexFailure: () => Effect.succeed(null) }));
});

const live = Effect.fn("LedgerCells.live")(function* live(userId: string, from: number, to: number) {
    const reader = yield* DatabaseReader;
    return {
        outsideMoves: reader
            .table("outsideMoves")
            .index("by_user_and_deletedAt_and_date", (q) =>
                q.eq("userId", userId).eq("deletedAt", null).gte("date", from).lt("date", to)
            ),
        outsidePayments: reader
            .table("outsidePayments")
            .index("by_user_and_deletedAt_and_date", (q) =>
                q.eq("userId", userId).eq("deletedAt", null).gte("date", from).lt("date", to)
            ),
        transactions: reader
            .table("transactions")
            .index("by_user_and_deletedAt_and_date", (q) =>
                q.eq("userId", userId).eq("deletedAt", null).gte("date", from).lt("date", to)
            ),
        transfers: reader
            .table("transfers")
            .index("by_user_and_deletedAt_and_date", (q) =>
                q.eq("userId", userId).eq("deletedAt", null).gte("date", from).lt("date", to)
            ),
    };
});

const liveCells = Effect.fn("LedgerCells.liveCells")(function* liveCells(userId: string, from: number, to: number) {
    const rows = yield* live(userId, from, to);
    return ledgerCellsOf(
        yield* Effect.all(
            {
                outsideMoves: rows.outsideMoves.collect(),
                outsidePayments: rows.outsidePayments.collect(),
                transactions: rows.transactions.collect(),
                transfers: rows.transfers.collect(),
            },
            { concurrency: "unbounded" }
        )
    );
});

const writeMonth = Effect.fn("LedgerCells.writeMonth")(function* writeMonth(
    userId: string,
    month: string,
    existing: Docs["ledgerCells"] | null,
    cells: LedgerCell[]
) {
    const months = (yield* DatabaseWriter).table("ledgerCells");
    if (cells.length > MONTH_CELLS_MAX) {
        return false;
    }
    if (cells.length === 0) {
        if (existing) {
            yield* months.delete(existing._id);
        }
        return true;
    }
    yield* existing ? months.patch(existing._id, { cells }) : months.insert({ cells, month, userId });
    return true;
});

const setCells = Effect.fn("LedgerCells.setCells")(function* setCells(
    userId: string,
    state: Docs["syncState"] | null,
    { building, run }: { building: boolean; run: number }
) {
    const rows = (yield* DatabaseWriter).table("syncState");
    const cells = { building, run, version: LEDGER_CELLS_VERSION };
    yield* state ? rows.patch(state._id, { cells }) : rows.insert({ cells, nextSeq: 1, userId });
});

// After the write, not inside it: the cells are a cache, and no cost or limit of theirs may fail a push.
export const scheduleCellRefresh = Effect.fn("LedgerCells.scheduleCellRefresh")(function* scheduleCellRefresh(
    userId: string,
    cells: Docs["syncState"]["cells"],
    instants: readonly number[]
) {
    if (cells?.version !== LEDGER_CELLS_VERSION || instants.length === 0) {
        return;
    }
    const scheduler = yield* Scheduler;
    const days = [...new Set(instants.map(utcDayStart))].sort((a, b) => a - b);
    for (let index = 0; index < days.length; index += REFRESH_DAYS) {
        yield* scheduler.runAfter(Duration.zero, refs.internal.ledgerCells.refresh, {
            days: days.slice(index, index + REFRESH_DAYS),
            userId,
        });
    }
});

export const refreshDays = Effect.fn("LedgerCells.refreshDays")(function* refreshDays(
    userId: string,
    days: readonly number[]
) {
    const state = yield* syncStateOf(userId);
    if (state?.cells?.version !== LEDGER_CELLS_VERSION) {
        return;
    }
    const { run } = state.cells;
    const byMonth = new Map<string, number[]>();
    for (const day of days) {
        const month = monthKey(day);
        byMonth.set(month, [...(byMonth.get(month) ?? []), day]);
    }
    for (const [month, monthDays] of byMonth) {
        const [existing, fresh] = yield* Effect.all(
            [
                monthDoc(userId, month),
                Effect.all(
                    monthDays.map((day) => liveCells(userId, day, day + DAY_MS)),
                    { concurrency: "unbounded" }
                ),
            ],
            { concurrency: "unbounded" }
        );
        const refreshed = new Set(monthDays.map(utcDateString));
        const kept = (existing?.cells ?? []).filter((cell) => !refreshed.has(cell.dateKey));
        const stored = yield* writeMonth(userId, month, existing, [...kept, ...fresh.flat()].sort(compareLedgerCells));
        if (!stored) {
            return yield* setCells(userId, state, { building: true, run });
        }
    }
});

const firstLiveMonth = Effect.fn("LedgerCells.firstLiveMonth")(function* firstLiveMonth(userId: string, from: number) {
    const rows = yield* live(userId, from, Number.POSITIVE_INFINITY);
    const first: readonly Option.Option<{ date: number }>[] = yield* Effect.all(
        [rows.outsideMoves.first(), rows.outsidePayments.first(), rows.transactions.first(), rows.transfers.first()],
        { concurrency: "unbounded" }
    );
    const dates = first.flatMap((row) => (Option.isSome(row) ? [row.value.date] : []));
    return dates.length > 0 ? monthBounds(Math.min(...dates)).from : null;
});

export const rebuildCells = Effect.fn("LedgerCells.rebuildCells")(function* rebuildCells(
    userId: string,
    step: { month: number; run: number } | null
) {
    const scheduler = yield* Scheduler;
    const state = yield* syncStateOf(userId);
    const run = step?.run ?? (state?.cells?.run ?? 0) + 1;
    let after = Number.NEGATIVE_INFINITY;
    if (step === null) {
        const reader = yield* DatabaseReader;
        const writer = yield* DatabaseWriter;
        const stale = yield* reader
            .table("ledgerCells")
            .index("by_user_and_month", (q) => q.eq("userId", userId))
            .collect();
        yield* Effect.all(
            stale.map((doc) => writer.table("ledgerCells").delete(doc._id)),
            { concurrency: "unbounded", discard: true }
        );
        yield* setCells(userId, state, { building: true, run });
    } else {
        const current = state?.cells;
        if (!current?.building || current.run !== run || current.version !== LEDGER_CELLS_VERSION) {
            return;
        }
        const { from, to } = monthBounds(step.month);
        const [existing, cells] = yield* Effect.all([monthDoc(userId, monthKey(from)), liveCells(userId, from, to)], {
            concurrency: "unbounded",
        });
        if (!(yield* writeMonth(userId, monthKey(from), existing, cells))) {
            return;
        }
        after = to;
    }
    const month = yield* firstLiveMonth(userId, after);
    if (month === null) {
        return yield* setCells(userId, yield* syncStateOf(userId), { building: false, run });
    }
    yield* scheduler.runAfter(Duration.zero, refs.internal.ledgerCells.rebuild, { step: { month, run }, userId });
});
