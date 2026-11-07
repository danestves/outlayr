import { describe, expect, it } from "vite-plus/test";

import { accountIdsOf, dashboardSearch, periodKeyOr, searchPatch, toggledAccounts } from "./filters";

describe("periodKeyOr", () => {
    it("keeps an earlier month", () => {
        expect(periodKeyOr("2026-03", "2026-10")).toBe("2026-03");
    });

    it("falls back to the current period for a malformed or future month", () => {
        expect(periodKeyOr("2026-13", "2026-10")).toBe("2026-10");
        expect(periodKeyOr("October", "2026-10")).toBe("2026-10");
        expect(periodKeyOr("2027-01", "2026-10")).toBe("2026-10");
        expect(periodKeyOr(undefined, "2026-10")).toBe("2026-10");
    });
});

describe("accountIdsOf", () => {
    it("splits the list and ignores empty entries", () => {
        expect(accountIdsOf("a,,b,")).toStrictEqual(["a", "b"]);
        expect(accountIdsOf(undefined)).toStrictEqual([]);
    });

    it("round-trips with searchPatch", () => {
        const { accounts } = searchPatch({ accounts: ["a", "b"] });

        expect(accountIdsOf(accounts)).toStrictEqual(["a", "b"]);
    });
});

describe("searchPatch", () => {
    it("clears a filter set to none and leaves the rest out", () => {
        expect(searchPatch({ accounts: [], category: null })).toStrictEqual({
            accounts: undefined,
            category: undefined,
        });
    });
});

describe("dashboardSearch", () => {
    const read = (input: unknown) => dashboardSearch["~standard"].validate(input);

    it("keeps text filters", async () => {
        const result = await read({ accounts: "a,b", category: "rent", period: "2026-03" });

        expect(result).toStrictEqual({ value: { accounts: "a,b", category: "rent", period: "2026-03" } });
    });

    it("drops a filter the address parsed into a number or a flag instead of failing the screen", async () => {
        const result = await read({ accounts: 123, category: true, period: 2026 });

        expect(result).toStrictEqual({ value: { accounts: undefined, category: undefined, period: undefined } });
    });
});

describe("toggledAccounts", () => {
    it("narrows from all accounts to the one ticked, not to all the others", () => {
        expect(toggledAccounts([], "amex")).toStrictEqual(["amex"]);
        expect(toggledAccounts(["amex"], "cash")).toStrictEqual(["amex", "cash"]);
    });

    it("returns to all accounts when the last tick comes off", () => {
        expect(toggledAccounts(["amex"], "amex")).toStrictEqual([]);
    });
});
