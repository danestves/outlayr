import { describe, expect, it } from "vite-plus/test";

import { firstShortRun, monthKey, monthKeyAt, monthKeyWindow, projectYear, trimEffect } from "./year-plan";
import type { PlanFlow, YearPlanInput } from "./year-plan";

const flow = (categoryId: string, amount: number, year: number, month: number, day: number): PlanFlow => ({
    amount,
    categoryId,
    date: new Date(year, month, day, 12),
    income: categoryId === "salary",
});

// Six closed months of the same shape set every category's typical month before 2027 opens.
const history: PlanFlow[] = [];
for (let index = 0; index < 6; index += 1) {
    const at = new Date(2026, 8 + index, 1);
    history.push(
        flow("salary", 2400, at.getFullYear(), at.getMonth(), 15),
        flow("rent", 550, at.getFullYear(), at.getMonth(), 1),
        flow("groceries", 400, at.getFullYear(), at.getMonth(), 10),
        flow("dining", 250, at.getFullYear(), at.getMonth(), 12)
    );
}

const input: YearPlanInput = {
    budgets: new Map([["groceries", 420]]),
    categories: [
        { id: "salary", income: true },
        { id: "rent", income: false },
        { id: "groceries", income: false },
        { id: "dining", income: false },
        { id: "card", income: false },
    ],
    firstDayOfMonth: 1,
    flows: [
        ...history,
        flow("salary", 2400, 2027, 2, 15),
        flow("rent", 550, 2027, 2, 1),
        flow("groceries", 236, 2027, 2, 10),
        flow("dining", 164, 2027, 2, 12),
    ],
    goals: [{ id: "fund", perMonth: 300, throughKey: monthKey(2027, 11) }],
    now: new Date(2027, 2, 18, 12),
    plans: new Map(),
    scheduled: [
        flow("card", 1000, 2027, 2, 20),
        flow("card", 1000, 2027, 3, 20),
        flow("card", 1000, 2027, 4, 20),
        flow("card", 210, 2027, 5, 20),
    ],
    year: 2027,
};

describe("month keys", () => {
    it("runs a month anchored on the 15th to the 15th of the next", () => {
        const window = monthKeyWindow(monthKey(2027, 2), 15);
        expect(window.start).toStrictEqual(new Date(2027, 2, 15));
        expect(window.end).toStrictEqual(new Date(2027, 3, 15));
        expect(monthKeyAt(new Date(2027, 2, 10), 15)).toBe(monthKey(2027, 1));
        expect(monthKey(2027, 12)).toBe(202_801);
    });
});

describe("projectYear", () => {
    const projection = projectYear(input);
    const [january, , march, april, , june] = projection.months;

    it("counts what was logged in a closed month and nothing set aside", () => {
        expect(january.status).toBe("closed");
        expect(january.in).toBe(2400);
        expect(january.out).toBe(1200);
        expect(january.left).toBe(1200);
    });

    it("holds the running month to the larger of logged and planned, and charges the goal", () => {
        expect(march.status).toBe("current");
        const byId = new Map(march.categories.map((entry) => [entry.categoryId, entry]));
        expect(byId.get("groceries")).toMatchObject({ actual: 236, planned: 420, projected: 420, source: "budget" });
        expect(byId.get("dining")).toMatchObject({ actual: 164, planned: 250, projected: 250, source: "typical" });
        expect(byId.get("card")).toMatchObject({ planned: 1000, projected: 1000, source: "scheduled" });
        expect(march.setAside).toBe(300);
        expect(march.left).toBe(2400 - 550 - 420 - 250 - 1000 - 300);
    });

    it("plans months ahead from the schedule, the budget and the typical month", () => {
        expect(april.left).toBe(-120);
        expect(june.left).toBe(2400 - 550 - 420 - 250 - 210 - 300);
        expect(projection.monthsAhead).toBe(10);
        expect(projection.unassigned).toBe(projection.months.reduce((sum, month) => sum + month.left, 0));
    });

    it("lets a plan row win over the budget", () => {
        const planned = projectYear({ ...input, plans: new Map([["groceries", new Map([[monthKey(2027, 3), 300]])]]) });
        expect(planned.months[3].categories.find((entry) => entry.categoryId === "groceries")).toMatchObject({
            planned: 300,
            source: "plan",
        });
    });

    it("names the short run, what drives it and when it ends", () => {
        expect(firstShortRun(projection)).toStrictEqual({
            backIn: monthKey(2027, 5),
            driver: "card",
            from: monthKey(2027, 2),
            to: monthKey(2027, 4),
        });
    });
});

describe("trimEffect", () => {
    it("fixes the months ahead but not a running month already spent past the new amount", () => {
        const before = projectYear(input);
        const effect = trimEffect(input, before, "dining", 100, monthKey(2027, 2), monthKey(2027, 4));
        expect(effect.fixed).toStrictEqual([monthKey(2027, 3), monthKey(2027, 4)]);
        expect(effect.stillShort).toStrictEqual({ by: 34, key: monthKey(2027, 2), spent: 164 });
        expect(effect.freed).toBe(86 + 150 + 150);
    });
});
