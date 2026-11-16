import { execFileSync } from "node:child_process";
import { join } from "node:path";

import { expect, test } from "vite-plus/test";

import { previousPeriodWindow } from "./period-window";

const inNewYork = (kind: string, ...args: number[]): string =>
    execFileSync(
        process.execPath,
        ["--import", "tsx", join(import.meta.dirname, "dst-probe.ts"), kind, ...args.map(String)],
        {
            encoding: "utf-8",
            env: { ...process.env, TZ: "America/New_York" },
        }
    );

test("keeps last period's clock time across the March DST change", () => {
    // Wednesday 13 March 2024 15:30, in the week that started Sunday 10 March before the clocks moved.
    expect(inNewYork("previous-week", 2024, 2, 10, 0, 0, 2024, 2, 13, 15, 30)).toBe("[[2,3,0,0],[2,6,15,30]]");
    expect(inNewYork("previous-day", 2024, 2, 11, 0, 0, 2024, 2, 11, 15, 30)).toBe("[[2,10,0,0],[2,10,15,30]]");
});

test("stops at the end of a shorter month instead of running into this one", () => {
    const window = previousPeriodWindow("month", new Date(2026, 2, 1), new Date(2026, 2, 31, 9));

    expect(window.start).toStrictEqual(new Date(2026, 1, 1));
    expect(window.end.getTime()).toBe(new Date(2026, 2, 1).getTime() - 1);
});
