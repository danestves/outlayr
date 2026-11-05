import { describe, expect, it } from "vite-plus/test";

import { ribbonPolygon, rowCenter, rowSpans } from "./ribbons";

describe("rowSpans", () => {
    const grid = { height: 38, top: 20 };

    it("centres a tapered ribbon on the row a table draws", () => {
        const [span] = rowSpans([100], grid, 1);

        expect(rowCenter(grid, 1)).toBe(77);
        expect(span).toEqual([57, 97]);
    });

    it("keeps a sliver visible at the minimum thickness", () => {
        const [span] = rowSpans([1], grid, 0);

        expect(span).toEqual([37.5, 40.5]);
    });

    it("stacks several ribbons into one row without overlap", () => {
        const [first, second] = rowSpans([10, 30], { ...grid, taper: 1 }, 0);

        expect(first).toEqual([19, 29]);
        expect(second).toEqual([29, 59]);
    });
});

describe("ribbonPolygon", () => {
    it("starts and ends on the ribbon's own edges so pointer tests match what is painted", () => {
        const polygon = ribbonPolygon(0, 100, 0.5, [10, 30], [50, 54]);

        expect(polygon[0]).toEqual([0, 10]);
        expect(polygon[12]).toEqual([100, 50]);
        expect(polygon[13]).toEqual([100, 54]);
        expect(polygon.at(-1)).toEqual([0, 30]);
    });
});
