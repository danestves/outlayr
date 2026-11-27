import { describe, expect, it } from "vite-plus/test";

import { analyzeSnapshot } from "./analysis";
import { defaultChoices } from "./defaults";
import type { MmSnapshot, OutlayrLedgerState } from "./types";

const LEDGER: OutlayrLedgerState = {
    accounts: [],
    budgetCategoryIds: [],
    categories: [
        {
            color: null,
            customName: true,
            icon: null,
            id: "food",
            income: false,
            name: "食費",
            parentId: null,
            preset: null,
        },
        {
            color: null,
            customName: true,
            icon: null,
            id: "transport",
            income: false,
            name: "交通費",
            parentId: null,
            preset: null,
        },
    ],
    currency: "JPY",
    currencyChosen: true,
    entries: [],
    presetLabel: (preset) => preset,
};

const SNAPSHOT: MmSnapshot = {
    accounts: [],
    categories: [
        {
            income: false,
            limit: 8000,
            mmColor: null,
            mmIcon: null,
            position: 0,
            removed: false,
            title: "食費",
            uid: "c-food",
        },
        {
            income: false,
            limit: 4000,
            mmColor: null,
            mmIcon: null,
            position: 1,
            removed: false,
            title: "交通費",
            uid: "c-transport",
        },
    ],
    defaultCurrency: "JPY",
    entries: [],
    reminderCount: 0,
    removedEntryCount: 0,
    transfers: [],
    version: 1,
};

describe(defaultChoices, () => {
    it("matches a Japanese category to its own row, not the first label that folds the same", () => {
        const choices = defaultChoices(SNAPSHOT, analyzeSnapshot(SNAPSHOT, LEDGER), LEDGER);
        expect(choices.categories["c-transport"]).toStrictEqual({ kind: "existing", categoryId: "transport" });
    });
});
