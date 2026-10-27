import { describe, expect, it, jest } from "@jest/globals";
import { eq } from "drizzle-orm";
import * as Effect from "effect/Effect";

import type { Database } from "@/db/client";
import { categories, transactions } from "@/db/schema";
import { migratedDatabase } from "@/db/test-database";
import { asCloudCall } from "@/lib/fake-cloud";

import { getMeta, META_KEYS } from "./app-meta-core";
import { categoriesRepo } from "./categories-core";
import { applyEnrichmentAnswer, queueEnrichment, sendQueuedEnrichment } from "./enrichment-queue-core";
import type { ApplyDeps, EnrichmentAnswer, EnrichmentJobRequest } from "./enrichment-queue-core";
import { recallMerchant } from "./merchant-book-core";
import { tagIdsForQuery } from "./tags-core";

const NOW = new Date("2026-09-19T12:00:00Z");
const LOGO = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

const ANSWER: EnrichmentAnswer = {
    categoryName: "Travel",
    domain: "care4bag.gr",
    emoji: null,
    isNewCategory: true,
    merchantName: "Care4Bag",
    parentCategoryName: null,
    tags: ["luggage", "airport"],
};

async function seedRow(
    db: Database,
    id: string,
    note: string,
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
        note,
        updatedAt: NOW,
        ...overrides,
    });
}

async function readRow(db: Database, id: string) {
    const [row] = await db.select().from(transactions).where(eq(transactions.id, id));
    return row;
}

function applyDeps(): ApplyDeps {
    return {
        discard: jest.fn(),
        fetchImage: () => Effect.succeed({ bytes: LOGO, kind: "logo" }),
        persist: async () => ({ imageColor: "#123456", imageUri: "file:///photos/care4bag.jpg" }),
    };
}

describe("sendQueuedEnrichment", () => {
    it("sends each queued row with its side's categories, and forgets the ones it sent", async () => {
        const db = await migratedDatabase();
        await Effect.runPromise(
            categoriesRepo.create(db, { color: "#000000", icon: "Airplane01", income: false, name: "Trips" })
        );
        await seedRow(db, "tx-1", "CARE4BAG AE");
        await Effect.runPromise(queueEnrichment(db, "tx-1"));
        const sent: EnrichmentJobRequest[] = [];

        await Effect.runPromise(
            sendQueuedEnrichment(db, {
                enqueue: asCloudCall(async (request: EnrichmentJobRequest) => {
                    sent.push(request);
                    return true;
                }),
                groundedLookup: true,
                regionCode: "VE",
            })
        );

        expect(sent).toHaveLength(1);
        expect(sent[0]).toMatchObject({ currency: "EUR", localId: "tx-1", name: "CARE4BAG AE", regionCode: "VE" });
        expect(sent[0]?.categoryTree).toContainEqual({ children: [], name: "Trips" });
        expect(JSON.parse((await Effect.runPromise(getMeta(db, META_KEYS.enrichmentOutbox))) ?? "null")).toStrictEqual(
            []
        );
    });

    it("keeps what it could not send for the next pass", async () => {
        const db = await migratedDatabase();
        await seedRow(db, "tx-1", "CARE4BAG AE");
        await seedRow(db, "tx-2", "NYX*VenetisABEET");
        await Effect.runPromise(queueEnrichment(db, "tx-1"));
        await Effect.runPromise(queueEnrichment(db, "tx-2"));
        const enqueue = jest.fn(
            asCloudCall(async (_request: EnrichmentJobRequest): Promise<boolean> => {
                throw new Error("offline");
            })
        );

        await Effect.runPromise(sendQueuedEnrichment(db, { enqueue, groundedLookup: true }));

        expect(enqueue).toHaveBeenCalledTimes(1);
        expect(JSON.parse((await Effect.runPromise(getMeta(db, META_KEYS.enrichmentOutbox))) ?? "null")).toStrictEqual([
            "tx-1",
            "tx-2",
        ]);
    });
});

describe("applyEnrichmentAnswer", () => {
    it("names, files, tags and paints a row that has none of them, keeping the descriptor in its notes", async () => {
        const db = await migratedDatabase();
        await seedRow(db, "tx-1", "CARE4BAG AE");

        await Effect.runPromise(
            applyEnrichmentAnswer(db, { localId: "tx-1", name: "CARE4BAG AE", result: ANSWER }, applyDeps())
        );

        const row = await readRow(db, "tx-1");
        expect(row).toMatchObject({
            details: "CARE4BAG AE",
            imageColor: "#123456",
            imageUri: "file:///photos/care4bag.jpg",
            note: "Care4Bag",
        });
        const [category] = await db
            .select()
            .from(categories)
            .where(eq(categories.id, row?.categoryId ?? ""));
        expect(category?.name).toBe("Travel");
        await expect(tagIdsForQuery(db, "tx-1")).resolves.toHaveLength(2);
        await expect(Effect.runPromise(recallMerchant(db, "CARE4BAG AE", "EUR"))).resolves.toMatchObject({
            domain: "care4bag.gr",
        });
    });

    it("leaves what the owner already chose, without fetching a logo it has nowhere to put", async () => {
        const db = await migratedDatabase();
        const mine = await Effect.runPromise(
            categoriesRepo.create(db, {
                color: "#000000",
                icon: "Briefcase01",
                income: false,
                name: "Work",
            })
        );
        await seedRow(db, "tx-1", "Care4Bag at the airport", { categoryId: mine, emoji: "🧳" });
        const deps = applyDeps();
        const fetchImage = jest.fn(deps.fetchImage);

        await Effect.runPromise(
            applyEnrichmentAnswer(db, { localId: "tx-1", name: "CARE4BAG AE", result: ANSWER }, { ...deps, fetchImage })
        );

        await expect(readRow(db, "tx-1")).resolves.toMatchObject({
            categoryId: mine,
            details: null,
            emoji: "🧳",
            imageUri: null,
            note: "Care4Bag at the airport",
        });
        expect(fetchImage).not.toHaveBeenCalled();
    });
});
