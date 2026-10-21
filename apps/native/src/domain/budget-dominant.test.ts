import { describe, expect, it } from "@jest/globals";
import type { ExpenseContribution } from "@outlayr/money/budget-spent";

import { dominantCategory } from "./budget-dominant";

const WINDOW = { end: new Date("2026-08-31T23:59:59Z"), start: new Date("2026-08-01T00:00:00Z") };
const END_MS = WINDOW.end.getTime();

function spend(amount: number, day: string, categoryId: string | null, parentId: string | null = null) {
    return { amount, categoryId, date: new Date(day), parentId } satisfies ExpenseContribution;
}

describe("dominantCategory", () => {
    it("returns the category with the largest share", () => {
        const rows = [spend(80, "2026-08-02T10:00:00Z", "groceries"), spend(20, "2026-08-03T10:00:00Z", "transport")];
        expect(dominantCategory(rows, WINDOW, END_MS)).toStrictEqual({ categoryId: "groceries", share: 0.8 });
    });

    it("rolls a subcategory up to its parent", () => {
        const rows = [
            spend(30, "2026-08-02T10:00:00Z", "produce", "groceries"),
            spend(30, "2026-08-03T10:00:00Z", "dairy", "groceries"),
            spend(40, "2026-08-04T10:00:00Z", "transport"),
        ];
        expect(dominantCategory(rows, WINDOW, END_MS)).toStrictEqual({ categoryId: "groceries", share: 0.6 });
    });

    it("ignores spend outside the window", () => {
        const rows = [spend(500, "2026-07-20T10:00:00Z", "rent"), spend(10, "2026-08-02T10:00:00Z", "groceries")];
        expect(dominantCategory(rows, WINDOW, END_MS)).toStrictEqual({ categoryId: "groceries", share: 1 });
    });

    it("counts uncategorised spend in the total but never returns it", () => {
        const rows = [spend(50, "2026-08-02T10:00:00Z", null), spend(50, "2026-08-03T10:00:00Z", "groceries")];
        expect(dominantCategory(rows, WINDOW, END_MS)).toStrictEqual({ categoryId: "groceries", share: 0.5 });
    });

    it("returns null when the window has no spend", () => {
        expect(dominantCategory([], WINDOW, END_MS)).toBeNull();
        expect(dominantCategory([spend(40, "2026-07-01T10:00:00Z", "rent")], WINDOW, END_MS)).toBeNull();
    });

    it("returns null when every entry in the window is uncategorised", () => {
        expect(dominantCategory([spend(40, "2026-08-02T10:00:00Z", null)], WINDOW, END_MS)).toBeNull();
    });
});
