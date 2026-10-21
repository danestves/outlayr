import { execFileSync } from "node:child_process";
import { join } from "node:path";

import { describe, expect, it } from "@jest/globals";

import { clockAdvances, nextClockTick } from "./clock";

const HOUR_MS = 3_600_000;

function wallTime(ms: number): [number, number, number, number] {
    const d = new Date(ms);
    return [d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds()];
}

interface DstProbeResult {
    arrival: [number, number, number, number];
    offset: number;
    tick: number;
}

/**
 * A subprocess forced to America/New_York: Jest caches the host zone on first `Date` use, so mutating `TZ` here is
 * ignored. Wall-clock tuples, not epoch ms, so this process's zone cannot shift "local midnight"; stdin, not argv,
 * because a year of hours passes Linux's 128 KiB argument limit.
 */
function ticksInNewYork(dateArgs: [number, number, number, number][]): DstProbeResult[] {
    const probe = join(import.meta.dirname, "dst-probe.ts");
    const out = execFileSync(process.execPath, ["--import", "tsx", probe, "clock"], {
        encoding: "utf-8",
        env: { ...process.env, TZ: "America/New_York" },
        input: JSON.stringify(dateArgs),
        maxBuffer: 8 * 1024 * 1024,
    });
    return JSON.parse(out);
}

describe("next clock tick", () => {
    it("lands on the next local midnight from an arbitrary instant", () => {
        const now = new Date(2025, 6, 15, 9, 41, 12, 345).getTime();

        expect(wallTime(now + nextClockTick(now))).toStrictEqual([0, 0, 0, 0]);
    });

    it("arms for the following midnight when armed exactly at one", () => {
        const midnight = new Date(2025, 6, 15).getTime();

        const tick = nextClockTick(midnight);

        expect(tick > 0).toBeTruthy();
        expect(wallTime(midnight + tick)).toStrictEqual([0, 0, 0, 0]);
        expect(new Date(midnight + tick).getDate()).toBe(16);
    });

    it("spans 23 hours on the day a clock springs forward, not 24", () => {
        const [before, after] = ticksInNewYork([
            [2026, 2, 8, 0],
            [2026, 2, 9, 0],
        ]);

        expect(before.offset).not.toBe(after.offset);
        expect(before.tick).toBe(23 * HOUR_MS);
    });

    it("spans 25 hours on the day a clock falls back", () => {
        const [before, after] = ticksInNewYork([
            [2026, 10, 1, 0],
            [2026, 10, 2, 0],
        ]);

        expect(before.offset).not.toBe(after.offset);
        expect(before.tick).toBe(25 * HOUR_MS);
    });

    it("never arms for zero, on any hour of a year that shifts twice", () => {
        const dateArgs: [number, number, number, number][] = [];
        for (let day = 0; day < 365; day += 1) {
            for (let hour = 0; hour < 24; hour += 1) {
                dateArgs.push([2026, 0, 1 + day, hour]);
            }
        }

        const misses = ticksInNewYork(dateArgs).flatMap(({ tick, arrival }, index) =>
            tick > 0 && arrival.every((part) => part === 0) ? [] : [dateArgs[index]]
        );

        expect(misses).toStrictEqual([]);
    });
});

describe("clock advance rule", () => {
    it("takes a reading later than the standing one", () => {
        expect(clockAdvances(1000, 1500)).toBe(true);
    });

    it("refuses a repeat, so a burst of triggers restates the reading once", () => {
        expect(clockAdvances(1000, 1000)).toBe(false);
    });

    it("refuses a regression right up to the tolerance", () => {
        const now = 10 * HOUR_MS;
        expect(clockAdvances(now, now - 60_000)).toBe(false);
    });

    it("takes a correction past the tolerance rather than staying in the future", () => {
        const now = 10 * HOUR_MS;
        expect(clockAdvances(now, now - 60_001)).toBe(true);
        expect(clockAdvances(now, now - 5 * HOUR_MS)).toBe(true);
    });
});
