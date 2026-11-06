import { describe, expect, it } from "vite-plus/test";

import { META_KEYS } from "./app-meta-core";
import { newestImport } from "./last-import";

const record = (importedAt: number, entries: number) =>
    JSON.stringify({
        categoryIds: [],
        importedAt,
        transactionIds: Array.from({ length: entries }, (_, index) => `t${index}`),
    });

describe(newestImport, () => {
    it("offers the newest import across sources, so undo takes back the one the user just did", () => {
        const rows = [
            { key: META_KEYS.csvImport, value: record(100, 2) },
            { key: META_KEYS.pdfImport, value: record(200, 3) },
        ];

        expect(newestImport(rows)).toStrictEqual({ entries: 3, importedAt: 200, kind: "pdf" });
        expect(
            newestImport([
                { key: META_KEYS.csvImport, value: record(300, 2) },
                { key: META_KEYS.pdfImport, value: record(200, 3) },
            ])?.kind
        ).toBe("csv");
    });

    it("is null when nothing can be undone", () => {
        expect(newestImport([])).toBeNull();
    });
});
