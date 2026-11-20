import { describe, expect, it } from "vite-plus/test";

import { pageRanges } from "./page-ranges";

describe("pageRanges", () => {
    it("collapses consecutive pages and keeps lone ones", () => {
        expect(pageRanges([2, 3, 4, 5, 9, 12, 13, 14])).toStrictEqual({ hidden: 0, shown: "2-5, 9, 12-14" });
        expect(pageRanges([7])).toStrictEqual({ hidden: 0, shown: "7" });
    });

    it("counts the pages past the last kept range, not the ranges", () => {
        expect(pageRanges([2, 3, 4, 5, 9, 12, 13, 14, 20, 30, 31, 32])).toStrictEqual({
            hidden: 4,
            shown: "2-5, 9, 12-14",
        });
    });
});
