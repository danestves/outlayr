import { describe, expect, it } from "vite-plus/test";

import { linkRows } from "./rule-writes";

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
