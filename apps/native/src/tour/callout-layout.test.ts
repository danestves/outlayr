import { describe, expect, it } from "vite-plus/test";

import { CALLOUT_GAP, calloutLayout, POINTER_WIDTH, SCREEN_MARGIN } from "./callout-layout";
import type { TourRect } from "./callout-layout";

const WINDOW = { height: 844, width: 390 };
const INSETS = { bottom: 34, top: 59 };
const BUBBLE = { height: 120, width: 280 };

function overlaps(a: TourRect, b: TourRect): boolean {
    return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

const MIDDLE: TourRect = { height: 76, width: 200, x: 95, y: 300 };

describe("calloutLayout", () => {
    it("puts the bubble on the other side of the window's middle", () => {
        const high = calloutLayout({ bubble: BUBBLE, insets: INSETS, radius: 12, target: MIDDLE, window: WINDOW });
        expect(high.above).toBe(false);
        expect(high.bubble.y).toBe(high.hole.y + high.hole.height + CALLOUT_GAP);

        const low = calloutLayout({
            bubble: BUBBLE,
            insets: INSETS,
            radius: 12,
            target: { ...MIDDLE, y: 620 },
            window: WINDOW,
        });
        expect(low.above).toBe(true);
        expect(low.bubble.y + low.bubble.height + CALLOUT_GAP).toBe(low.hole.y);
    });

    it("keeps the bubble clear of the hole and inside the margins at every target position", () => {
        const xs = [0, 30, 175, 340, 380];
        const ys = [0, 40, 100, 300, 420, 500, 700, 820];
        const sizes = [
            { height: 40, width: 40 },
            { height: 76, width: 120 },
        ];

        for (const y of ys) {
            for (const x of xs) {
                for (const size of sizes) {
                    const layout = calloutLayout({
                        bubble: BUBBLE,
                        insets: INSETS,
                        radius: 12,
                        target: { ...size, x, y },
                        window: WINDOW,
                    });
                    expect(overlaps(layout.bubble, layout.hole)).toBe(false);
                    expect(layout.bubble.x).toBeGreaterThanOrEqual(SCREEN_MARGIN);
                    expect(layout.bubble.x + layout.bubble.width).toBeLessThanOrEqual(WINDOW.width - SCREEN_MARGIN);
                    expect(layout.bubble.y).toBeGreaterThanOrEqual(INSETS.top);
                    expect(layout.bubble.y + layout.bubble.height).toBeLessThanOrEqual(WINDOW.height - INSETS.bottom);
                }
            }
        }
    });

    it("keeps the pointer between the bubble's corners while still aiming at the target", () => {
        const left = calloutLayout({
            bubble: BUBBLE,
            insets: INSETS,
            radius: 12,
            target: { height: 44, width: 44, x: 0, y: 740 },
            window: WINDOW,
        });
        expect(left.pointerX).toBe(24);

        const right = calloutLayout({
            bubble: BUBBLE,
            insets: INSETS,
            radius: 12,
            target: { height: 44, width: 44, x: WINDOW.width - 44, y: 740 },
            window: WINDOW,
        });
        expect(right.pointerX).toBe(BUBBLE.width - 24);

        const centered = calloutLayout({
            bubble: BUBBLE,
            insets: INSETS,
            radius: 12,
            target: { height: 44, width: 44, x: 173, y: 740 },
            window: WINDOW,
        });
        expect(centered.pointerX).toBeGreaterThan(24 + POINTER_WIDTH);
        expect(centered.pointerX).toBeLessThan(BUBBLE.width - 24 - POINTER_WIDTH);
    });
});
