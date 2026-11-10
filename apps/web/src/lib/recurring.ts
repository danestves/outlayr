import { transactionFields } from "@outlayr/backend/confect/lib/syncTables";
import { DAY_MS, fromWall, isoDay, wallDay, wallMidnight } from "@outlayr/money/ledger-zone";
import { merchantKey } from "@outlayr/money/merchant-key";
import { RECURRING_TYPE } from "@outlayr/money/recurrence";
import { monthlyChargeCount } from "@outlayr/money/subscription-cost";
import { valueDatedRowsIn } from "@outlayr/money/valuation";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import type { Ledger } from "./dashboard-series-ledger";

export const RECURRING_KEY = "recurring";

/** A paused carrier's own row, kept here because a tombstoned row never reaches the web again. */
export const Seed = Schema.Struct({ ...transactionFields, localId: Schema.String });

export const Pause = Schema.Struct({
    fromId: Schema.String,
    resumes: Schema.NullOr(Schema.String),
    seed: Seed,
    since: Schema.String,
    toId: Schema.NullOr(Schema.String),
});

export const RecurringBook = Schema.Struct({
    dismissed: Schema.Array(Schema.String),
    paused: Schema.Array(Pause),
});

export type Seed = typeof Seed.Type;
export type Pause = typeof Pause.Type;
export type RecurringBook = typeof RecurringBook.Type;

export const EMPTY_RECURRING: RecurringBook = { dismissed: [], paused: [] };

const decodeBook = Schema.decodeUnknownOption(Schema.fromJsonString(RecurringBook));

export const recurringBookOf = (raw: string | null | undefined): RecurringBook =>
    raw ? Option.getOrElse(decodeBook(raw), () => EMPTY_RECURRING) : EMPTY_RECURRING;

type Doc = Ledger["books"]["transactions"][number];
type Clock = Pick<Ledger, "now" | "offsetAt" | "today">;

export const seedOf = (doc: Doc): Seed => ({
    accountId: doc.accountId ?? null,
    amount: doc.amount,
    amountUsd: doc.amountUsd,
    categoryId: doc.categoryId,
    currency: doc.currency,
    customColor: doc.customColor,
    date: doc.date,
    day: doc.day,
    details: doc.details,
    emoji: doc.emoji,
    exchangeRate: doc.exchangeRate,
    exchangeRateType: doc.exchangeRateType,
    icon: doc.icon,
    imageColor: doc.imageColor,
    imageKey: doc.imageKey,
    income: doc.income,
    localId: doc.localId,
    month: doc.month,
    note: doc.note,
    onceRecurring: doc.onceRecurring,
    recurringAnchorDay: doc.recurringAnchorDay ?? null,
    recurringCoefficient: doc.recurringCoefficient,
    recurringEndDate: doc.recurringEndDate,
    recurringType: doc.recurringType,
});

const MAX_STEPS = 1000;

/** `nextDate` on the ledger's wall clock, read with UTC getters so the browser's own zone never leaks in. */
export function stepWall(wallMs: number, type: number, every: number, anchor: number): number | null {
    const n = Math.max(1, Math.round(every));
    if (type === RECURRING_TYPE.daily) {
        return wallMs + n * DAY_MS;
    }
    if (type === RECURRING_TYPE.weekly) {
        return wallMs + 7 * n * DAY_MS;
    }
    const months = { [RECURRING_TYPE.monthly]: n, [RECURRING_TYPE.yearly]: 12 * n }[type];
    if (months === undefined) {
        return null;
    }
    const at = new Date(wallMs);
    const year = at.getUTCFullYear();
    const month = at.getUTCMonth() + months;
    const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    return Date.UTC(
        year,
        month,
        Math.min(Math.min(31, Math.max(1, anchor)), last),
        at.getUTCHours(),
        at.getUTCMinutes(),
        at.getUTCSeconds(),
        at.getUTCMilliseconds()
    );
}

export interface Chain {
    anchor: number;
    endDay: string | null;
    every: number;
    /** The carrier's wall instant. */
    start: number;
    type: number;
}

export function* walk(chain: Chain): Generator<number> {
    let holding = chain.start;
    for (let step = 0; step < MAX_STEPS; step += 1) {
        const next = stepWall(holding, chain.type, chain.every, chain.anchor);
        if (next === null || next <= holding || (chain.endDay !== null && wallDay(new Date(next)) > chain.endDay)) {
            return;
        }
        yield next;
        holding = next;
    }
}

export const chainOf = (seed: Seed, offsetAt: Ledger["offsetAt"]): Chain => {
    const start = seed.date + offsetAt(seed.date);
    return {
        anchor: seed.recurringAnchorDay ?? new Date(start).getUTCDate(),
        endDay: seed.recurringEndDate === null ? null : isoDay(seed.recurringEndDate, offsetAt(seed.recurringEndDate)),
        every: seed.recurringCoefficient,
        start,
        type: seed.recurringType,
    };
};

export interface Charge {
    /** The instant the back-fill would write it at, which its occurrence id derives from. */
    at: number;
    day: string;
}

export const chargeAt = (wallMs: number, offsetAt: Ledger["offsetAt"]): Charge => ({
    at: fromWall(wallMs, offsetAt),
    day: wallDay(new Date(wallMs)),
});

/** The charges of a chain landing from `from` through `to`, both ISO days. */
export function chargesIn(chain: Chain, from: string, to: string, offsetAt: Ledger["offsetAt"]): Charge[] {
    const found: Charge[] = [];
    for (const wallMs of walk(chain)) {
        const day = wallDay(new Date(wallMs));
        if (day > to) {
            break;
        }
        if (day >= from) {
            found.push(chargeAt(wallMs, offsetAt));
        }
    }
    return found;
}

/** The first charge landing on or after `day`. */
export function firstFrom(chain: Chain, day: string, offsetAt: Ledger["offsetAt"]): Charge | null {
    for (const wallMs of walk(chain)) {
        if (wallDay(new Date(wallMs)) >= day) {
            return chargeAt(wallMs, offsetAt);
        }
    }
    return null;
}

export type ScheduleState = "active" | "paused" | "stopped";

export interface Schedule {
    carrier: Doc | null;
    chain: Chain;
    /** Charges on or before today that no entry covers yet, oldest first. */
    due: readonly Charge[];
    id: string;
    key: string;
    name: string;
    next: Charge | null;
    pause: Pause | null;
    perMonth: number;
    seed: Seed;
    startDay: string;
    state: ScheduleState;
    worth: number;
}

export interface HistoryEntry {
    accountId: string | null;
    amount: number;
    at: number;
    categoryId: string | null;
    currency: string;
    day: string;
    id: string;
    worth: number;
}

export interface Candidate {
    accountId: string | null;
    amount: number;
    categoryId: string | null;
    currency: string;
    entries: readonly HistoryEntry[];
    every: number;
    gap: number;
    income: boolean;
    key: string;
    name: string;
    next: Charge;
    perMonth: number;
    since: string;
    total: number;
    type: number;
    worth: number;
}

export interface RecurringModel {
    candidates: readonly Candidate[];
    history: ReadonlyMap<string, readonly HistoryEntry[]>;
    schedules: readonly Schedule[];
}

const isCarrier = (doc: Doc) =>
    doc.deletedAt === null &&
    doc.recurringType > RECURRING_TYPE.none &&
    !doc.feeForId &&
    !doc.transferId &&
    !doc.installmentId;

const isPlain = (doc: Doc) => doc.deletedAt === null && !doc.feeForId && !doc.transferId && !doc.installmentId;

const matchOf = (note: string, categoryId: string | null, income: boolean) =>
    `${merchantKey(note) || `#${categoryId ?? ""}`}|${income}`;

function worthAt(ledger: Pick<Ledger, "currency" | "rates">, seed: Seed, at: number) {
    const [value] = valueDatedRowsIn([{ ...seed, date: new Date(at) }], ledger.currency, ledger.rates);
    return value ?? seed.amount;
}

/** The pauses still holding a chain back; a dated one ends on its own once its day comes. */
export const activePauses = (book: RecurringBook, today: string) =>
    book.paused.filter((pause) => pause.resumes === null || pause.resumes > today);

function scheduleOf(
    ledger: Clock & Pick<Ledger, "currency" | "rates">,
    seed: Seed,
    carrier: Doc | null,
    pause: Pause | null,
    nameOf: (seed: Seed) => string
): Schedule {
    const { now, offsetAt, today } = ledger;
    const chain = chainOf(seed, offsetAt);
    const startDay = isoDay(seed.date, offsetAt(seed.date));
    const due: Charge[] = [];
    let next: Charge | null = null;
    if (pause) {
        next = carrier ? { at: carrier.date, day: isoDay(carrier.date, offsetAt(carrier.date)) } : null;
    } else if (seed.date > now) {
        next = chain.endDay !== null && startDay > chain.endDay ? null : { at: seed.date, day: startDay };
    } else {
        for (const wallMs of walk(chain)) {
            const charge = chargeAt(wallMs, offsetAt);
            if (charge.day > today) {
                next = charge;
                break;
            }
            due.push(charge);
        }
    }
    const ended = next === null && due.length === 0 ? "stopped" : "active";
    const state: ScheduleState = pause ? "paused" : ended;
    const worth = worthAt(ledger, seed, (due[0] ?? next)?.at ?? now);
    return {
        carrier,
        chain,
        due,
        id: pause?.fromId ?? seed.localId,
        key: matchOf(seed.note, seed.categoryId, seed.income),
        name: nameOf(seed),
        next,
        pause,
        perMonth: state === "active" ? worth * monthlyChargeCount(seed.recurringType, seed.recurringCoefficient) : 0,
        seed,
        startDay,
        state,
        worth,
    };
}

interface Cadence {
    every: number;
    max: number;
    min: number;
    type: number;
}

const CADENCES: readonly Cadence[] = [
    { every: 1, max: 8, min: 6, type: RECURRING_TYPE.weekly },
    { every: 2, max: 16, min: 13, type: RECURRING_TYPE.weekly },
    { every: 1, max: 35, min: 26, type: RECURRING_TYPE.monthly },
    { every: 2, max: 66, min: 56, type: RECURRING_TYPE.monthly },
    { every: 3, max: 97, min: 85, type: RECURRING_TYPE.monthly },
    { every: 6, max: 190, min: 175, type: RECURRING_TYPE.monthly },
    { every: 1, max: 380, min: 350, type: RECURRING_TYPE.yearly },
];

const LONG_GAP = 150;
const AMOUNT_DRIFT = 0.15;
const MIN_SEEN = 3;
const STALE_AFTER = 1.5;

const daysBetween = (from: string, to: string) => Math.round((wallMidnight(to) - wallMidnight(from)) / DAY_MS);

function median(values: readonly number[]) {
    const sorted = values.toSorted((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2 : (sorted[middle] ?? 0);
}

/** Same merchant, a steady amount and a steady gap: what a subscription nobody marked looks like. */
export function cadenceOf(entries: readonly Pick<HistoryEntry, "amount" | "day">[], today: string): Cadence | null {
    const days = entries.map((entry) => entry.day).toSorted();
    const gaps = days.slice(1).map((day, index) => daysBetween(days[index] ?? day, day));
    if (gaps.length === 0 || gaps.includes(0)) {
        return null;
    }
    const gap = median(gaps);
    const cadence = CADENCES.find((each) => gap >= each.min && gap <= each.max);
    if (!cadence || entries.length < (cadence.min > LONG_GAP ? 2 : MIN_SEEN)) {
        return null;
    }
    if (!gaps.every((each) => each >= cadence.min && each <= cadence.max)) {
        return null;
    }
    const amounts = entries.map((entry) => entry.amount);
    const typical = median(amounts);
    if (!amounts.every((amount) => Math.abs(amount - typical) <= typical * AMOUNT_DRIFT)) {
        return null;
    }
    const last = days.at(-1) ?? today;
    return daysBetween(last, today) > cadence.max * STALE_AFTER ? null : cadence;
}

export function recurringModel(
    ledger: Clock & Pick<Ledger, "books" | "currency" | "rates" | "rows">,
    book: RecurringBook,
    nameOf: (seed: Seed) => string
): RecurringModel {
    const { books, offsetAt, today } = ledger;
    const pauses = activePauses(book, today);
    const byId = new Map(books.transactions.map((doc) => [doc.localId, doc]));
    const hidden = new Set(pauses.flatMap((pause) => (pause.toId === null ? [] : [pause.toId])));
    const live = books.transactions.filter((doc) => isCarrier(doc) && !hidden.has(doc.localId));
    const schedules = [
        ...live.map((doc) => scheduleOf(ledger, seedOf(doc), doc, null, nameOf)),
        ...pauses.map((pause) => {
            const carrier = pause.toId === null ? undefined : byId.get(pause.toId);
            const alive = carrier?.deletedAt === null ? carrier : null;
            return scheduleOf(ledger, alive ? seedOf(alive) : pause.seed, alive, pause, nameOf);
        }),
    ];

    const worthOf = new Map(ledger.rows.map((row) => [row.id, row.amount]));
    const entryOf = (doc: Doc): HistoryEntry => ({
        accountId: doc.accountId ?? null,
        amount: doc.amount,
        at: doc.date,
        categoryId: doc.categoryId,
        currency: doc.currency ?? ledger.currency,
        day: isoDay(doc.date, offsetAt(doc.date)),
        id: doc.localId,
        worth: worthOf.get(doc.localId) ?? doc.amount,
    });
    const happened = books.transactions
        .filter((doc) => isPlain(doc) && doc.date <= ledger.now)
        .toSorted((a, b) => b.date - a.date);

    const linked = new Map<string, HistoryEntry[]>();
    for (const doc of happened) {
        if (doc.onceRecurring || doc.recurringType > RECURRING_TYPE.none) {
            const key = matchOf(doc.note, doc.categoryId, doc.income);
            linked.set(key, [...(linked.get(key) ?? []), entryOf(doc)]);
        }
    }
    const history = new Map(schedules.map((schedule) => [schedule.id, linked.get(schedule.key) ?? []]));

    const taken = new Set(schedules.map((schedule) => schedule.key));
    const dismissed = new Set(book.dismissed);
    const groups = new Map<string, Doc[]>();
    for (const doc of happened) {
        const merchant = merchantKey(doc.note);
        if (merchant !== "") {
            const key = `${merchant}|${doc.income}|${doc.currency ?? ""}`;
            groups.set(key, [...(groups.get(key) ?? []), doc]);
        }
    }
    const candidates = [...groups].flatMap(([key, docs]): Candidate[] => {
        const [latest] = docs;
        if (
            latest === undefined ||
            dismissed.has(key) ||
            taken.has(matchOf(latest.note, null, latest.income)) ||
            docs.some((doc) => doc.onceRecurring || doc.recurringType > RECURRING_TYPE.none)
        ) {
            return [];
        }
        const entries = docs.map(entryOf);
        const cadence = cadenceOf(entries, today);
        if (!cadence) {
            return [];
        }
        const chain: Chain = {
            anchor: new Date(latest.date + offsetAt(latest.date)).getUTCDate(),
            endDay: null,
            every: cadence.every,
            start: latest.date + offsetAt(latest.date),
            type: cadence.type,
        };
        const next = firstFrom(chain, today, offsetAt);
        if (!next) {
            return [];
        }
        const worth = worthAt(ledger, seedOf(latest), next.at);
        return [
            {
                accountId: latest.accountId ?? null,
                amount: latest.amount,
                categoryId: latest.categoryId,
                currency: latest.currency ?? ledger.currency,
                entries,
                every: cadence.every,
                gap: Math.round(
                    median(
                        entries.slice(1).map((entry, index) => daysBetween(entry.day, entries[index]?.day ?? entry.day))
                    )
                ),
                income: latest.income,
                key,
                name: latest.note.trim(),
                next,
                perMonth: worth * monthlyChargeCount(cadence.type, cadence.every),
                since: entries.at(-1)?.day ?? today,
                total: entries.reduce((sum, entry) => sum + entry.worth, 0),
                type: cadence.type,
                worth,
            },
        ];
    });

    return {
        candidates: candidates.toSorted((a, b) => b.perMonth - a.perMonth),
        history,
        schedules,
    };
}

export const isActive = (schedule: Schedule) => schedule.state === "active";

export type UpcomingGroup = "later" | "missed" | "today" | "tomorrow" | `month:${string}`;

export interface UpcomingRow {
    charge: Charge;
    due: boolean;
    group: UpcomingGroup;
    schedule: Schedule;
}

export const addDays = (day: string, days: number) => wallDay(new Date(wallMidnight(day) + days * DAY_MS));

const UPCOMING_DAYS = 30;

/** What is due and what lands in the next 30 days; a chain with nothing in that window shows its next charge last. */
export function upcomingOf(model: RecurringModel, ledger: Clock, days = UPCOMING_DAYS): UpcomingRow[] {
    const { offsetAt, today } = ledger;
    const tomorrow = addDays(today, 1);
    const until = addDays(today, days);
    const groupOf = (day: string): UpcomingGroup => {
        if (day < today) {
            return "missed";
        }
        if (day === today) {
            return "today";
        }
        return day === tomorrow ? "tomorrow" : `month:${day.slice(0, 7)}`;
    };
    const rows: UpcomingRow[] = [];
    const later: UpcomingRow[] = [];
    for (const schedule of model.schedules.filter(isActive)) {
        for (const charge of schedule.due) {
            rows.push({ charge, due: true, group: groupOf(charge.day), schedule });
        }
        const { next } = schedule;
        if (next === null) {
            continue;
        }
        const ahead =
            next.day <= until
                ? [
                      next,
                      ...chargesIn(
                          {
                              ...schedule.chain,
                              start: next.at + offsetAt(next.at),
                          },
                          addDays(next.day, 1),
                          until,
                          offsetAt
                      ),
                  ]
                : [];
        for (const charge of ahead) {
            rows.push({ charge, due: false, group: groupOf(charge.day), schedule });
        }
        if (ahead.length === 0) {
            later.push({ charge: next, due: false, group: "later", schedule });
        }
    }
    const byDay = (a: UpcomingRow, b: UpcomingRow) =>
        a.charge.at - b.charge.at || a.schedule.name.localeCompare(b.schedule.name);
    return [...rows.toSorted(byDay), ...later.toSorted(byDay)];
}

export type EventKind = "due" | "logged" | "planned";

export interface MonthEvent {
    day: string;
    kind: EventKind;
    schedule: Schedule;
    worth: number;
}

/** A month's charges: what was logged, what is due and what is still to come. */
export function monthEvents(model: RecurringModel, ledger: Clock, month: string): MonthEvent[] {
    const { offsetAt } = ledger;
    const from = `${month}-01`;
    const to = addDays(wallDay(new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 1))), -1);
    const inMonth = (day: string) => day >= from && day <= to;
    return model.schedules.flatMap((schedule) => {
        const logged = (model.history.get(schedule.id) ?? [])
            .filter((entry) => inMonth(entry.day))
            .map((entry): MonthEvent => ({ day: entry.day, kind: "logged", schedule, worth: entry.worth }));
        if (schedule.state !== "active") {
            return logged;
        }
        const due = schedule.due
            .filter((charge) => inMonth(charge.day))
            .map((charge): MonthEvent => ({ day: charge.day, kind: "due", schedule, worth: schedule.worth }));
        const { next } = schedule;
        const planned =
            next === null || next.day > to
                ? []
                : [
                      next,
                      ...chargesIn(
                          { ...schedule.chain, start: next.at + offsetAt(next.at) },
                          addDays(next.day, 1),
                          to,
                          offsetAt
                      ),
                  ]
                      .filter((charge) => inMonth(charge.day))
                      .map((charge): MonthEvent => ({
                          day: charge.day,
                          kind: "planned",
                          schedule,
                          worth: schedule.worth,
                      }));
        return [...logged, ...due, ...planned];
    });
}

/** The chain's next `count` charges from its next one. */
export function nextCharges(schedule: Schedule, ledger: Clock, count: number): Charge[] {
    const { next } = schedule;
    if (next === null) {
        return [];
    }
    const found = [next];
    for (const wallMs of walk({ ...schedule.chain, start: next.at + ledger.offsetAt(next.at) })) {
        if (found.length >= count) {
            break;
        }
        found.push(chargeAt(wallMs, ledger.offsetAt));
    }
    return found;
}

const MONTH_AGO = 30;
const INCOME_MONTHS = 3;
const PERCENT = 100;

export function kpisOf(model: RecurringModel, ledger: Clock & Pick<Ledger, "rows">) {
    const { today } = ledger;
    const spending = model.schedules.filter((schedule) => !schedule.seed.income);
    const active = spending.filter(isActive);
    const perMonth = active.reduce((sum, schedule) => sum + schedule.perMonth, 0);
    const monthAgo = addDays(today, -MONTH_AGO);
    const before = active.reduce((sum, schedule) => {
        const then = (model.history.get(schedule.id) ?? []).find((entry) => entry.day <= monthAgo);
        return then
            ? sum + then.worth * monthlyChargeCount(schedule.seed.recurringType, schedule.seed.recurringCoefficient)
            : sum;
    }, 0);
    const monthStart = `${today.slice(0, 7)}-01`;
    const incomeFrom = wallDay(
        new Date(Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1 - INCOME_MONTHS, 1))
    );
    const income =
        ledger.rows
            .filter((row) => row.income && row.feeFor === null && row.day >= incomeFrom && row.day < monthStart)
            .reduce((sum, row) => sum + row.amount, 0) / INCOME_MONTHS;
    const month = monthEvents(model, ledger, today.slice(0, 7)).filter((event) => !event.schedule.seed.income);
    const due = active.flatMap((schedule) => schedule.due.map((charge) => ({ charge, schedule })));
    const detected = model.candidates.filter((candidate) => !candidate.income);
    return {
        change: before > 0 ? ((perMonth - before) / before) * PERCENT : null,
        detected: detected.reduce((sum, candidate) => sum + candidate.perMonth, 0),
        detectedCount: model.candidates.length,
        due: due.reduce((sum, { schedule }) => sum + schedule.worth, 0),
        missed: due.filter(({ charge }) => charge.day < today).length,
        month: month.reduce((sum, event) => sum + event.worth, 0),
        monthCount: month.length,
        ofIncome: income > 0 ? Math.round((perMonth / income) * PERCENT) : null,
        pausedSaves: spending
            .filter((schedule) => schedule.state === "paused")
            .reduce(
                (sum, schedule) =>
                    sum +
                    schedule.worth *
                        monthlyChargeCount(schedule.seed.recurringType, schedule.seed.recurringCoefficient),
                0
            ),
        perMonth,
        today: due.filter(({ charge }) => charge.day === today).length,
    };
}

export type RecurringKpis = ReturnType<typeof kpisOf>;
