import { describe, expect, it } from "vite-plus/test";

import { clockTime, money } from "./ledger";

describe("clockTime", () => {
    it("reads the 12-hour clock by default and the 24-hour one when the phone does", () => {
        expect(clockTime("14:05")).toBe("2:05 PM");
        expect(clockTime("14:05", true)).toBe("14:05");
    });

    it("keeps midnight at 00 on the 24-hour clock", () => {
        expect(clockTime("00:30", true)).toBe("00:30");
        expect(clockTime("00:30")).toBe("12:30 AM");
    });
});

describe("showCents off", () => {
    it("rounds to whole units", () => {
        expect(money(1214.6, "USD", "auto", false)).toBe("$1,215");
    });

    it("keeps the cents of an amount that would round to nothing", () => {
        expect(money(0.3, "USD", "auto", false)).toBe("$0.30");
    });
});
