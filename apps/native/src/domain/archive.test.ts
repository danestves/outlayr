import { describe, expect, it } from "@jest/globals";

import {
    ARCHIVE_FORMAT,
    ARCHIVE_VERSION,
    archiveFileName,
    archiveRowCount,
    decodeArchiveRow,
    encodeArchiveRow,
    parseArchive,
    serializeArchive,
} from "./archive";
import type { ArchiveDocument } from "./archive";

function emptyDocument(): ArchiveDocument {
    return {
        exportedAt: 1_700_000_000_000,
        format: ARCHIVE_FORMAT,
        photos: {},
        tables: {
            accounts: [],
            appMeta: [],
            budgets: [],
            categories: [],
            installmentPlans: [],
            installments: [],
            mainBudget: [],
            outsideMoves: [],
            outsidePayments: [],
            savingsGoals: [],
            tags: [],
            transactionPhotos: [],
            transactionSplits: [],
            transactionTags: [],
            transactions: [],
            transfers: [],
        },
        version: ARCHIVE_VERSION,
    };
}

describe("encoding a row", () => {
    it("leaves a column that merely looks like a date alone", () => {
        const encoded = encodeArchiveRow({ note: "2026-01-01" });
        expect(encoded.note).toBe("2026-01-01");
    });

    it("round-trips an instant back to the same moment", () => {
        const original = new Date(1_700_000_000_123);
        const decoded = decodeArchiveRow("transactions", encodeArchiveRow({ day: original }));
        expect(decoded.day instanceof Date).toBeTruthy();
        expect((decoded.day as Date).getTime()).toBe(original.getTime());
    });

    it("round-trips a null instant as null, not as the epoch", () => {
        const decoded = decodeArchiveRow("transactions", encodeArchiveRow({ deletedAt: null }));
        expect(decoded.deletedAt).toBeNull();
    });

    it("decodes an unusable instant to null rather than an invalid date", () => {
        for (const bad of ["yesterday", Number.NaN, Number.POSITIVE_INFINITY]) {
            const decoded = decodeArchiveRow("transactions", { date: bad });
            expect(decoded.date).toBeNull();
        }
    });
});

describe("reading a file back", () => {
    it("round-trips a document through serialize and parse", () => {
        const document = emptyDocument();
        document.tables.categories = [{ id: "c1", name: "Food" }];
        const parsed = parseArchive(serializeArchive(document));
        expect(parsed).toStrictEqual(document);
    });

    it("refuses text that is not JSON at all", () => {
        expect(parseArchive("not json")).toBeNull();
    });

    it("refuses a JSON file that is not an archive", () => {
        expect(parseArchive(JSON.stringify({ hello: "world" }))).toBeNull();
        expect(parseArchive(JSON.stringify([1, 2, 3]))).toBeNull();
    });

    it("refuses a version this build cannot restore", () => {
        const future = { ...emptyDocument(), version: ARCHIVE_VERSION + 1 };
        expect(parseArchive(JSON.stringify(future))).toBeNull();
    });

    it("carries photo bytes by file name", () => {
        const document = { ...emptyDocument(), photos: { "p1.jpg": "AAEC" } };
        expect(parseArchive(serializeArchive(document))?.photos).toStrictEqual({ "p1.jpg": "AAEC" });
    });

    it("reads a file written before photos travelled as holding none", () => {
        const { photos: _photos, ...older } = emptyDocument();
        expect(parseArchive(JSON.stringify(older))?.photos).toStrictEqual({});
    });

    it("refuses a photo name that would land outside the photo directory", () => {
        for (const name of ["../../outlayr.db", "a/b.jpg", "a\\b.jpg", "..", "."]) {
            const hostile = { ...emptyDocument(), photos: { [name]: "AAEC" } };
            expect(parseArchive(JSON.stringify(hostile))).toBeNull();
        }
    });

    it("refuses a table that is not a list of rows", () => {
        const broken = emptyDocument() as unknown as Record<string, unknown>;
        (broken.tables as Record<string, unknown>).transactions = "nope";
        expect(parseArchive(JSON.stringify(broken))).toBeNull();
    });

    it("refuses a table holding something that is not a row", () => {
        const broken = emptyDocument() as unknown as Record<string, unknown>;
        (broken.tables as Record<string, unknown>).transactions = [42];
        expect(parseArchive(JSON.stringify(broken))).toBeNull();
    });

    it("reads a table the file omits as empty rather than refusing it", () => {
        const partial = emptyDocument() as unknown as Record<string, unknown>;
        (partial.tables as Record<string, unknown>).transfers = undefined;
        const parsed = parseArchive(JSON.stringify(partial));
        expect(parsed?.tables.transfers).toStrictEqual([]);
    });

    it("reads a file carrying a table this build has dropped", () => {
        const legacy = emptyDocument() as unknown as Record<string, unknown>;
        (legacy.tables as Record<string, unknown>).templateTransactions = [{ amount: 1, id: "p1" }];
        const parsed = parseArchive(JSON.stringify(legacy));
        expect(parsed).not.toBeNull();
        expect(Object.hasOwn(parsed?.tables ?? {}, "templateTransactions")).toBe(false);
    });
});

describe("describing a file", () => {
    it("counts every row a restore would write", () => {
        const document = emptyDocument();
        document.tables.categories = [{ id: "c1" }, { id: "c2" }];
        document.tables.transactions = [{ id: "t1" }];
        expect(archiveRowCount(document)).toBe(3);
    });

    it("names the file by the day it was written", () => {
        expect(archiveFileName(new Date(Date.UTC(2026, 6, 30, 15, 0)))).toBe("outlayr-archive-2026-07-30.json");
    });
});
