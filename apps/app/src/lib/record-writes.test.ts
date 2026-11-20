import { describe, expect, it } from "vite-plus/test";

import { entryFiles } from "./entry-record";
import type { Attachment, RecordBooks, SplitPart } from "./ledger-db";
import { attachedFile, removedFile, splitRows } from "./record-writes";

const AT = 1000;
const envelope = (localId: string, extra: Record<string, unknown>) => ({
    deletedAt: null,
    deviceId: "phone",
    localId,
    restoredAt: null,
    seq: 1,
    updatedAt: 500,
    userId: "u",
    ...extra,
});
const part = (localId: string, extra: Record<string, unknown>) =>
    // SAFETY: the rows carry every field these writes read; the Convex document ids are not under test.
    envelope(localId, {
        amount: 0,
        categoryId: "food",
        sortOrder: 0,
        transactionId: "costco",
        ...extra,
    }) as unknown as SplitPart;
const file = (localId: string, extra: Record<string, unknown>) =>
    // SAFETY: as above.
    envelope(localId, {
        imageKey: `transaction-photos/u/${localId}.jpg`,
        name: null,
        sortOrder: 0,
        transactionId: "costco",
        ...extra,
    }) as unknown as Attachment;
const books = (splits: SplitPart[], attachments: Attachment[] = []): RecordBooks => ({ attachments, splits });

const ENTRY = { amount: 186.77, id: "costco" };
const PARTS = [
    { amount: 164.78, categoryId: "groceries" },
    { amount: 21.99, categoryId: "shopping" },
];

describe("splitRows", () => {
    it("refuses parts that do not add up to the entry", () => {
        expect(
            splitRows(
                books([]),
                ENTRY,
                [
                    { amount: 164.78, categoryId: "groceries" },
                    { amount: 20, categoryId: "shopping" },
                ],
                2,
                AT
            )
        ).toBeNull();
    });

    it("retires the live parts and writes the new ones in order", () => {
        const old = [
            part("a", { amount: 100, sortOrder: 0 }),
            part("b", { amount: 86.77, sortOrder: 1 }),
            part("gone", { deletedAt: 300 }),
            part("other", { transactionId: "uber" }),
        ];
        const rows = splitRows(books(old), ENTRY, PARTS, 2, AT) ?? [];
        expect(rows.filter((row) => row.deletedAt !== null).map((row) => row.localId)).toStrictEqual(["a", "b"]);
        expect(rows.filter((row) => row.deletedAt === null).map((row) => row.fields)).toStrictEqual([
            { amount: 164.78, categoryId: "groceries", sortOrder: 0, transactionId: "costco" },
            { amount: 21.99, categoryId: "shopping", sortOrder: 1, transactionId: "costco" },
        ]);
    });

    it("stores a single part as no split, so the entry reads as its own category", () => {
        const rows = splitRows(
            books([part("a", {}), part("b", { sortOrder: 1 })]),
            ENTRY,
            [{ amount: 186.77, categoryId: "food" }],
            2,
            AT
        );
        expect(rows?.every((row) => row.deletedAt !== null)).toBeTruthy();
        expect(rows).toHaveLength(2);
    });
});

describe("removedFile", () => {
    it("opens a later era than a restore stamped ahead of this device's clock", () => {
        const row = removedFile(file("receipt", { restoredAt: 5000, updatedAt: 5000 }), AT);
        expect(row.deletedAt).toBe(5001);
        expect(row.updatedAt).toBe(5001);
    });
});

describe("attachedFile", () => {
    it("goes after the entry's last live file", () => {
        const held = [
            file("a", { sortOrder: 0 }),
            file("b", { sortOrder: 3 }),
            file("deleted", { deletedAt: 400, sortOrder: 9 }),
            file("elsewhere", { sortOrder: 7, transactionId: "uber" }),
        ];
        const row = attachedFile(
            books([], held),
            "costco",
            { imageKey: "transaction-photos/u/new.pdf", name: "Warranty.pdf" },
            AT
        );
        expect(row.fields).toMatchObject({ sortOrder: 4, transactionId: "costco" });
    });
});

describe("entryFiles", () => {
    const RECEIPT = JSON.stringify({
        items: [{ name: "Paper towels", price: 21.99, quantity: 1 }],
        subtotal: null,
        tax: null,
        tip: null,
    });

    it("puts the scanned lines on the first photo, not on a PDF before it", () => {
        const files = entryFiles(
            books(
                [],
                [
                    file("warranty", { imageKey: "transaction-photos/u/w.pdf", sortOrder: 0 }),
                    file("scan", { sortOrder: 1 }),
                ]
            ),
            "costco",
            RECEIPT
        );
        expect(files.map((each) => [each.kind, each.receipt === null])).toStrictEqual([
            ["pdf", true],
            ["image", false],
        ]);
    });
});
