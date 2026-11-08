import { execFileSync } from "node:child_process";
import { join } from "node:path";

import { expect, test } from "vite-plus/test";

const inNewYork = (...args: number[]): string =>
    execFileSync(
        process.execPath,
        ["--import", "tsx", join(import.meta.dirname, "dst-probe.ts"), "installments", ...args.map(String)],
        { encoding: "utf-8", env: { ...process.env, TZ: "America/New_York" } }
    );

test("keeps local midnights across a DST change", () => {
    expect(inNewYork(2027, 2, 1, 0, 0, 14)).toBe("[[2027,2,15,0],[2027,2,29,0],[2027,3,12,0]]");
    expect(inNewYork(2027, 0, 31, 0, 0, 1)).toBe("[[2027,1,28,0],[2027,2,31,0],[2027,3,30,0]]");
});
