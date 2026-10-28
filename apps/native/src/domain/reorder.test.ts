import { describe, expect, it } from "vite-plus/test";

import { applyMove, moveItem, slotAt } from "./reorder";

describe("applyMove", () => {
    it("moves an item forward past its own removal point", () => {
        expect(applyMove(["a", "b", "c", "d"], [0], 3)).toStrictEqual(["b", "c", "a", "d"]);
    });

    it("moves an item backward without offset correction", () => {
        expect(applyMove(["a", "b", "c", "d"], [3], 1)).toStrictEqual(["a", "d", "b", "c"]);
    });

    it("moves multiple items as one block", () => {
        expect(applyMove(["a", "b", "c", "d"], [0, 1], 4)).toStrictEqual(["c", "d", "a", "b"]);
    });
});

describe("moveItem", () => {
    it("lands a forward move on the slot it was dropped on", () => {
        expect(moveItem(["a", "b", "c", "d"], 0, 2)).toStrictEqual(["b", "c", "a", "d"]);
    });

    it("returns a copy, leaving the input untouched", () => {
        const items = ["a", "b", "c"];
        const moved = moveItem(items, 0, 2);
        expect(items).toStrictEqual(["a", "b", "c"]);
        expect(moved).not.toBe(items);
    });

    it("ignores an index outside the list", () => {
        expect(moveItem(["a", "b"], 0, 2)).toStrictEqual(["a", "b"]);
        expect(moveItem(["a", "b"], -1, 0)).toStrictEqual(["a", "b"]);
    });
});

describe("slotAt", () => {
    it("crosses into the next slot once the row covers half of it", () => {
        expect(slotAt(27, 56, 4)).toBe(0);
        expect(slotAt(28, 56, 4)).toBe(1);
        expect(slotAt(-27, 56, 4)).toBe(0);
    });

    it("keeps a row dragged past either end inside the list", () => {
        expect(slotAt(-200, 56, 4)).toBe(0);
        expect(slotAt(1000, 56, 4)).toBe(3);
    });

    it("falls back to the first slot before a row has been measured", () => {
        expect(slotAt(120, 0, 4)).toBe(0);
        expect(slotAt(120, 56, 0)).toBe(0);
    });
});
