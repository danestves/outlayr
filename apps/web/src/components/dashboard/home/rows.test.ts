import { describe, expect, it } from "vite-plus/test";

import type { LedgerRow } from "../../../lib/dashboard-series-ledger";
import { pageOf, viewRows } from "./rows";

const row = (id: string, day: string, extra: Partial<LedgerRow> = {}): LedgerRow => ({
    accountId: "chase",
    amount: 10,
    at: Date.parse(`${day}T15:00:00Z`),
    categoryId: "groceries",
    day,
    id,
    income: false,
    note: "",
    parentId: null,
    topId: "groceries",
    ...extra,
});

const period = { days: 31, from: "2026-10-01", key: "2026-10", to: "2026-10-31" };
const view = { accounts: [], category: null, period };

describe("viewRows", () => {
    it("keeps whole days of the period and drops the neighbouring months", () => {
        const ledger = {
            rows: [
                row("before", "2026-09-30"),
                row("first", "2026-10-01"),
                row("last", "2026-10-31"),
                row("after", "2026-11-01"),
            ],
        };

        expect(viewRows(ledger, view, "oldest").map((each) => each.id)).toStrictEqual(["first", "last"]);
    });

    it("filters by account and by the top category a sub-category rolls into", () => {
        const ledger = {
            rows: [
                row("a", "2026-10-02"),
                row("b", "2026-10-03", { accountId: "amex" }),
                row("c", "2026-10-04", { categoryId: "milk", parentId: "groceries" }),
                row("d", "2026-10-05", { categoryId: "rent", topId: "rent" }),
            ],
        };

        expect(
            viewRows(ledger, { ...view, accounts: ["chase"], category: "groceries" }, "oldest").map((each) => each.id)
        ).toStrictEqual(["a", "c"]);
    });

    it("orders by size when asked and puts the newest first otherwise", () => {
        const ledger = { rows: [row("small", "2026-10-02", { amount: 5 }), row("big", "2026-10-01", { amount: 90 })] };

        expect(viewRows(ledger, view, "largest").map((each) => each.id)).toStrictEqual(["big", "small"]);
        expect(viewRows(ledger, view, "newest").map((each) => each.id)).toStrictEqual(["small", "big"]);
    });
});

describe("pageOf", () => {
    const rows = Array.from({ length: 23 }, (_, index) => index);

    it("reports the range of the last, short page", () => {
        expect(pageOf(rows, 2, 10)).toMatchObject({
            from: 21,
            page: 2,
            pages: 3,
            rows: [20, 21, 22],
            to: 23,
            total: 23,
        });
    });

    it("clamps a page that no longer exists after a filter shrinks the list", () => {
        expect(pageOf(rows.slice(0, 4), 5, 10)).toMatchObject({ from: 1, page: 0, pages: 1, to: 4 });
        expect(pageOf([], 3)).toMatchObject({ from: 0, page: 0, pages: 1, to: 0, total: 0 });
    });
});
