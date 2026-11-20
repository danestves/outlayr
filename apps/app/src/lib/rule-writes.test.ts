import { describe, expect, it } from "vite-plus/test";

import type { TagBooks } from "./ledger-db";
import { linkRows, retagged, tagNamesOf } from "./rule-writes";

const retired = {
    deletedAt: 500,
    localId: "link-1",
    restoredAt: null,
    tagId: "online",
    transactionId: "entry-1",
    updatedAt: 500,
};

describe("linkRows", () => {
    it("revives the retired link of a pair instead of adding a second one", () => {
        const [row, ...rest] = linkRows([retired], [{ entry: { id: "entry-1" }, tagIds: ["online"] }], 900);

        expect(rest).toHaveLength(0);
        expect(row).toMatchObject({ deletedAt: null, localId: "link-1", restoredAt: 900, updatedAt: 900 });
    });

    it("dates the revival after a deletion this clock has not reached yet", () => {
        const ahead = { ...retired, deletedAt: 2000, updatedAt: 2000 };
        const [row] = linkRows([ahead], [{ entry: { id: "entry-1" }, tagIds: ["online"] }], 900);

        expect(row).toMatchObject({ localId: "link-1", restoredAt: 2001, updatedAt: 2001 });
    });

    it("adds a fresh link for a pair never tagged", () => {
        const [row] = linkRows([retired], [{ entry: { id: "entry-2" }, tagIds: ["online"] }], 900);

        expect(row?.localId).not.toBe("link-1");
        expect(row).toMatchObject({ deletedAt: null, fields: { tagId: "online", transactionId: "entry-2" } });
    });
});

const tag = (localId: string, name: string, deletedAt: number | null = null) => ({
    color: null,
    deletedAt,
    localId,
    name,
    sortOrder: 0,
    updatedAt: 100,
});
const link = (localId: string, tagId: string) => ({
    deletedAt: null,
    localId,
    restoredAt: null,
    tagId,
    transactionId: "entry-1",
    updatedAt: 100,
});

describe("tagNamesOf", () => {
    it("reads hashes and commas, keeps spaces inside a name and drops repeats", () => {
        expect(tagNamesOf("#trip #Home office, trip ,#home office")).toEqual({ names: ["trip", "Home office"] });
    });

    it("refuses a name longer than a tag holds", () => {
        expect(tagNamesOf(`#ok #${"x".repeat(25)}`)).toEqual({ problem: "tooLong" });
    });
});

describe("retagged", () => {
    // SAFETY: rows carry what retagged reads, the validators are not under test.
    const books = {
        links: [link("l-bulk", "bulk"), link("l-home", "home"), link("l-gone", "gone")],
        tags: [tag("bulk", "bulk"), tag("home", "home"), tag("gone", "gone", 50)],
    } as unknown as TagBooks;

    it("links known tags by name, creates new ones and retires the links it dropped", () => {
        const rows = retagged(books, "entry-1", ["Bulk", "road trip"], 900);
        const created = rows.find((row) => row.table === "tags");

        expect(created).toMatchObject({ fields: { name: "road trip" } });
        expect(rows.filter((row) => row.table === "transactionTags")).toEqual([
            expect.objectContaining({ deletedAt: null, fields: { tagId: created?.localId, transactionId: "entry-1" } }),
            expect.objectContaining({ deletedAt: 900, localId: "l-home" }),
        ]);
    });

    it("leaves a link to a deleted tag alone", () => {
        expect(retagged(books, "entry-1", ["bulk", "home"], 900)).toEqual([]);
    });
});
