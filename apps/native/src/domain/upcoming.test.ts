import { RECURRING_TYPE } from "@outlayr/money/recurrence";
import { expect, test } from "vite-plus/test";

import { chargesInWeekAhead, groupByMonth } from "./upcoming";

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

test("counts every charge landing in the week ahead and none of the income", () => {
    const now = new Date("2026-10-27T10:00:00");
    const schedule = (amount: number, date: string, recurringType: number, extra = {}) => ({
        amount,
        date: new Date(date),
        income: false,
        recurringAnchorDay: null,
        recurringCoefficient: 1,
        recurringType,
        ...extra,
    });

    const charges = chargesInWeekAhead(
        [
            schedule(4, "2026-10-27T08:00:00", RECURRING_TYPE.daily),
            schedule(1, "2026-10-27T08:00:00", RECURRING_TYPE.daily, {
                recurringEndDate: new Date("2026-10-30T00:00:00"),
            }),
            schedule(25, "2026-10-21T09:00:00", RECURRING_TYPE.weekly),
            schedule(1200, "2026-10-01T09:00:00", RECURRING_TYPE.monthly),
            schedule(15.49, "2026-10-03T09:00:00", RECURRING_TYPE.monthly),
            schedule(3200, "2026-10-30T09:00:00", RECURRING_TYPE.monthly, { income: true }),
        ],
        now
    );

    expect(charges.map((charge) => charge.amount).toSorted((a, b) => a - b)).toStrictEqual([
        1, 1, 1, 4, 4, 4, 4, 4, 4, 25, 1200,
    ]);
    expect(charges.every((charge) => (charge.date?.getTime() ?? 0) < new Date("2026-11-03T00:00:00").getTime())).toBe(
        true
    );
});
