import type { LedgerBooks } from "@outlayr/backend/confect/ledgerView";
import { occurrenceId } from "@outlayr/money/occurrence";
import { RECURRING_TYPE } from "@outlayr/money/recurrence";
import { describe, expect, it } from "vite-plus/test";

import { prepareLedger } from "./dashboard-series-ledger";
import type { CommitRow } from "./ledger-committer";
import { EMPTY_RECURRING, recurringModel, reverted, stepWall, upcomingOf } from "./recurring";
import type { RecurringBook } from "./recurring";
import { deletedSchedule, editedSchedule, loggedCharge, pausedSchedule, resumedSchedule } from "./recurring-writes";

// 11:00 on Nov 8 in Caracas (UTC-4).
const NOW = Date.parse("2026-11-08T15:00:00Z");

const envelope = (localId: string) => ({ deletedAt: null, deviceId: "d", localId, seq: 1, updatedAt: 5, userId: "u" });

const doc = (localId: string, date: string, extra: Record<string, unknown> = {}) => ({
    ...envelope(localId),
    accountId: "chase",
    amount: 65,
    amountUsd: 65,
    categoryId: "subs",
    currency: "USD",
    customColor: null,
    date: Date.parse(date),
    day: Date.parse(date),
    details: null,
    emoji: null,
    exchangeRate: null,
    exchangeRateType: "official",
    icon: null,
    imageColor: null,
    imageKey: null,
    income: false,
    month: Date.parse(date),
    note: "T-Mobile",
    onceRecurring: false,
    recurringCoefficient: 1,
    recurringEndDate: null,
    recurringType: 0,
    ...extra,
});

const monthly = { onceRecurring: true, recurringType: RECURRING_TYPE.monthly };

const ledgerWith = (transactions: unknown[], now = NOW) =>
    prepareLedger(
        {
            accounts: [
                { ...envelope("chase"), currency: "USD", initialBalance: 0, initialBalanceDate: 0, name: "Chase" },
            ],
            appMeta: [
                { key: "timeZone", value: "America/Caracas" },
                { key: "currency", value: "USD" },
            ],
            budgets: [],
            categories: [
                {
                    ...envelope("subs"),
                    color: "#000",
                    emoji: null,
                    icon: null,
                    income: false,
                    name: "Subscriptions",
                    parentId: null,
                    sortOrder: 0,
                },
            ],
            exchangeRates: [],
            installmentPlans: [],
            installments: [],
            mainBudget: [],
            outsideMoves: [],
            outsidePayments: [],
            savingsGoals: [],
            transactions,
            transfers: [],
        } as unknown as LedgerBooks,
        now
    );

const modelOf = (ledger: ReturnType<typeof ledgerWith>, book: RecurringBook = EMPTY_RECURRING) =>
    recurringModel(ledger, book, (seed) => seed.note);

/** The ledger after `rows` land, the way the local copy applies a commit. */
function applied(ledger: ReturnType<typeof ledgerWith>, rows: readonly CommitRow[], now = NOW) {
    const byId = new Map(ledger.books.transactions.map((row) => [row.localId, row as Record<string, unknown>]));
    for (const row of rows) {
        byId.set(row.localId, {
            ...byId.get(row.localId),
            ...envelope(row.localId),
            ...row.fields,
            deletedAt: row.deletedAt,
        });
    }
    return ledgerWith(
        [...byId.values()].filter((row) => row.deletedAt === null),
        now
    );
}

describe("stepWall", () => {
    it("brings a chain anchored on the 31st back to the 31st after February clamps it", () => {
        const feb = stepWall(Date.UTC(2027, 0, 31, 12), RECURRING_TYPE.monthly, 1, 31);
        expect(new Date(feb ?? 0).toISOString()).toBe("2027-02-28T12:00:00.000Z");
        const mar = stepWall(feb ?? 0, RECURRING_TYPE.monthly, 1, 31);
        expect(new Date(mar ?? 0).toISOString()).toBe("2027-03-31T12:00:00.000Z");
    });
});

describe("recurringModel", () => {
    it("files a late-night charge on the ledger's day, not UTC's", () => {
        // 22:30 on Oct 7 in Caracas is already Oct 8 in UTC.
        const ledger = ledgerWith([doc("gym", "2026-10-08T02:30:00Z", monthly)]);
        const [gym] = modelOf(ledger).schedules;
        expect(gym?.due.map((charge) => charge.day)).toEqual(["2026-11-07"]);
        expect(gym?.next?.day).toBe("2026-12-07");
    });

    it("reads a carrier still ahead as the pending charge, with nothing due", () => {
        const ledger = ledgerWith([doc("rent", "2026-11-20T16:00:00Z", monthly)]);
        const [rent] = modelOf(ledger).schedules;
        expect(rent?.due).toEqual([]);
        expect(rent?.next?.day).toBe("2026-11-20");
    });

    it("groups due charges as missed and the rest by when they land", () => {
        const ledger = ledgerWith([
            doc("tmo", "2026-09-25T18:00:00Z", monthly),
            doc("gym", "2026-10-08T15:30:00Z", { ...monthly, note: "Gym" }),
        ]);
        const rows = upcomingOf(modelOf(ledger), ledger);
        expect(rows.map((row) => [row.schedule.name, row.charge.day, row.group])).toEqual([
            ["T-Mobile", "2026-10-25", "missed"],
            ["Gym", "2026-11-08", "today"],
            ["T-Mobile", "2026-11-25", "month:2026-11"],
            ["Gym", "2026-12-08", "month:2026-12"],
        ]);
    });

    it("spots a monthly charge nobody marked and skips one with a drifting amount", () => {
        const netflix = ["2026-07-22", "2026-08-22", "2026-09-22", "2026-10-22"].map((day, index) =>
            doc(`n${index}`, `${day}T16:00:00Z`, { amount: 25.8, amountUsd: 25.8, note: "Netflix" })
        );
        const cafe = ["2026-08-03", "2026-09-03", "2026-10-03"].map((day, index) =>
            doc(`c${index}`, `${day}T16:00:00Z`, { amount: [4, 12, 30][index], note: "Cafe" })
        );
        const [candidate, ...rest] = modelOf(ledgerWith([...netflix, ...cafe])).candidates;
        expect(rest).toEqual([]);
        expect(candidate).toMatchObject({ every: 1, name: "Netflix", type: RECURRING_TYPE.monthly });
        expect(candidate?.next.day).toBe("2026-11-22");
    });

    it("does not suggest a merchant that already has a schedule", () => {
        const past = ["2026-08-25", "2026-09-25"].map((day, index) => doc(`t${index}`, `${day}T18:00:00Z`));
        const ledger = ledgerWith([...past, doc("tmo", "2026-10-25T18:00:00Z", monthly)]);
        expect(modelOf(ledger).candidates).toEqual([]);
    });
});

describe("recurring writes", () => {
    it("logs a missed charge under the id native's back-fill derives, and hands it the chain", () => {
        const ledger = ledgerWith([doc("tmo", "2026-09-25T18:00:00Z", monthly)]);
        const [tmo] = modelOf(ledger).schedules;
        const [missed] = tmo?.due ?? [];
        if (!tmo || !missed) {
            throw new Error("expected a missed charge");
        }
        const rows = loggedCharge(ledger, tmo, missed, { amount: 70 }, NOW);
        const logged = rows.find((row) => row.localId !== "tmo");
        expect(logged?.localId).toBe(occurrenceId("tmo", new Date("2026-10-25T18:00:00Z")));
        expect(logged?.fields).toMatchObject({ amount: 70, recurringType: RECURRING_TYPE.monthly });
        expect(rows.find((row) => row.localId === "tmo")?.fields).toMatchObject({ recurringType: 0 });

        const [after, ...others] = modelOf(applied(ledger, rows)).schedules;
        expect(others).toEqual([]);
        expect(after?.due).toEqual([]);
        expect(after?.next?.day).toBe("2026-11-25");
    });

    it("pauses until a date by writing the resuming charge, which takes over once the day comes", () => {
        const ledger = ledgerWith([doc("tmo", "2026-10-25T18:00:00Z", monthly)]);
        const [tmo] = modelOf(ledger).schedules;
        if (!tmo) {
            throw new Error("expected a schedule");
        }
        const outcome = pausedSchedule(ledger, tmo, "until", "2027-01-10", NOW);
        const book = outcome.book?.(EMPTY_RECURRING) ?? EMPTY_RECURRING;
        expect(book.paused[0]).toMatchObject({ resumes: "2027-01-25", since: "2026-11-08" });

        const paused = applied(ledger, outcome.rows);
        expect(modelOf(paused, book).schedules.map((schedule) => [schedule.state, schedule.next?.day])).toEqual([
            ["paused", "2027-01-25"],
        ]);
        expect(modelOf(paused, book).schedules[0]?.perMonth).toBe(0);

        const later = applied(paused, [], Date.parse("2027-01-26T15:00:00Z"));
        expect(modelOf(later, book).schedules.map((schedule) => schedule.state)).toEqual(["active"]);
    });

    it("resumes an open pause at the first charge after today", () => {
        const ledger = ledgerWith([doc("tmo", "2026-10-25T18:00:00Z", monthly)]);
        const [tmo] = modelOf(ledger).schedules;
        if (!tmo) {
            throw new Error("expected a schedule");
        }
        const pause = pausedSchedule(ledger, tmo, "open", "", NOW);
        const book = pause.book?.(EMPTY_RECURRING) ?? EMPTY_RECURRING;
        const later = Date.parse("2027-02-03T15:00:00Z");
        const paused = applied(ledger, pause.rows, later);
        const [held] = modelOf(paused, book).schedules;
        if (!held) {
            throw new Error("expected a paused schedule");
        }
        const resumed = resumedSchedule(paused, held, later);
        const next = applied(paused, resumed.rows, later);
        const [back] = modelOf(next, resumed.book?.(book) ?? book).schedules;
        expect(back?.state).toBe("active");
        expect(back?.due).toEqual([]);
        expect(back?.next?.day).toBe("2027-02-25");
    });

    it("resumes an open pause on the charge it withdrew when that charge is still ahead", () => {
        const ledger = ledgerWith([doc("tmo", "2026-11-25T18:00:00Z", monthly)]);
        const [tmo] = modelOf(ledger).schedules;
        if (!tmo) {
            throw new Error("expected a schedule");
        }
        const pause = pausedSchedule(ledger, tmo, "open", "", NOW);
        const book = pause.book?.(EMPTY_RECURRING) ?? EMPTY_RECURRING;
        const paused = applied(ledger, pause.rows);
        const [held] = modelOf(paused, book).schedules;
        if (!held) {
            throw new Error("expected a paused schedule");
        }
        const resumed = resumedSchedule(paused, held, NOW);
        const [back] = modelOf(applied(paused, resumed.rows), resumed.book?.(book) ?? book).schedules;
        expect(back?.next?.day).toBe("2026-11-25");
    });

    it("deletes a chain with its entries without handing the schedule to a successor", () => {
        const ledger = ledgerWith([
            doc("t0", "2026-09-25T18:00:00Z", { onceRecurring: true }),
            doc("tmo", "2026-10-25T18:00:00Z", monthly),
        ]);
        const [tmo] = modelOf(ledger).schedules;
        if (!tmo) {
            throw new Error("expected a schedule");
        }
        const { rows } = deletedSchedule(ledger, tmo, ["t0", "tmo"], NOW);
        expect(rows.map((row) => [row.localId, row.deletedAt])).toEqual([
            ["t0", NOW],
            ["tmo", NOW],
        ]);
        expect(modelOf(applied(ledger, rows)).schedules).toEqual([]);
    });

    it("stops a chain whose pending charge lands later today instead of handing it on", () => {
        const ledger = ledgerWith([doc("tmo", "2026-11-08T20:00:00Z", monthly)]);
        const [tmo] = modelOf(ledger).schedules;
        if (!tmo) {
            throw new Error("expected a schedule");
        }
        const { rows } = deletedSchedule(ledger, tmo, [], NOW);
        expect(modelOf(applied(ledger, rows)).schedules).toEqual([]);
    });

    it("keeps a chain on the 31st after an edit made while February clamps it", () => {
        const february = Date.parse("2027-02-10T15:00:00Z");
        const ledger = ledgerWith([doc("tmo", "2027-01-31T18:00:00Z", monthly)], february);
        const [tmo] = modelOf(ledger).schedules;
        if (!tmo?.next) {
            throw new Error("expected a next charge");
        }
        const draft = {
            accountId: "chase",
            amount: 65,
            categoryId: "subs",
            currency: "USD",
            date: tmo.next.at,
            endDate: null,
            every: 1,
            income: false,
            note: "T-Mobile Plus",
            type: RECURRING_TYPE.monthly,
        };
        const edited = applied(
            ledger,
            editedSchedule(ledger, tmo, draft, february).rows,
            Date.parse("2027-03-01T15:00:00Z")
        );
        expect(modelOf(edited).schedules.map((schedule) => schedule.next?.day)).toEqual(["2027-03-31"]);
    });

    it("undoes one pause without dropping a pause made after it", () => {
        const [tmo] = modelOf(ledgerWith([doc("tmo", "2026-10-25T18:00:00Z", monthly)])).schedules;
        if (!tmo) {
            throw new Error("expected a schedule");
        }
        const pause = (fromId: string) => ({ fromId, resumes: null, seed: tmo.seed, since: "2026-11-08", toId: null });
        const first = { dismissed: [], paused: [pause("a")] };
        const second = { dismissed: [], paused: [pause("a"), pause("b")] };
        expect(reverted(second, EMPTY_RECURRING, first).paused.map((each) => each.fromId)).toEqual(["b"]);
    });
});
