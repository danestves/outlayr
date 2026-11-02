import { execFileSync } from "node:child_process";
import { join } from "node:path";

import { describe, expect, it } from "vite-plus/test";

import { balanceDifference, checkedAge } from "./balance-check";

const at = (month: number, day: number, hour = 12, minute = 0) => new Date(2026, month, day, hour, minute);

const ageInNewYork = (...args: number[]) =>
    JSON.parse(
        execFileSync(
            process.execPath,
            ["--import", "tsx", join(import.meta.dirname, "dst-probe.ts"), "checked-age", ...args.map(String)],
            { encoding: "utf-8", env: { ...process.env, TZ: "America/New_York" } }
        )
    );

describe("how long ago an account was checked", () => {
    it("is never for an account nobody checked", () => {
        expect(checkedAge(null, at(10, 1).getTime())).toStrictEqual({ state: "never" });
    });

    it("keeps one local day together from midnight to the last minute", () => {
        const now = at(10, 1, 23, 59).getTime();
        expect(checkedAge(at(10, 1, 0, 1), now)).toStrictEqual({ state: "today" });
    });

    it("turns to yesterday at midnight, not 24 hours after the check", () => {
        expect(checkedAge(at(9, 31, 23, 50), at(10, 1, 0, 10).getTime())).toStrictEqual({ state: "yesterday" });
    });

    it("counts days up to a week as recent and the eighth day as stale", () => {
        const now = at(10, 8).getTime();
        expect(checkedAge(at(10, 1), now)).toStrictEqual({ days: 7, state: "daysAgo" });
        expect(checkedAge(at(9, 31), now)).toStrictEqual({ days: 8, state: "stale" });
    });

    it("reads a check stamped by a clock that runs ahead as today", () => {
        expect(checkedAge(at(10, 2), at(10, 1).getTime())).toStrictEqual({ state: "today" });
    });

    it("counts whole days across the spring clock change", () => {
        expect(ageInNewYork(2027, 2, 13, 12, 0, 2027, 2, 15, 0, 30)).toStrictEqual({ days: 2, state: "daysAgo" });
    });

    it("counts whole days across the autumn clock change", () => {
        expect(ageInNewYork(2027, 10, 6, 22, 0, 2027, 10, 8, 0, 30)).toStrictEqual({ days: 2, state: "daysAgo" });
    });
});

describe("the adjustment that makes the ledger match the bank", () => {
    it("is zero when the figures agree, float noise included", () => {
        expect(balanceDifference(0.1 + 0.2, 0.3, "USD")).toBe(0);
    });

    it("rounds to the currency's own precision", () => {
        expect(balanceDifference(1000.4, 1000, "JPY")).toBe(0);
        expect(balanceDifference(-500.004, -480, "USD")).toBe(20);
    });
});
