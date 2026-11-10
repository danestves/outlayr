import { describe, expect, it } from "vite-plus/test";

import { newestImport } from "./last-import";

const record = (importedAt: number, entries: number) => ({
    categoryIds: [],
    importedAt,
    transactionIds: Array.from({ length: entries }, (_, index) => `t${index}`),
});

describe(newestImport, () => {
    it("offers the newest import across sources, so undo takes back the one the user just did", () => {
        expect(newestImport({ csv: record(100, 2), moneyManager: null, pdf: record(200, 3) })).toStrictEqual({
            entries: 3,
            importedAt: 200,
            kind: "pdf",
        });
        expect(newestImport({ csv: record(300, 2), moneyManager: null, pdf: record(200, 3) })?.kind).toBe("csv");
    });

    it("is null when nothing can be undone", () => {
        expect(newestImport({ csv: null, moneyManager: null, pdf: null })).toBeNull();
    });
});
