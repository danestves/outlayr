import { describe, expect, it } from "@jest/globals";

import { makeGeometry } from "./goal-pace-geometry";

const DAY = 86_400_000;
const START = Date.UTC(2026, 0, 1);
const TARGET_TIME = START + 100 * DAY;
const NOW = START + 60 * DAY;

const BASE = {
    height: 100,
    nowMs: NOW,
    required: [
        { time: START, value: 0 },
        { time: TARGET_TIME, value: 1000 },
    ],
    startTime: START,
    target: 1000,
    targetTime: TARGET_TIME,
    width: 300,
};

describe("the pace chart's head", () => {
    it("holds still through the day, like the standing it is read beside", () => {
        const noon = makeGeometry({ ...BASE, actual: [{ time: NOW, value: 600 }], nowMs: NOW + DAY / 2 });
        const midnight = makeGeometry({ ...BASE, actual: [{ time: NOW, value: 600 }] });

        expect(noon.head).toStrictEqual(midnight.head);
    });

    it("marks where the account stands today, not a future-dated row", () => {
        const geometry = makeGeometry({
            ...BASE,
            actual: [
                { time: START, value: 0 },
                { time: NOW, value: 600 },
                { time: NOW + 20 * DAY, value: 900 },
            ],
        });

        const banked = makeGeometry({ ...BASE, actual: [{ time: NOW, value: 600 }] });
        expect(geometry.head).toStrictEqual(banked.head);
    });

    it("projects from today to the target, so the dashed run starts where the line stops", () => {
        const geometry = makeGeometry({
            ...BASE,
            actual: [
                { time: START, value: 0 },
                { time: NOW, value: 600 },
                { time: NOW + 20 * DAY, value: 900 },
            ],
        });

        expect(geometry.projection).toBe(
            `M ${geometry.head?.x} ${geometry.head?.y} L ${geometry.goal.x} ${geometry.goal.y}`
        );
    });

    it("has no head at all when nothing has been banked yet", () => {
        const geometry = makeGeometry({
            ...BASE,
            actual: [{ time: NOW + 5 * DAY, value: 400 }],
        });

        expect(geometry.head).toBeNull();
        expect(geometry.actual).toBeNull();
    });

    it("draws the line to today and leaves scheduled money off it", () => {
        const geometry = makeGeometry({
            ...BASE,
            actual: [
                { time: START, value: 0 },
                { time: NOW, value: 600 },
                { time: NOW + 20 * DAY, value: 900 },
            ],
        });

        const banked = makeGeometry({
            ...BASE,
            actual: [
                { time: START, value: 0 },
                { time: NOW, value: 600 },
            ],
        });
        expect(geometry.actual).toBe(banked.actual);
        expect(geometry.required).toBe(banked.required);
    });

    it("projects nothing once the deadline is behind, so no path is drawn at the edge", () => {
        const overdue = makeGeometry({
            ...BASE,
            actual: [{ time: TARGET_TIME + DAY, value: 800 }],
            nowMs: TARGET_TIME + DAY,
        });
        expect(overdue.projection).toBeNull();
    });

    it("projects nothing once the target is met, so nothing reads as a plan to withdraw", () => {
        const reached = makeGeometry({ ...BASE, actual: [{ time: NOW, value: 1200 }], target: 1000 });
        expect(reached.projection).toBeNull();

        const short = makeGeometry({ ...BASE, actual: [{ time: NOW, value: 800 }], target: 1000 });
        expect(short.projection).not.toBeNull();
    });
});
