import { describe, expect, it } from "@jest/globals";

import { isBalanced, unallocated } from "./split";
import { addPart, isRealSplit, openDraft, removePart, setPartAmount, setPartCategory } from "./split-draft";

const TOTAL = 84;

describe("opening a split", () => {
    it("starts as the entry already reads: one part holding everything", () => {
        expect(openDraft(TOTAL, "groceries", 2)).toStrictEqual([{ amount: 84, categoryId: "groceries" }]);
    });

    it("is not yet a split, because one part says what the entry already says", () => {
        expect(isRealSplit(openDraft(TOTAL, "groceries", 2))).toBe(false);
    });
});

describe("adding a category", () => {
    it("leaves the amounts already typed alone", () => {
        const draft = addPart(openDraft(TOTAL, "groceries", 2), "home");
        expect(draft).toStrictEqual([
            { amount: 84, categoryId: "groceries" },
            { amount: 0, categoryId: "home" },
        ]);
    });

    it("counts as a split once there are two parts", () => {
        expect(isRealSplit(addPart(openDraft(TOTAL, "groceries", 2), "home"))).toBe(true);
    });
});

describe("typing an amount", () => {
    it("never shows a negative part when there is nothing left to take from", () => {
        let draft = addPart(addPart(openDraft(TOTAL, "groceries", 2), "home"), "pets");
        draft = setPartAmount(TOTAL, draft, 1, 24, 2);

        expect(draft.every((one) => one.amount >= 0)).toBe(true);
        expect(isBalanced(TOTAL, draft, 2)).toBe(false);
        expect(unallocated(TOTAL, draft, 2)).toBe(-24);
    });
});

describe("removing a category", () => {
    it("hands the freed amount to the last part left, so the draft stays saveable", () => {
        let draft = addPart(openDraft(TOTAL, "groceries", 2), "home");
        draft = setPartAmount(TOTAL, draft, 1, 34, 2);
        draft = addPart(draft, "pets");
        draft = setPartAmount(TOTAL, draft, 2, 10, 2);

        const without = removePart(draft, 1, 2);
        expect(without).toStrictEqual([
            { amount: 50, categoryId: "groceries" },
            { amount: 34, categoryId: "pets" },
        ]);
        expect(isBalanced(TOTAL, without, 2)).toBe(true);
    });

    it("ignores an index that is not there", () => {
        const draft = openDraft(TOTAL, "groceries", 2);
        expect(removePart(draft, 4, 2)).toStrictEqual(draft);
    });
});

describe("changing a part's category", () => {
    it("leaves every amount where it was", () => {
        const draft = setPartAmount(TOTAL, addPart(openDraft(TOTAL, "groceries", 2), "home"), 1, 34, 2);
        expect(setPartCategory(draft, 1, "pets")).toStrictEqual([
            { amount: 50, categoryId: "groceries" },
            { amount: 34, categoryId: "pets" },
        ]);
    });
});
