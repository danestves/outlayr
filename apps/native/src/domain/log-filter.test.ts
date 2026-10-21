import { describe, expect, it } from "@jest/globals";

import { filterDetail, filterHasMenu } from "./log-filter";

const CURSOR = new Date("2026-07-22T15:30:00");
const SCOPE = { cursor: CURSOR, income: false };

describe("filterHasMenu", () => {
    it("gives a menu to the filters with something to choose", () => {
        expect(filterHasMenu("month")).toBe(true);
        expect(filterHasMenu("category")).toBe(true);
        expect(filterHasMenu("type")).toBe(true);
    });

    it("withholds one from the filters that are just a label", () => {
        expect(filterHasMenu("recurring")).toBe(false);
    });
});

describe("filterDetail", () => {
    it("says nothing when no filter is active", () => {
        expect(filterDetail("all", SCOPE)).toBeNull();
    });

    it("names the span a period filter is pointed at", () => {
        expect(filterDetail("day", SCOPE)).toBe("22 Jul 2026");
        expect(filterDetail("week", { ...SCOPE, firstWeekday: 1 })).toBe("19 Jul – 25 Jul");
    });

    it("names the pinned category", () => {
        expect(filterDetail("category", { ...SCOPE, categoryName: "Groceries" })).toBe("Groceries");
    });

    it("falls back to the filter's own name before a category resolves", () => {
        expect(filterDetail("category", SCOPE)).toBe("by category");
        expect(filterDetail("category", { ...SCOPE, categoryName: "" })).toBe("by category");
    });

    it("names which side a type filter shows", () => {
        expect(filterDetail("type", SCOPE)).toBe("Expense");
        expect(filterDetail("type", { ...SCOPE, income: true })).toBe("Income");
    });
});
