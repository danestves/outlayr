import { describe, expect, it } from "vite-plus/test";

import { accountIdsOf, periodKeyOr, searchPatch } from "./filters";

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
