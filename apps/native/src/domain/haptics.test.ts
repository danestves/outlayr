import { describe, expect, it } from "vite-plus/test";

import { HAPTICS_EXCESSIVE, HAPTICS_OFF, HAPTICS_SUBTLE, hapticPlay } from "./haptics";
import type { HapticEvent } from "./haptics";

const LANDINGS: HapticEvent[] = ["light", "medium", "heavy", "success", "warning", "error"];
const TICKS: HapticEvent[] = ["selection", "keyTap"];
const EVENTS = [...TICKS, ...LANDINGS];

describe("haptics setting", () => {
    it("plays nothing at all on None", () => {
        for (const event of EVENTS) {
            expect(hapticPlay(HAPTICS_OFF, event)).toBeNull();
        }
    });

    it("plays every event on Excessive", () => {
        for (const event of EVENTS) {
            expect(hapticPlay(HAPTICS_EXCESSIVE, event)).not.toBeNull();
        }
    });

    it("keeps per-action ticks silent on Subtle", () => {
        for (const event of TICKS) {
            expect(hapticPlay(HAPTICS_SUBTLE, event)).toBeNull();
        }
    });

    it("plays landings on Subtle", () => {
        for (const event of LANDINGS) {
            expect(hapticPlay(HAPTICS_SUBTLE, event)).not.toBeNull();
        }
    });

    it("treats a value outside the three options as its nearest neighbour", () => {
        expect(hapticPlay(-1, "success")).toBeNull();
        expect(hapticPlay(9, "keyTap")).toStrictEqual({ kind: "selection" });
    });
});
