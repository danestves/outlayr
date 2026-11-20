import { describe, expect, it } from "vite-plus/test";

import type { Doc } from "./entry-writes";
import { merchantEdited, websiteDomain } from "./merchant-writes";

// SAFETY: a test row leaves out the Convex system fields, which these writes never read.
const entry = (localId: string, extra: Partial<Doc> = {}) =>
    ({
        accountId: "chase",
        amount: 100,
        amountUsd: 100,
        categoryId: "food",
        currency: "USD",
        customColor: null,
        date: 0,
        day: 0,
        deletedAt: null,
        details: null,
        deviceId: "d",
        emoji: null,
        exchangeRate: null,
        exchangeRateType: null,
        icon: null,
        imageColor: null,
        imageKey: null,
        income: false,
        localId,
        month: 0,
        note: "Costco",
        onceRecurring: false,
        recurringCoefficient: 1,
        recurringEndDate: null,
        recurringType: 0,
        seq: 1,
        updatedAt: 5,
        userId: "u",
        ...extra,
    }) as Doc;

const touched = (rows: ReturnType<typeof merchantEdited>["rows"]) =>
    Object.fromEntries(rows.map((row) => [row.localId, row.fields]));

describe(merchantEdited, () => {
    it("renames every live entry under the merchant, but not transfer legs, card fees or deleted rows", () => {
        const books = [
            entry("a"),
            entry("b", { note: "COSTCO " }),
            entry("leg", { transferId: "t1" }),
            entry("fee", { feeForId: "a" }),
            entry("gone", { deletedAt: 9 }),
            entry("other", { note: "Costco Gas" }),
        ];

        const { renamed, rows } = merchantEdited(books, "a", { everywhere: true, name: " Costco Wholesale " }, 10);

        expect(renamed).toBe(2);
        expect(Object.keys(touched(rows)).toSorted()).toStrictEqual(["a", "b"]);
        expect(touched(rows).b).toMatchObject({ note: "Costco Wholesale" });
    });

    it("an entry with no merchant name renames alone, never every other unnamed entry", () => {
        const books = [entry("a", { note: "" }), entry("b", { note: "" })];

        const { rows } = merchantEdited(books, "a", { everywhere: true, name: "Corner shop" }, 10);

        expect(rows.map((row) => row.localId)).toStrictEqual(["a"]);
    });

    it("a new logo replaces the entry's emoji, but another entry keeps the look its owner picked", () => {
        const books = [entry("a", { emoji: "🛒" }), entry("b", { icon: "Cart" }), entry("c")];

        const fields = touched(
            merchantEdited(books, "a", { everywhere: true, imageKey: "merchants/costco.com", name: "Costco" }, 10).rows
        );

        expect(fields.a).toMatchObject({ emoji: null, imageKey: "merchants/costco.com" });
        expect(fields.b).toBeUndefined();
        expect(fields.c).toMatchObject({ imageKey: "merchants/costco.com" });
    });

    it("this entry only leaves the rest of the merchant as it was", () => {
        const books = [entry("a"), entry("b")];

        const { rows } = merchantEdited(books, "a", { everywhere: false, name: "Costco Wholesale" }, 10);

        expect(rows.map((row) => row.localId)).toStrictEqual(["a"]);
    });
});

describe(websiteDomain, () => {
    it("reads a pasted link as the bare site the logo service files it under", () => {
        expect(websiteDomain(" https://www.TraderJoes.com/stores?near=1 ")).toBe("traderjoes.com");
        expect(websiteDomain("costco.com")).toBe("costco.com");
    });

    it("refuses text that names no site", () => {
        expect(websiteDomain("trader joes")).toBeNull();
        expect(websiteDomain("localhost")).toBeNull();
    });
});
