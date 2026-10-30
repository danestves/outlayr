import { expect, test } from "vite-plus/test";

import { groupByMonth } from "./upcoming";

test("keeps the same month of different years apart", () => {
    const dates = [
        new Date("2026-02-27T09:00:00"),
        new Date("2026-02-28T23:30:00"),
        new Date("2027-02-14T09:00:00"),
        new Date("2027-03-01T00:15:00"),
    ];

    const groups = groupByMonth(dates, (date) => date);

    expect(groups.map(({ month, rows }) => [month.getFullYear(), month.getMonth(), rows.length])).toStrictEqual([
        [2026, 1, 2],
        [2027, 1, 1],
        [2027, 2, 1],
    ]);
});
