import { beforeEach, describe, expect, it } from "@jest/globals";
import { eq } from "drizzle-orm";

import type { Database } from "@/db/client";
import { categories, tags, transactions, transactionTags } from "@/db/schema";
import { migratedDatabase } from "@/db/test-database";

import {
    candidateLogoIds,
    dismissedLogoIds,
    rememberLogoCandidate,
    rememberLogoDismissal,
} from "./logo-backfill-state";
import { applyMerchantToSiblings } from "./merchant-siblings-core";
import type { MerchantSiblingsInput } from "./merchant-siblings-core";
import { tagIdsForQuery, tagsRepo } from "./tags-core";

const NOW = new Date("2026-09-08T12:00:00Z");

async function seedRow(
    db: Database,
    id: string,
    overrides: Partial<typeof transactions.$inferInsert> = {}
): Promise<void> {
    await db.insert(transactions).values({
        amount: 10,
        currency: "EUR",
        date: NOW,
        day: NOW,
        id,
        income: false,
        month: NOW,
        note: "Intermarché",
        updatedAt: NOW,
        ...overrides,
    });
}

function input(overrides: Partial<MerchantSiblingsInput> = {}): MerchantSiblingsInput {
    return {
        categoryId: null,
        currency: "EUR",
        defaultCurrency: "USD",
        excludeId: "source",
        income: false,
        key: "intermarche",
        persistLogo: null,
        tagIds: [],
        ...overrides,
    };
}

async function row(db: Database, id: string) {
    const [found] = await db.select().from(transactions).where(eq(transactions.id, id));
    return found;
}

describe("applyMerchantToSiblings", () => {
    let db: Database;
    beforeEach(async () => {
        db = migratedDatabase();
        await db
            .insert(categories)
            .values({ color: "#000", id: "groceries", income: false, name: "Groceries", updatedAt: NOW });
        await db.insert(tags).values({ id: "tag-food", name: "Food", updatedAt: NOW });
        await seedRow(db, "source", { categoryId: "groceries" });
    });

    it("paints the logo and fills an empty category on every sibling of the same merchant and currency", async () => {
        await seedRow(db, "bare");
        await seedRow(db, "accented", { note: "INTERMARCHÉ" });
        await seedRow(db, "other-currency", { currency: "USD" });
        await seedRow(db, "other-merchant", { note: "Carrefour" });
        let persisted = 0;
        const touched = await applyMerchantToSiblings(
            db,
            input({
                categoryId: "groceries",
                persistLogo: async () => {
                    persisted += 1;
                    return { imageColor: "#123456", imageUri: `file:///logo-${persisted}.png` };
                },
            })
        );

        expect(touched).toBe(2);
        expect((await row(db, "bare")).imageUri).not.toBe((await row(db, "accented")).imageUri);
        await expect(row(db, "bare")).resolves.toMatchObject({ categoryId: "groceries", imageColor: "#123456" });
        await expect(row(db, "accented")).resolves.toMatchObject({ categoryId: "groceries" });
        await expect(row(db, "other-currency")).resolves.toMatchObject({ categoryId: null, imageUri: null });
        await expect(row(db, "other-merchant")).resolves.toMatchObject({ categoryId: null, imageUri: null });
        expect((await row(db, "source")).imageUri).toBeNull();
    });

    it("keeps a sibling's own category, and a category from the other side of the ledger", async () => {
        await db.insert(categories).values({ color: "#fff", id: "work", income: false, name: "Work", updatedAt: NOW });
        await seedRow(db, "filed", { categoryId: "work" });
        await seedRow(db, "refund", { income: true });

        await applyMerchantToSiblings(db, input({ categoryId: "groceries" }));

        expect((await row(db, "filed")).categoryId).toBe("work");
        expect((await row(db, "refund")).categoryId).toBeNull();
    });

    it("replaces an image but never an emoji, glyph or tint, and releases the dismissal it overrides", async () => {
        await seedRow(db, "old-logo", { imageColor: "#000", imageUri: "file:///old.png" });
        await seedRow(db, "emoji", { emoji: "🛒" });
        await seedRow(db, "tinted", { customColor: "#f00" });
        await rememberLogoDismissal(db, "old-logo");

        await applyMerchantToSiblings(
            db,
            input({ persistLogo: async () => ({ imageColor: "#0f0", imageUri: "file:///new.png" }) })
        );

        await expect(row(db, "old-logo")).resolves.toMatchObject({ imageColor: "#0f0", imageUri: "file:///new.png" });
        expect((await row(db, "emoji")).imageUri).toBeNull();
        expect((await row(db, "tinted")).imageUri).toBeNull();
        expect((await dismissedLogoIds(db)).has("old-logo")).toBe(false);
    });

    it("attaches tags only to siblings that carry none", async () => {
        await db.insert(tags).values({ id: "tag-own", name: "Own", updatedAt: NOW });
        await seedRow(db, "untagged");
        await seedRow(db, "tagged");
        await tagsRepo.setTagsFor(db, "tagged", ["tag-own"]);

        await applyMerchantToSiblings(db, input({ tagIds: ["tag-food"] }));

        expect((await tagIdsForQuery(db, "untagged")).map((r) => r.tagId)).toStrictEqual(["tag-food"]);
        expect((await tagIdsForQuery(db, "tagged")).map((r) => r.tagId)).toStrictEqual(["tag-own"]);
    });

    it("matches a default-currency row's siblings whether they store null or the code", async () => {
        await seedRow(db, "implicit", { currency: null });
        await seedRow(db, "explicit", { currency: "USD" });
        await seedRow(db, "other", { currency: "EUR" });

        await applyMerchantToSiblings(db, input({ categoryId: "groceries", currency: null }));

        expect((await row(db, "implicit")).categoryId).toBe("groceries");
        expect((await row(db, "explicit")).categoryId).toBe("groceries");
        expect((await row(db, "other")).categoryId).toBeNull();
    });

    it("leaves a sibling that changed under it alone and discards the file", async () => {
        await seedRow(db, "moved");
        const discarded: string[] = [];

        await applyMerchantToSiblings(
            db,
            input({
                categoryId: "groceries",
                discard: (uri) => discarded.push(uri),
                persistLogo: async () => {
                    await db
                        .update(transactions)
                        .set({ emoji: "🛒", updatedAt: new Date(NOW.getTime() + 1000) })
                        .where(eq(transactions.id, "moved"));
                    return { imageColor: null, imageUri: "file:///late.png" };
                },
            })
        );

        await expect(row(db, "moved")).resolves.toMatchObject({ categoryId: null, emoji: "🛒", imageUri: null });
        expect(discarded).toStrictEqual(["file:///late.png"]);
    });

    it("attaches no tags to a sibling that was renamed while the logo was being persisted", async () => {
        await seedRow(db, "renamed");

        await applyMerchantToSiblings(
            db,
            input({
                persistLogo: async () => {
                    await db
                        .update(transactions)
                        .set({ note: "Carrefour", updatedAt: new Date(NOW.getTime() + 1000) })
                        .where(eq(transactions.id, "renamed"));
                    return { imageColor: null, imageUri: "file:///late.png" };
                },
                tagIds: ["tag-food"],
            })
        );

        await expect(tagIdsForQuery(db, "renamed")).resolves.toStrictEqual([]);
        expect((await row(db, "renamed")).imageUri).toBeNull();
    });

    it("attaches tags only behind the same live-row check when there is nothing else to write", async () => {
        await seedRow(db, "first", { date: new Date(NOW.getTime() + 1000) });
        await seedRow(db, "moved", { emoji: "🛒" });

        const touched = await applyMerchantToSiblings(
            db,
            input({
                persistLogo: async () => {
                    await db
                        .update(transactions)
                        .set({ updatedAt: new Date(NOW.getTime() + 5000) })
                        .where(eq(transactions.id, "moved"));
                    return { imageColor: null, imageUri: "file:///first.png" };
                },
                tagIds: ["tag-food"],
            })
        );

        expect(touched).toBe(1);
        expect((await tagIdsForQuery(db, "first")).map((r) => r.tagId)).toStrictEqual(["tag-food"]);
        await expect(tagIdsForQuery(db, "moved")).resolves.toStrictEqual([]);
    });

    it("revives a retired link for the same pair rather than inserting a second one", async () => {
        await seedRow(db, "retired");
        await tagsRepo.setTagsFor(db, "retired", ["tag-food"]);
        await tagsRepo.setTagsFor(db, "retired", []);
        const before = await db.select().from(transactionTags).where(eq(transactionTags.transactionId, "retired"));
        expect(before).toHaveLength(1);
        expect(before[0].deletedAt).not.toBeNull();

        await applyMerchantToSiblings(db, input({ tagIds: ["tag-food"] }));

        const after = await db.select().from(transactionTags).where(eq(transactionTags.transactionId, "retired"));
        expect(after).toHaveLength(1);
        expect(after[0]).toMatchObject({ deletedAt: null, id: before[0].id, tagId: "tag-food" });
    });

    it("keeps a bare sibling the backfill's when only a category is carried", async () => {
        await seedRow(db, "bare");
        await rememberLogoCandidate(db, "bare", NOW.getTime(), 14 * 24 * 60 * 60 * 1000);

        await applyMerchantToSiblings(db, input({ categoryId: "groceries" }));

        const after = await row(db, "bare");
        expect(after.categoryId).toBe("groceries");
        expect((await candidateLogoIds(db)).get("bare")).toBe(after.updatedAt.getTime());
    });

    it("moves a painted row's clock forward so the sync keeps the paint", async () => {
        await seedRow(db, "bare", { updatedAt: new Date(Date.now() + 60_000) });
        const before = (await row(db, "bare")).updatedAt.getTime();

        await applyMerchantToSiblings(
            db,
            input({ persistLogo: async () => ({ imageColor: null, imageUri: "file:///new.png" }) })
        );

        expect((await row(db, "bare")).updatedAt.getTime()).toBeGreaterThan(before);
    });
});
