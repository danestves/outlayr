import { describe, expect, it } from "vite-plus/test";

import type { TagBooks } from "./ledger-db";
import { entryTags, linkRows, retagged, tagUseCounts } from "./rule-writes";

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

describe("tagUseCounts", () => {
    // SAFETY: rows carry what the counters read, the validators are not under test.
    const books = {
        links: [
            link("l-1", "bulk"),
            { ...link("l-2", "bulk"), localId: "l-2" },
            { ...link("l-3", "home"), transactionId: "entry-2" },
            { ...link("l-4", "home"), deletedAt: 50 },
            { ...link("l-5", "gone"), transactionId: "entry-3" },
            { ...link("l-6", "home"), transactionId: "entry-gone" },
        ],
        tags: [tag("bulk", "bulk"), tag("home", "home"), tag("gone", "gone", 50)],
    } as unknown as TagBooks;

    const transactions = [
        { deletedAt: null, localId: "entry-1" },
        { deletedAt: null, localId: "entry-2" },
        { deletedAt: null, localId: "entry-3" },
        { deletedAt: 50, localId: "entry-gone" },
    ];

    it("counts live entries, not links, and skips retired links, tags and entries", () => {
        expect(tagUseCounts(books, transactions)).toEqual(
            new Map([
                ["bulk", 1],
                ["home", 1],
            ])
        );
    });

    it("lists an entry's live tags once each", () => {
        expect(entryTags(books, "entry-1").map((each) => each.localId)).toEqual(["bulk"]);
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
