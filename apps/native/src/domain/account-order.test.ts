import { describe, expect, it } from "vite-plus/test";

import { displayOrder, pickerOrder } from "./account-order";

const accounts = [
    { balance: 50, id: "cash" },
    { balance: 900, id: "savings" },
    { balance: -20, id: "overdrawn" },
    { balance: 50, id: "wallet" },
];

describe("account order", () => {
    it("leads with the largest balance, keeping sortOrder between ties, until the list is ordered by hand", () => {
        const balance = (account: (typeof accounts)[number]) => account.balance;

        expect(displayOrder(accounts, false, balance).map((account) => account.id)).toStrictEqual([
            "savings",
            "cash",
            "wallet",
            "overdrawn",
        ]);
        expect(displayOrder(accounts, true, balance)).toStrictEqual(accounts);
    });

    it("lists a picker A to Z, accents and case aside, until the list is ordered by hand", () => {
        const picks = [{ name: "nubank" }, { name: "Ábaco" }, { name: "Banamex" }];

        expect(pickerOrder(picks, false).map((account) => account.name)).toStrictEqual(["Ábaco", "Banamex", "nubank"]);
        expect(pickerOrder(picks, true)).toStrictEqual(picks);
    });
});
