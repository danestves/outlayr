import { execFileSync } from "node:child_process";
import { join } from "node:path";

import type { ExpenseContribution } from "@outlayr/money/budget-spent";
import type { BudgetWindow } from "@outlayr/money/budget-window";
import { describe, expect, it } from "vite-plus/test";

import {
    buildAnswers,
    cumulativeByDay,
    forecastSpend,
    headlineKind,
    MAX_CARDS,
    periodProgress,
    stayUnder,
} from "./insights-answers";
import type { AnswerInput } from "./insights-answers";

const d = (y: number, m: number, day: number, h = 12): Date => new Date(y, m - 1, day, h, 0, 0, 0);

const month = (m: number, firstDay = 1): BudgetWindow => ({
    end: d(2025, m + 1, firstDay, 0),
    start: d(2025, m, firstDay, 0),
});

const JULY = month(7);
const PRIOR = [6, 5, 4, 3, 2, 1].map((m) => month(m));

function row(date: Date, amount: number, categoryId: string | null = null): ExpenseContribution {
    return { amount, categoryId, date, parentId: null };
}

function history(categoryId: string, usual: number): ExpenseContribution[] {
    return PRIOR.map((window) =>
        row(new Date(window.start.getFullYear(), window.start.getMonth(), 3, 12), usual, categoryId)
    );
}

function steadyRent(): ExpenseContribution[] {
    return [...history("rent", 500), row(d(2025, 7, 3), 500, "rent")];
}

function input(overrides: Partial<AnswerInput>): AnswerInput {
    const now = d(2025, 7, 10);
    return {
        categoryLimits: [],
        limit: null,
        prior: PRIOR,
        rows: [],
        progress: periodProgress(JULY, now, false),
        subscriptions: null,
        ...overrides,
    };
}

describe("periodProgress", () => {
    it("counts the first day as one elapsed day", () => {
        expect(periodProgress(JULY, d(2025, 7, 1, 0), false)).toMatchObject({ days: 31, elapsed: 1 });
    });

    it("counts the last day as the whole period", () => {
        expect(periodProgress(JULY, d(2025, 7, 31, 23), false)).toMatchObject({ days: 31, elapsed: 31 });
    });

    it("runs a custom first day of month across the month change", () => {
        const window = { end: d(2025, 11, 15, 0), start: d(2025, 10, 15, 0) };
        expect(periodProgress(window, d(2025, 10, 15, 8), false)).toMatchObject({ days: 31, elapsed: 1 });
        expect(periodProgress(window, d(2025, 11, 14, 8), false)).toMatchObject({ days: 31, elapsed: 31 });
    });

    it("reads a closed period as fully elapsed", () => {
        expect(periodProgress(month(5), d(2025, 7, 10), true)).toMatchObject({ days: 31, elapsed: 31 });
    });
});

describe("across a spring-forward", () => {
    function inMadrid(): { cumulative: number[]; days: number; elapsed: number } {
        const probe = join(import.meta.dirname, "dst-probe.ts");
        const args = ["answers-pace", 2025, 2, 1, 0, 0, 2025, 3, 1, 0, 0, 2025, 2, 31, 0, 30].map(String);
        return JSON.parse(
            execFileSync(process.execPath, ["--import", "tsx", probe, ...args], {
                encoding: "utf-8",
                env: { ...process.env, TZ: "Europe/Madrid" },
            })
        );
    }

    it("keeps the day counts whole and files each purchase under its own day", () => {
        const { cumulative, days, elapsed } = inMadrid();
        expect({ days, elapsed, length: cumulative.length }).toStrictEqual({ days: 31, elapsed: 31, length: 31 });
        expect([cumulative[0], cumulative[2], cumulative[28], cumulative[29], cumulative[30]]).toStrictEqual([
            6, 18, 18, 24, 30,
        ]);
    });
});

describe("forecastSpend", () => {
    it("projects the daily rate over the whole period", () => {
        expect(forecastSpend(1213.1, { days: 30, elapsed: 18 })).toBeCloseTo(2021.83, 2);
    });

    it("is the day's spend times the period on the first day", () => {
        expect(forecastSpend(40, { days: 30, elapsed: 1 })).toBe(1200);
    });

    it("is what was spent on the last day", () => {
        expect(forecastSpend(900, { days: 30, elapsed: 30 })).toBe(900);
    });
});

describe("stayUnder", () => {
    it("spreads what is left over the days left, today included", () => {
        expect(stayUnder(1800, 1200, JULY, d(2025, 7, 20, 9))).toStrictEqual({ kind: "perDay", perDay: 50 });
    });

    it("allows the whole remainder on the last day", () => {
        expect(stayUnder(1800, 1700, JULY, d(2025, 7, 31, 9))).toStrictEqual({ kind: "perDay", perDay: 100 });
    });

    it("splits over the full month on its first day", () => {
        expect(stayUnder(3100, 0, JULY, d(2025, 7, 1, 0))).toStrictEqual({ kind: "perDay", perDay: 100 });
    });

    it("reports how far over once the limit is passed", () => {
        expect(stayUnder(1800, 1900, JULY, d(2025, 7, 20))).toStrictEqual({ kind: "over", over: 100 });
    });

    it("says nothing when the limit is met exactly", () => {
        expect(stayUnder(1800, 1800, JULY, d(2025, 7, 20))).toStrictEqual({ kind: "none" });
    });

    it("counts days left to a custom month end", () => {
        const window = { end: d(2025, 11, 15, 0), start: d(2025, 10, 15, 0) };
        expect(stayUnder(100, 0, window, d(2025, 11, 4))).toStrictEqual({ kind: "perDay", perDay: 100 / 11 });
    });
});

describe("headlineKind", () => {
    const base = { closed: false, forecast: 0, limit: null, spent: 0, usualByNow: null };

    it("calls a forecast over the limit faster than usual", () => {
        expect(headlineKind({ ...base, forecast: 2020, limit: 1800 })).toBe("faster");
    });

    it("calls a forecast that lands exactly on the limit on track", () => {
        expect(headlineKind({ ...base, forecast: 1800, limit: 1800 })).toBe("onTrack");
    });

    it("calls a forecast well under the limit less than usual", () => {
        expect(headlineKind({ ...base, forecast: 1530, limit: 1800 })).toBe("less");
        expect(headlineKind({ ...base, forecast: 1531, limit: 1800 })).toBe("onTrack");
    });

    it("compares with the usual by now when there is no limit", () => {
        expect(headlineKind({ ...base, spent: 111, usualByNow: 100 })).toBe("faster");
        expect(headlineKind({ ...base, spent: 89, usualByNow: 100 })).toBe("less");
        expect(headlineKind({ ...base, spent: 105, usualByNow: 100 })).toBe("asUsual");
    });

    it("only reports the total with no limit and no usual", () => {
        expect(headlineKind({ ...base, spent: 500 })).toBe("soFar");
    });

    it("never forecasts a closed period", () => {
        expect(headlineKind({ ...base, closed: true, forecast: 9000, limit: 100 })).toBe("past");
    });
});

describe("buildAnswers", () => {
    it("measures usual up to the same day, not over the whole prior month", () => {
        const rows = [
            ...history("food", 10),
            ...PRIOR.map((window) =>
                row(new Date(window.start.getFullYear(), window.start.getMonth(), 20, 12), 90, "food")
            ),
            row(d(2025, 7, 5), 40, "food"),
        ];
        const answers = buildAnswers(input({ rows }));
        expect(answers.usualByNow).toBe(10);
        expect(answers.cards).toMatchObject([{ categoryId: "food", kind: "vsUsual", spent: 40, usual: 10 }]);
    });

    it("needs three complete prior periods before it compares", () => {
        const rows = [...history("food", 10).slice(0, 2), row(d(2025, 7, 5), 400, "food")];
        const answers = buildAnswers(input({ rows }));
        expect(answers.usualByNow).toBeNull();
        expect(answers.headline).toBe("soFar");
        expect(answers.cards).toStrictEqual([]);
    });

    it("leaves out the period that holds the first expense, which is only partly lived", () => {
        const rows = [
            row(d(2025, 4, 20), 10, "food"),
            row(d(2025, 5, 3), 10, "food"),
            row(d(2025, 6, 3), 10, "food"),
            row(d(2025, 7, 5), 400, "food"),
        ];
        expect(buildAnswers(input({ rows })).usualByNow).toBeNull();
    });

    it("ignores a category within 20% of its usual", () => {
        const rows = [...history("food", 10), ...steadyRent(), row(d(2025, 7, 5), 11, "food")];
        expect(buildAnswers(input({ rows })).cards).toStrictEqual([]);
    });

    it("ignores a category that moved less than 5% of the usual total", () => {
        const rows = [...history("tea", 10), ...steadyRent(), row(d(2025, 7, 5), 20, "tea")];
        expect(buildAnswers(input({ rows })).cards).toStrictEqual([]);
    });

    it("ignores a category used in fewer than three prior periods", () => {
        const rows = [...steadyRent(), ...history("gym", 100).slice(0, 2), row(d(2025, 7, 5), 600, "gym")];
        expect(buildAnswers(input({ rows })).cards).toStrictEqual([]);
    });

    it("reports a category under its usual when nothing was spent yet", () => {
        const rows = [...history("food", 56), ...steadyRent()];
        const [card] = buildAnswers(input({ rows })).cards;
        expect(card).toMatchObject({ categoryId: "food", kind: "vsUsual", spent: 0, usual: 56 });
    });

    it("keeps the three largest dollar impacts, whatever their kind", () => {
        const rows = [
            ...["a", "b", "c", "d"].flatMap((id) => history(id, 10)),
            row(d(2025, 7, 5), 40, "a"),
            row(d(2025, 7, 5), 60, "b"),
            row(d(2025, 7, 5), 50, "c"),
            row(d(2025, 7, 5), 70, "d"),
        ];
        const { cards } = buildAnswers(input({ rows, subscriptions: { count: 4, perMonth: 55 } }));
        expect(cards).toHaveLength(MAX_CARDS);
        expect(cards.map((card) => card.impact)).toStrictEqual([60, 55, 50]);
        expect(cards.map((card) => card.kind)).toStrictEqual(["vsUsual", "subscriptions", "vsUsual"]);
    });

    it("shows a subscriptions card only when there is a subscription", () => {
        expect(buildAnswers(input({ subscriptions: { count: 0, perMonth: 0 } })).cards).toStrictEqual([]);
    });

    it("reports a category over its limit with six periods of bars ending in the current one", () => {
        const rows = [
            ...[100, 90, 110, 130, 80, 70].map((amount, index) => row(d(2025, 6 - index, 3), amount, "shop")),
            row(d(2025, 7, 5), 143.28, "shop"),
        ];
        const { cards } = buildAnswers(input({ categoryLimits: [{ categoryId: "shop", limit: 120 }], rows }));
        expect(cards).toHaveLength(1);
        expect(cards[0]).toMatchObject({
            bars: [80, 130, 110, 90, 100, 143.28],
            categoryId: "shop",
            kind: "overLimit",
            limit: 120,
            spent: 143.28,
        });
        expect(cards[0].impact).toBeCloseTo(23.28, 2);
    });

    it("leaves a category under its limit out of the usual comparison too", () => {
        const rows = [...history("shop", 10), ...steadyRent(), row(d(2025, 7, 5), 90, "shop")];
        const { cards } = buildAnswers(input({ categoryLimits: [{ categoryId: "shop", limit: 120 }], rows }));
        expect(cards).toStrictEqual([]);
    });

    it("forecasts nothing for a closed period and fills the whole line", () => {
        const now = d(2025, 7, 10);
        const answers = buildAnswers(
            input({
                prior: PRIOR.slice(1),
                rows: [row(d(2025, 6, 4), 30), row(d(2025, 6, 28), 20)],
                progress: periodProgress(month(6), now, true),
            })
        );
        expect(answers.forecast).toBeNull();
        expect(answers.headline).toBe("past");
        expect(answers.cumulative).toHaveLength(30);
        expect(answers.cumulative.at(-1)).toBe(50);
        expect(answers.spent).toBe(50);
    });
});

describe("cumulativeByDay", () => {
    it("runs the total up to today and no further", () => {
        const progress = periodProgress(JULY, d(2025, 7, 3), false);
        expect(
            cumulativeByDay([row(d(2025, 7, 1), 5), row(d(2025, 7, 3), 7), row(d(2025, 6, 30), 99)], progress)
        ).toStrictEqual([5, 5, 12]);
    });
});
