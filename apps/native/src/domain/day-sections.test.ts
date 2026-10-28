import { buildRateTable } from "@outlayr/money/valuation";
import { describe, expect, it } from "vite-plus/test";

import { capAtDayEnd, groupByDay, groupByDayAsItGrows, joinDaySections } from "./day-sections";

function row(day: string, amount: number, income = false) {
    return { amount, day: new Date(`${day}T00:00:00`), income };
}

describe("groupByDay", () => {
    it("subtracts expense and adds income into the day total", () => {
        const sections = groupByDay([row("2026-07-24", 40), row("2026-07-24", 15, true)]);
        expect(sections[0].total).toBe(-25);
    });

    it("orders sections newest first", () => {
        const sections = groupByDay([row("2026-07-23", 20), row("2026-07-24", 10), row("2026-07-21", 30)]);
        expect(sections.map((section) => section.day.getDate())).toStrictEqual([24, 23, 21]);
    });

    it("keeps a day's key when a newer day is added above it", () => {
        const before = groupByDay([row("2026-07-23", 20)]);
        const after = groupByDay([row("2026-07-24", 10), row("2026-07-23", 20)]);
        expect(after[1].key).toBe(before[0].key);
        expect(after[0].key).not.toBe(after[1].key);
    });

    it("merges a day that reappears later without opening a second section", () => {
        // The budget query orders by `date`, not `day`, so an out-of-order row must
        // still land in its own day rather than splitting the section in two.
        const sections = groupByDay([row("2026-07-24", 10), row("2026-07-23", 20), row("2026-07-24", 5)]);
        expect(sections).toHaveLength(2);
        expect(sections[0].data).toHaveLength(2);
        expect(sections[0].total).toBe(-15);
        expect(sections[1].total).toBe(-20);
    });

    it("merges a day saved under two time zones into one section, newest first", () => {
        const midnight = new Date("2026-09-09T00:00:00");
        const early = {
            amount: 7,
            date: new Date("2026-09-09T02:47:00"),
            day: new Date("2026-09-09T01:00:00"),
            income: false,
        };
        const late = { amount: 8, date: new Date("2026-09-09T22:09:00"), day: midnight, income: false };
        const sections = groupByDay([early, late]);
        expect(sections).toHaveLength(1);
        expect(sections[0].day.getTime()).toBe(midnight.getTime());
        expect(sections[0].data).toStrictEqual([late, early]);
    });

    it("buckets a day's total per currency rather than adding two together", () => {
        const [section] = groupByDay(
            [{ ...row("2026-07-24", 40) }, { ...row("2026-07-24", 10), currency: "EUR" }],
            "USD"
        );
        expect(section.totals.map((bucket) => [bucket.currencyCode, bucket.amount])).toStrictEqual([
            ["USD", -40],
            ["EUR", -10],
        ]);
    });

    it("folds a card fee onto its purchase and keeps it in the day total", () => {
        const purchase = { ...row("2026-07-24", 10), id: "glovo" };
        const fee = { ...row("2026-07-24", 0.44), feeForId: "glovo", id: "fee" };
        const orphan = { ...row("2026-07-24", 0.1), feeForId: "elsewhere", id: "orphan" };
        const [section] = groupByDay([purchase, fee, orphan]);
        expect(section.data).toStrictEqual([{ ...purchase, fees: [fee] }, orphan]);
        expect(section.total).toBeCloseTo(-10.54);
    });
});

const eurRates = buildRateTable([{ date: "2026-07-01", quote: "EUR", rate: 0.9 }]);

describe("groupByDay with rates", () => {
    it("reads a mixed-currency day as one figure in the global currency", () => {
        const [section] = groupByDay(
            [
                { ...row("2026-07-24", 40), currency: "EUR" },
                {
                    ...row("2026-07-24", 10),
                    amountUsd: 10,
                    currency: "USD",
                    date: new Date(Date.UTC(2026, 6, 24, 12)),
                },
            ],
            "EUR",
            eurRates
        );
        expect(section.totals.map((bucket) => [bucket.currencyCode, bucket.amount])).toStrictEqual([["EUR", -49]]);
    });

    it("keeps `total` equal to the sum of the buckets it prints", () => {
        // The header renders `totals`, the section total renders `total`. They are
        // derived figures of the same rows and a user can see both at once.
        const [section] = groupByDay(
            [
                {
                    ...row("2026-07-24", 0.1),
                    amountUsd: 0.1,
                    currency: "USD",
                    date: new Date(Date.UTC(2026, 6, 24, 12)),
                },
                {
                    ...row("2026-07-24", 0.1),
                    amountUsd: 0.1,
                    currency: "USD",
                    date: new Date(Date.UTC(2026, 6, 24, 12)),
                },
                {
                    ...row("2026-07-24", 0.1),
                    amountUsd: 0.1,
                    currency: "USD",
                    date: new Date(Date.UTC(2026, 6, 24, 12)),
                },
            ],
            "EUR",
            eurRates
        );
        let summed = 0;
        for (const bucket of section.totals) {
            summed += bucket.amount;
        }
        expect(section.total).toBe(summed);
        expect(section.total).toBe(-0.27);
    });

    it("hands each row its share of the header, so the rows add up to it to the cent", () => {
        // Converted one at a time, these three come to 0.30 under a 0.29 header.
        const rows = [1, 2, 3].map((n) => ({
            ...row("2026-07-24", 100 * n),
            amountUsd: 0.1,
            currency: "VES",
            date: new Date(Date.UTC(2026, 6, 24, 12)),
        }));
        const [section] = groupByDay(rows, "EUR", buildRateTable([{ date: "2026-07-01", quote: "EUR", rate: 0.95 }]));
        const summed = section.data.reduce((sum, entry) => sum + (entry.valued ?? 0), 0);
        expect(summed).toBeCloseTo(-section.total, 10);
    });

    it("leaves a row no rate reaches unvalued rather than passing its own amount off as the list's", () => {
        const [section] = groupByDay(
            [
                {
                    ...row("2026-06-24", 22_000),
                    amountUsd: 25,
                    currency: "VES",
                    date: new Date(Date.UTC(2026, 5, 24, 12)),
                },
            ],
            "EUR",
            eurRates
        );
        expect(section.data[0].valued).toBeNull();
    });
});

describe("capAtDayEnd", () => {
    // Newest first, as the Insights list reads them: three on the 24th, three on the 23rd, two on the 22nd.
    const rows = [
        ...[1, 2, 3].map(() => row("2026-07-24", 1)),
        ...[1, 2, 3].map(() => row("2026-07-23", 1)),
        ...[1, 2].map(() => row("2026-07-22", 1)),
    ];

    it("runs a cut that lands inside a day on to that day's end, so its header totals the whole day", () => {
        expect(capAtDayEnd(rows, 4)).toBe(6);
    });

    it("stops at the cap when the cap already ends a day", () => {
        expect(capAtDayEnd(rows, 3)).toBe(3);
    });

    it("keeps every row when there are no more than the cap", () => {
        expect(capAtDayEnd(rows, 8)).toBe(8);
        expect(capAtDayEnd(rows, 50)).toBe(8);
    });

    it("reads the day off the row's instant, as the sections do, not its stored day", () => {
        const late = {
            amount: 1,
            date: new Date("2026-09-09T22:09:00"),
            day: new Date("2026-09-09T00:00:00"),
            income: false,
        };
        const early = {
            amount: 1,
            date: new Date("2026-09-09T02:47:00"),
            // Sep 9's midnight saved an hour east, which is still Sep 8 here.
            day: new Date("2026-09-08T23:00:00"),
            income: false,
        };
        expect(capAtDayEnd([late, early, row("2026-09-08", 1)], 1)).toBe(2);
    });
});

describe("joinDaySections", () => {
    it("groups both halves together when a zone change puts one day in each", () => {
        const newer = [row("2026-07-24", 10), row("2026-07-23", 20)];
        const older = [row("2026-07-23", 5), row("2026-07-22", 30)];
        const joined = joinDaySections(groupByDay(newer), groupByDay(older), () => groupByDay([...newer, ...older]));
        expect(joined.map((section) => section.total)).toStrictEqual([-10, -25, -30]);
    });
});

describe("groupByDayAsItGrows", () => {
    const totals = (sections: { total: number }[]) => sections.map((section) => section.total);

    it("groups only the older rows a list grows by, and all of them once a held row changes", () => {
        const group = groupByDayAsItGrows<ReturnType<typeof row>>("USD");
        const held = [row("2026-07-24", 10), row("2026-07-23", 20)];
        const [first] = group(held);

        const grown = group([...held, row("2026-07-22", 30)]);
        expect(grown[0]).toBe(first);
        expect(totals(grown)).toStrictEqual([-10, -20, -30]);

        expect(totals(group([row("2026-07-24", 15), held[1], row("2026-07-22", 30)]))).toStrictEqual([-15, -20, -30]);
    });

    it("keeps one section for a day the held and the added rows share", () => {
        const group = groupByDayAsItGrows<ReturnType<typeof row>>("USD");
        const held = [row("2026-07-24", 10), row("2026-07-23", 20)];
        group(held);
        expect(totals(group([...held, row("2026-07-23", 5), row("2026-07-22", 30)]))).toStrictEqual([-10, -25, -30]);
    });
});
