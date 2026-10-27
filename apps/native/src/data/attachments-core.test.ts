import { describe, expect, it } from "@jest/globals";
import * as Effect from "effect/Effect";

import { transactionAttachments } from "@/db/schema";
import { migratedDatabase } from "@/db/test-database";

import { attachmentsForQuery, attachmentsRepo } from "./attachments-core";

const SAVED = new Date("2026-10-01T10:00:00.000Z");
const EDITED = new Date("2026-10-02T10:00:00.000Z");

async function seeded() {
    const db = migratedDatabase({ foreignKeys: false });
    await db.insert(transactionAttachments).values([
        {
            id: "receipt",
            imageKey: "transaction-photos/u/receipt.jpg",
            imageUri: "file:///p/receipt.jpg",
            sortOrder: 0,
            transactionId: "tx",
            updatedAt: SAVED,
        },
        {
            id: "invoice",
            imageKey: "transaction-photos/u/invoice.pdf",
            imageUri: "file:///p/invoice.pdf",
            name: "invoice.pdf",
            sortOrder: 1,
            transactionId: "tx",
            updatedAt: SAVED,
        },
    ]);
    return db;
}

describe("attachmentsRepo.writeFor", () => {
    it("tombstones only what the draft dropped, keeping its key, and adds what it gained", async () => {
        const db = await seeded();
        const [receipt] = await attachmentsForQuery(db, "tx");

        await Effect.runPromise(
            attachmentsRepo.writeFor(
                db,
                "tx",
                [receipt, { id: null, imageKey: null, imageUri: "file:///p/new.jpg", name: null }],
                EDITED
            )
        );

        const rows = await db.select().from(transactionAttachments);
        expect(rows.find((row) => row.id === "receipt")).toMatchObject({ deletedAt: null, updatedAt: SAVED });
        expect(rows.find((row) => row.id === "invoice")).toMatchObject({
            deletedAt: EDITED,
            imageKey: "transaction-photos/u/invoice.pdf",
        });
        expect((await attachmentsForQuery(db, "tx")).map((row) => row.imageUri)).toStrictEqual([
            "file:///p/receipt.jpg",
            "file:///p/new.jpg",
        ]);
    });
});
