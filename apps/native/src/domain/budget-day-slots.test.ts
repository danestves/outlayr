import type { ExpenseContribution } from "@outlayr/money/budget-spent";
import type { BudgetWindow } from "@outlayr/money/budget-window";
import { describe, expect, it } from "vite-plus/test";

import { CATALOGS, EN } from "@/i18n/catalog";
import type { TranslateFn } from "@/i18n/context";
import { translate } from "@/i18n/translate";

import { buildDaySlots, categoryMedian, dayVerdictSentence } from "./budget-day-slots";

const TODAY: BudgetWindow = {
    end: new Date(2026, 6, 26),
    start: new Date(2026, 6, 25),
};

const NOW = new Date(2026, 6, 25, 18, 30);

const COFFEE = "coffee";

function expense(
    day: number,
    amount: number,
    categoryId: string | null = COFFEE,
    parentId: string | null = null
): ExpenseContribution {
    return { amount, categoryId, date: new Date(2026, 6, day, 9), parentId };
}

const t: TranslateFn = (key, params) => translate(key, { catalog: EN, fallback: EN, params });
const tEs: TranslateFn = (key, params) => translate(key, { catalog: CATALOGS.es, fallback: EN, params });

describe("categoryMedian", () => {
    it("counts a subcategory's purchases as the parent's", () => {
        const rows = [expense(20, 8, "beans", COFFEE), expense(21, 12)];

        expect(categoryMedian(rows, COFFEE)).toBe(10);
    });

    it("has nothing to say without history", () => {
        expect(categoryMedian([expense(20, 10, "rent")], COFFEE)).toBeNull();
    });
});

describe("buildDaySlots", () => {
    it("lays today's purchases out at what they actually cost", () => {
        const rows = [expense(24, 6), expense(25, 4), expense(25, 9)];

        const slots = buildDaySlots(rows, {
            categoryId: COFFEE,
            limit: 20,
            now: NOW,
            window: TODAY,
        });

        expect(slots.blocks.map((block) => [block.start, block.amount, block.over])).toStrictEqual([
            [0, 4, false],
            [4, 9, false],
        ]);
        expect(slots.spent).toBe(13);
        expect(slots.remaining).toBe(7);
    });

    it("offers a slot the width of the median when one more fits", () => {
        const rows = [expense(24, 6), expense(24, 6), expense(25, 5)];

        const slots = buildDaySlots(rows, {
            categoryId: COFFEE,
            limit: 20,
            now: NOW,
            window: TODAY,
        });

        expect(slots.median).toBe(6);
        expect(slots.ghost).toBe(6);
        expect(slots.roomFor).toBe(2);
        expect(slots.verdict).toBe("room");
        expect(dayVerdictSentence(slots, "Coffee", t)).toBe("Room for one more.");
    });

    it("withholds the slot when the next typical purchase would not fit", () => {
        const rows = [expense(24, 6), expense(24, 6), expense(25, 16)];

        const slots = buildDaySlots(rows, {
            categoryId: COFFEE,
            limit: 20,
            now: NOW,
            window: TODAY,
        });

        expect(slots.median).toBe(6);
        expect(slots.ghost).toBeNull();
        expect(slots.roomFor).toBe(0);
        expect(slots.verdict).toBe("tight");
        expect(dayVerdictSentence(slots, "Coffee", t)).toBe("Not enough for another.");
    });

    it("draws no slot at all with no history for the category", () => {
        const rows = [expense(25, 5, "rent")];

        const slots = buildDaySlots(rows, {
            categoryId: COFFEE,
            limit: 20,
            now: NOW,
            window: TODAY,
        });

        expect(slots.median).toBeNull();
        expect(slots.ghost).toBeNull();
        expect(slots.blocks).toStrictEqual([]);
        expect(slots.verdict).toBeNull();
        expect(dayVerdictSentence(slots, "Coffee", t)).toBeNull();
    });

    it("counts the purchases that landed past the limit", () => {
        const rows = [expense(25, 10), expense(25, 8), expense(25, 9)];

        const slots = buildDaySlots(rows, {
            categoryId: COFFEE,
            limit: 20,
            now: NOW,
            window: TODAY,
        });

        expect(slots.blocks.map((block) => block.over)).toStrictEqual([false, false, true]);
        expect(slots.overflow).toBe(1);
        expect(slots.remaining).toBe(-7);
        expect(slots.verdict).toBe("over");
        expect(dayVerdictSentence(slots, "Coffee", t)).toBe("One purchase too many in Coffee.");
    });

    it("names no category on the overall budget, in any language", () => {
        const rows = [expense(25, 10), expense(25, 8), expense(25, 9), expense(25, 9, "rent")];

        const slots = buildDaySlots(rows, { categoryId: null, limit: 20, now: NOW, window: TODAY });

        expect(slots.overflow).toBe(2);
        expect(dayVerdictSentence(slots, null, t)).toBe("2 purchases too many.");
        expect(dayVerdictSentence(slots, null, tEs)).toBe("2 gastos de más.");
    });

    it("spans past the limit so an overshoot stays on the bar", () => {
        const rows = [expense(25, 30)];

        const slots = buildDaySlots(rows, {
            categoryId: COFFEE,
            limit: 20,
            now: NOW,
            window: TODAY,
        });

        expect(slots.scale).toBe(30);
    });

    it("yields no blocks on a day nothing was bought", () => {
        const rows = [expense(23, 5), expense(24, 7)];

        const slots = buildDaySlots(rows, {
            categoryId: COFFEE,
            limit: 20,
            now: NOW,
            window: TODAY,
        });

        expect(slots.blocks).toStrictEqual([]);
        expect(slots.spent).toBe(0);
        expect(slots.ghost).toBe(6);
        expect(slots.scale).toBe(20);
    });

    it("ignores purchases that have not happened yet", () => {
        const rows = [
            {
                amount: 5,
                categoryId: COFFEE,
                date: new Date(2026, 6, 25, 21),
                parentId: null,
            },
        ];

        const slots = buildDaySlots(rows, {
            categoryId: COFFEE,
            limit: 20,
            now: NOW,
            window: TODAY,
        });

        expect(slots.blocks).toStrictEqual([]);
    });
});
