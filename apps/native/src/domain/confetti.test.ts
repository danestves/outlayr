import { describe, expect, it } from "vite-plus/test";

import { CONFETTI_FLIGHT_MS, confettiBurst } from "./confetti";

describe("confetti burst", () => {
    it("is deterministic for a seed, so a re-render never reshuffles a burst", () => {
        expect(confettiBurst(20, 5, 7)).toStrictEqual(confettiBurst(20, 5, 7));
    });

    it("indexes colours inside the palette it was given", () => {
        for (const piece of confettiBurst(60, 5, 3)) {
            expect(Number.isInteger(piece.colorIndex)).toBeTruthy();
            expect(piece.colorIndex >= 0 && piece.colorIndex < 5).toBeTruthy();
        }
        for (const piece of confettiBurst(10, 1, 3)) {
            expect(piece.colorIndex).toBe(0);
        }
    });

    it("lands every piece within the flight budget", () => {
        for (const piece of confettiBurst(60, 5, 5)) {
            expect(piece.delayMs >= 0).toBeTruthy();
            expect(piece.durationMs > 0).toBeTruthy();
            expect(piece.delayMs + piece.durationMs <= CONFETTI_FLIGHT_MS).toBeTruthy();
        }
    });
});
