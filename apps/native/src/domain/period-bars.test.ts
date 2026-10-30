import { expect, test } from "vite-plus/test";

import { periodBars } from "./period-bars";

test("buckets a week by local day from the chosen first weekday", () => {
    const now = new Date("2026-10-27T10:00:00");
    const logged = [
        { amount: 9, date: new Date("2026-10-25T23:30:00") },
        { amount: 201, date: new Date("2026-10-26T00:10:00") },
        { amount: 4, date: new Date("2026-10-27T08:00:00") },
        { amount: 3, date: new Date("2026-10-27T09:00:00") },
    ];
    const due = [
        { amount: 25, date: new Date("2026-10-28T00:00:00") },
        { amount: 1200, date: new Date("2026-11-02T00:00:00") },
    ];

    const sunday = periodBars("week", now, 1, logged, due);
    const monday = periodBars("week", now, 2, logged, due);

    expect(sunday.map((bar) => [bar.day.getDate(), bar.amount, bar.due])).toStrictEqual([
        [25, 9, 0],
        [26, 201, 0],
        [27, 7, 0],
        [28, 0, 25],
        [29, 0, 0],
        [30, 0, 0],
        [31, 0, 0],
    ]);
    expect(monday.map((bar) => bar.day.getDate())).toStrictEqual([26, 27, 28, 29, 30, 31, 1]);
    expect(monday.reduce((sum, bar) => sum + bar.amount, 0)).toBe(208);
});

test("draws one bar per day of the month, leap February included", () => {
    const bars = periodBars(
        "month",
        new Date("2028-02-10T12:00:00"),
        1,
        [],
        [
            { amount: 15, date: new Date("2028-02-29T00:00:00") },
            { amount: 99, date: new Date("2028-03-01T00:00:00") },
        ]
    );

    expect(bars).toHaveLength(29);
    expect(bars.at(-1)?.due).toBe(15);
});
