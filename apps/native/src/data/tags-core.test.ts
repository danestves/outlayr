import { beforeEach, describe, expect, it } from "@jest/globals";
import { isNull } from "drizzle-orm";

import type { Database } from "@/db/client";
import { categories, tags, transactions, transactionTags } from "@/db/schema";
import { migratedDatabase } from "@/db/test-database";

import { liveTagsQuery, tagIdsForQuery, tagsRepo } from "./tags-core";

async function seedTransaction(db: Database, id: string) {
    await db.insert(categories).values({
        id: "c1",
        income: false,
        name: "Food",
        sortOrder: 0,
        updatedAt: new Date(1),
    });
    await db.insert(transactions).values({
        amount: 10,
        categoryId: "c1",
        date: new Date(1),
        day: new Date(1),
        id,
        income: false,
        month: new Date(1),
        note: "",
        updatedAt: new Date(1),
    });
}

describe("tagsRepo", () => {
    let db: Database;

    beforeEach(async () => {
        db = migratedDatabase();
        await seedTransaction(db, "t1");
    });

    it("reuses a tag that already answers to the name", async () => {
        const first = await tagsRepo.ensureTag(db, "Work");
        const second = await tagsRepo.ensureTag(db, "  work ");
        expect(second).toBe(first);
        await expect(liveTagsQuery(db)).resolves.toHaveLength(1);
    });

    it("keeps the casing the owner typed first", async () => {
        await tagsRepo.ensureTag(db, "WFH");
        await tagsRepo.ensureTag(db, "wfh");
        expect((await liveTagsQuery(db))[0].name).toBe("WFH");
    });

    it("refuses a name that is only whitespace", async () => {
        await expect(tagsRepo.ensureTag(db, "   ")).resolves.toBeNull();
        await expect(liveTagsQuery(db)).resolves.toHaveLength(0);
    });

    it("attaches and detaches to match exactly what was asked for", async () => {
        const work = await tagsRepo.ensureTag(db, "work");
        const trip = await tagsRepo.ensureTag(db, "trip");
        if (!(work && trip)) {
            throw new Error("expected two tag ids");
        }

        await tagsRepo.setTagsFor(db, "t1", [work, trip]);
        await expect(tagIdsForQuery(db, "t1")).resolves.toHaveLength(2);

        await tagsRepo.setTagsFor(db, "t1", [work]);
        expect((await tagIdsForQuery(db, "t1")).map((row) => row.tagId)).toStrictEqual([work]);
    });

    it("writes nothing when the same set is set again", async () => {
        const work = await tagsRepo.ensureTag(db, "work");
        if (!work) {
            throw new Error("expected a tag id");
        }
        await tagsRepo.setTagsFor(db, "t1", [work]);
        const before = await db.select().from(transactionTags);

        await tagsRepo.setTagsFor(db, "t1", [work]);

        const after = await db.select().from(transactionTags);
        expect(after.map((row) => row.updatedAt.getTime())).toStrictEqual(before.map((row) => row.updatedAt.getTime()));
    });

    it("revives a detached link rather than making a second one", async () => {
        const work = await tagsRepo.ensureTag(db, "work");
        if (!work) {
            throw new Error("expected a tag id");
        }
        await tagsRepo.setTagsFor(db, "t1", [work]);
        await tagsRepo.setTagsFor(db, "t1", []);
        await tagsRepo.setTagsFor(db, "t1", [work]);

        const rows = await db.select().from(transactionTags);
        expect(rows).toHaveLength(1);
        expect(rows[0].deletedAt).toBeNull();
    });

    it("retires the links when the tag itself goes", async () => {
        const work = await tagsRepo.ensureTag(db, "work");
        if (!work) {
            throw new Error("expected a tag id");
        }
        await tagsRepo.setTagsFor(db, "t1", [work]);

        await tagsRepo.deleteTag(db, work);

        await expect(tagIdsForQuery(db, "t1")).resolves.toHaveLength(0);
        await expect(liveTagsQuery(db)).resolves.toHaveLength(0);
    });

    it("leaves the tombstone replicable rather than dropping the row", async () => {
        const work = await tagsRepo.ensureTag(db, "work");
        if (!work) {
            throw new Error("expected a tag id");
        }
        await tagsRepo.deleteTag(db, work);

        const all = await db.select().from(tags);
        expect(all).toHaveLength(1);
        expect(all[0].deletedAt).toBeTruthy();
        expect(all[0].name).toBe("");
    });

    it("lets the same name be created again after a delete", async () => {
        const first = await tagsRepo.ensureTag(db, "work");
        if (!first) {
            throw new Error("expected a tag id");
        }
        await tagsRepo.deleteTag(db, first);

        const second = await tagsRepo.ensureTag(db, "work");
        expect(second).not.toBe(first);
        await expect(db.select().from(tags).where(isNull(tags.deletedAt))).resolves.toHaveLength(1);
    });
});
