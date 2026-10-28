import { describe, expect, it } from "vite-plus/test";

import { formatWait, projectLimit } from "./usage-limits";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const NOW = 1_800_000_000_000;

describe("projectLimit", () => {
    it("refills a token bucket with the time since it was written, up to capacity", () => {
        const bucket = {
            capacity: 50,
            kind: "token bucket",
            period: HOUR,
            rate: 200,
            ts: NOW - 36_000,
            value: 30,
        } as const;

        expect(projectLimit(bucket, NOW)).toStrictEqual({
            capacity: 50,
            fullAt: NOW + 324_000,
            left: 32,
            nextAt: null,
        });
        expect(projectLimit(bucket, NOW + HOUR).left).toBe(50);
    });

    it("times the next token of an empty bucket", () => {
        const bucket = { capacity: 10, kind: "token bucket", period: HOUR, rate: 30, ts: NOW, value: 0.5 } as const;

        expect(projectLimit(bucket, NOW)).toMatchObject({ left: 0, nextAt: NOW + 60_000 });
    });

    it("keeps a fixed window spent until its boundary, then fills it", () => {
        const start = NOW - 10 * DAY;
        const bucket = {
            capacity: 500,
            kind: "fixed window",
            period: 30 * DAY,
            rate: 500,
            ts: start,
            value: 0,
        } as const;

        expect(projectLimit(bucket, NOW)).toStrictEqual({
            capacity: 500,
            fullAt: start + 30 * DAY,
            left: 0,
            nextAt: start + 30 * DAY,
        });
        expect(projectLimit(bucket, start + 30 * DAY)).toMatchObject({ fullAt: null, left: 500 });
    });
});

describe("formatWait", () => {
    it.each([
        [400, "1 s"],
        [60_000, "1 min"],
        [241_000, "5 min"],
        [2 * HOUR, "2 h"],
    ])("formats %d ms as %s", (ms, text) => {
        expect(formatWait(ms)).toBe(text);
    });
});
