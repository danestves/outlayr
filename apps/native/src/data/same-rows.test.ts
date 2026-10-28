import { describe, expect, it } from "vite-plus/test";

import { sameRows } from "./same-rows";

const tags = () => [
    { id: "a", name: "Food", updatedAt: new Date(1000) },
    { id: "b", name: "Rent", updatedAt: new Date(2000) },
];

describe("sameRows", () => {
    it("treats a re-read of the same rows as unchanged, dates included", () => {
        expect(sameRows(tags(), tags())).toBe(true);
    });

    it("sees a change to only the date column of one row", () => {
        const next = tags();
        next[1] = { ...next[1], updatedAt: new Date(3000) };

        expect(sameRows(tags(), next)).toBe(false);
    });

    it("sees a row added after the held ones", () => {
        expect(sameRows(tags(), [...tags(), { id: "c", name: "Fun", updatedAt: new Date(1000) }])).toBe(false);
    });
});
