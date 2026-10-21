import { describe, expect, it } from "@jest/globals";
import BetterSqlite3 from "better-sqlite3";
import { eq } from "drizzle-orm";

import { accounts, transactions } from "@/db/schema";
import { testSpendDb } from "@/db/test-database";

import type { SpendDb } from "./budget-spent";
import type { PhotoFiles } from "./photo-store-core";
import {
    downloadEveryPhoto,
    downloadPhotos,
    PHOTO_SYNC_BATCH,
    photoNameFromKey,
    runPhotoSync,
    uploadPhotos,
} from "./photo-sync-core";
import type { PhotoTransport } from "./photo-sync-core";

const DIRECTORY = "file:///container-a/Documents/transaction-photos";
const PEER_DIRECTORY = "file:///container-b/Documents/transaction-photos";
const NOW = new Date(Date.UTC(2026, 6, 29, 12));
const USER = "user-aaaa";

function makeDb(): SpendDb {
    const sqlite = new BetterSqlite3(":memory:");
    sqlite.exec(`
		CREATE TABLE transactions (
			id text PRIMARY KEY NOT NULL,
			amount real NOT NULL,
			income integer NOT NULL,
			currency text,
			note text NOT NULL DEFAULT '',
			details text,
			date integer NOT NULL,
			day integer NOT NULL,
			month integer NOT NULL,
			icon text,
			emoji text,
			customColor text,
			imageColor text,
			imageUri text,
			imageKey text,
			onceRecurring integer NOT NULL DEFAULT 0,
			recurringType integer NOT NULL DEFAULT 0,
			recurringCoefficient integer NOT NULL DEFAULT 1,
			recurringEndDate integer,
			recurringAnchorDay integer,
			reminderLeadDays integer,
			categoryId text,
			accountId text,
			amountUsd real,
			exchangeRate real,
			exchangeRateType text,
			transferId text,
			feeForId text,
			feeRate real,
			paidVia text,
			installmentId text,
			restoredAt integer,
			updatedAt integer NOT NULL,
			deletedAt integer
		);
		CREATE TABLE accounts (
			id text PRIMARY KEY NOT NULL,
			name text NOT NULL,
			currency text NOT NULL,
			initialBalance real NOT NULL DEFAULT 0,
			initialBalanceUsd real,
			initialBalanceDate integer NOT NULL,
			kind text NOT NULL DEFAULT 'asset',
			icon text,
			emoji text,
			customColor text,
			imageColor text,
			imageUri text,
			imageKey text,
			sortOrder integer NOT NULL DEFAULT 0,
			dateCreated integer NOT NULL,
			updatedAt integer NOT NULL,
			deletedAt integer
		);
	`);
    return testSpendDb(sqlite);
}

const EARLIER = new Date(Date.UTC(2026, 6, 1));

async function insert(db: SpendDb, id: string, values: { imageUri?: string | null; imageKey?: string | null } = {}) {
    await db.insert(transactions).values({
        amount: 10,
        date: NOW,
        day: NOW,
        deletedAt: null,
        id,
        imageKey: values.imageKey ?? null,
        imageUri: values.imageUri ?? null,
        income: false,
        month: NOW,
        note: id,
        updatedAt: EARLIER,
    });
}

async function readRow(db: SpendDb, id: string) {
    const rows = await db
        .select({
            imageKey: transactions.imageKey,
            imageUri: transactions.imageUri,
            updatedAt: transactions.updatedAt,
        })
        .from(transactions)
        .where(eq(transactions.id, id));
    return rows[0];
}

async function insertAccount(
    db: SpendDb,
    id: string,
    values: { imageUri?: string | null; imageKey?: string | null } = {}
) {
    await db.insert(accounts).values({
        currency: "USD",
        dateCreated: NOW,
        deletedAt: null,
        id,
        imageKey: values.imageKey ?? null,
        imageUri: values.imageUri ?? null,
        initialBalance: 0,
        initialBalanceDate: NOW,
        name: id,
        updatedAt: EARLIER,
    });
}

async function readAccount(db: SpendDb, id: string) {
    const rows = await db
        .select({
            imageKey: accounts.imageKey,
            imageUri: accounts.imageUri,
            updatedAt: accounts.updatedAt,
        })
        .from(accounts)
        .where(eq(accounts.id, id));
    return rows[0];
}

class FakeFiles implements PhotoFiles {
    readonly directoryUri: string;
    bytes = new Map<string, Uint8Array>();

    constructor(directoryUri = DIRECTORY, seeded: [string, string][] = []) {
        this.directoryUri = directoryUri;
        for (const [name, body] of seeded) {
            this.bytes.set(name, new TextEncoder().encode(body));
        }
    }

    list() {
        return [...this.bytes.keys()].map((name) => ({ modifiedAt: 0, name }));
    }

    remove(name: string) {
        this.bytes.delete(name);
    }

    adopt() {
        return false;
    }

    read(name: string) {
        return this.bytes.get(name) ?? null;
    }

    write(name: string, bytes: Uint8Array) {
        this.bytes.set(name, bytes);
    }
}

interface FakeBucket {
    confirmed: string[];
    objects: Map<string, Uint8Array>;
    released: string[];
}

// Stands in for R2 plus `packages/backend/convex/photos.ts`, minting the same account-namespaced key shape.
function fakeTransport(
    bucket: FakeBucket = { confirmed: [], objects: new Map(), released: [] },
    overrides: Partial<PhotoTransport> = {}
): { bucket: FakeBucket; transport: PhotoTransport } {
    const transport: PhotoTransport = {
        async confirmUpload(key) {
            bucket.confirmed.push(key);
        },
        async get(url) {
            return bucket.objects.get(url.replace("https://r2.test/get/", "")) ?? null;
        },
        async put(url, bytes) {
            bucket.objects.set(url.replace("https://r2.test/put/", ""), bytes);
            return null;
        },
        async readUrls(keys) {
            return keys.map((key) => ({ key, url: `https://r2.test/get/${key}` }));
        },
        async release(key) {
            bucket.released.push(key);
            bucket.objects.delete(key);
        },
        async requestUpload(name) {
            const key = `transaction-photos/${USER}/${name}`;
            return { key, url: `https://r2.test/put/${key}` };
        },
        ...overrides,
    };
    return { bucket, transport };
}

describe("photoNameFromKey", () => {
    it("answers null for something that is not a key", () => {
        expect(photoNameFromKey("abc.jpg")).toBeNull();
        expect(photoNameFromKey("a/")).toBeNull();
    });
});

describe("uploadPhotos", () => {
    it("sends the bytes and records the key", async () => {
        const db = makeDb();
        const files = new FakeFiles(DIRECTORY, [["a.jpg", "PHOTO"]]);
        const { bucket, transport } = fakeTransport();
        await insert(db, "t1", { imageUri: `${DIRECTORY}/a.jpg` });

        const result = await uploadPhotos(db, files, transport, NOW);

        expect(result.uploaded).toBe(1);
        const row = await readRow(db, "t1");
        expect(row.imageKey).toBe(`transaction-photos/${USER}/a.jpg`);
        expect(bucket.objects.get(`transaction-photos/${USER}/a.jpg`)).toStrictEqual(new TextEncoder().encode("PHOTO"));
        expect(bucket.confirmed).toStrictEqual([`transaction-photos/${USER}/a.jpg`]);
    });

    it("bumps updatedAt so the key is not outranked by an older peer edit", async () => {
        const db = makeDb();
        const files = new FakeFiles(DIRECTORY, [["a.jpg", "PHOTO"]]);
        const { transport } = fakeTransport();
        await insert(db, "t1", { imageUri: `${DIRECTORY}/a.jpg` });

        await uploadPhotos(db, files, transport, NOW);

        expect((await readRow(db, "t1")).updatedAt.getTime()).toBe(NOW.getTime());
    });

    it("is a no-op once the key already names the photo", async () => {
        const db = makeDb();
        const files = new FakeFiles(DIRECTORY, [["a.jpg", "PHOTO"]]);
        const { bucket, transport } = fakeTransport();
        await insert(db, "t1", {
            imageKey: `transaction-photos/${USER}/a.jpg`,
            imageUri: `${DIRECTORY}/a.jpg`,
        });

        expect((await uploadPhotos(db, files, transport, NOW)).uploaded).toBe(0);
        expect(bucket.confirmed).toHaveLength(0);
    });

    it("re-uses the same key when a previous attempt died mid-PUT", async () => {
        const db = makeDb();
        const files = new FakeFiles(DIRECTORY, [["a.jpg", "PHOTO"]]);
        const bucket: FakeBucket = {
            confirmed: [],
            objects: new Map(),
            released: [],
        };
        const failing = fakeTransport(bucket, {
            put() {
                return Promise.reject(new Error("connection lost"));
            },
        });
        await insert(db, "t1", { imageUri: `${DIRECTORY}/a.jpg` });

        await expect(uploadPhotos(db, files, failing.transport, NOW)).rejects.toThrow();
        expect((await readRow(db, "t1")).imageKey).toBeNull();

        const retry = fakeTransport(bucket);
        expect((await uploadPhotos(db, files, retry.transport, NOW)).uploaded).toBe(1);
        expect([...bucket.objects.keys()]).toStrictEqual([`transaction-photos/${USER}/a.jpg`]);
        expect((await readRow(db, "t1")).imageKey).toBe(`transaction-photos/${USER}/a.jpg`);
    });

    it("releases the superseded object when the photo is replaced", async () => {
        const db = makeDb();
        const files = new FakeFiles(DIRECTORY, [
            ["old.jpg", "OLD"],
            ["new.jpg", "NEW"],
        ]);
        const { bucket, transport } = fakeTransport();
        bucket.objects.set(`transaction-photos/${USER}/old.jpg`, new TextEncoder().encode("OLD"));
        await insert(db, "t1", {
            imageKey: `transaction-photos/${USER}/old.jpg`,
            imageUri: `${DIRECTORY}/new.jpg`,
        });

        const result = await uploadPhotos(db, files, transport, NOW);

        expect(result.released).toBe(1);
        expect(bucket.released).toStrictEqual([`transaction-photos/${USER}/old.jpg`]);
        expect((await readRow(db, "t1")).imageKey).toBe(`transaction-photos/${USER}/new.jpg`);
    });

    it("keeps the new key when releasing the old object fails", async () => {
        const db = makeDb();
        const files = new FakeFiles(DIRECTORY, [["new.jpg", "NEW"]]);
        const { transport } = fakeTransport(undefined, {
            release() {
                return Promise.reject(new Error("offline"));
            },
        });
        await insert(db, "t1", {
            imageKey: `transaction-photos/${USER}/old.jpg`,
            imageUri: `${DIRECTORY}/new.jpg`,
        });

        const result = await uploadPhotos(db, files, transport, NOW);

        expect(result.uploaded).toBe(1);
        expect(result.released).toBe(0);
        expect((await readRow(db, "t1")).imageKey).toBe(`transaction-photos/${USER}/new.jpg`);
    });

    it("skips a row whose file the reconciliation has yet to repair", async () => {
        const db = makeDb();
        const files = new FakeFiles();
        const { bucket, transport } = fakeTransport();
        await insert(db, "t1", { imageUri: `${DIRECTORY}/gone.jpg` });

        expect((await uploadPhotos(db, files, transport, NOW)).uploaded).toBe(0);
        expect(bucket.confirmed).toHaveLength(0);
        expect((await readRow(db, "t1")).imageKey).toBeNull();
    });

    it("sends an account logo and records its key", async () => {
        const db = makeDb();
        const files = new FakeFiles(DIRECTORY, [["logo.jpg", "LOGO"]]);
        const { bucket, transport } = fakeTransport();
        await insertAccount(db, "a1", { imageUri: `${DIRECTORY}/logo.jpg` });

        const result = await uploadPhotos(db, files, transport, NOW);

        expect(result.uploaded).toBe(1);
        const row = await readAccount(db, "a1");
        expect(row.imageKey).toBe(`transaction-photos/${USER}/logo.jpg`);
        expect(row.updatedAt.getTime()).toBe(NOW.getTime());
        expect(bucket.objects.get(`transaction-photos/${USER}/logo.jpg`)).toStrictEqual(
            new TextEncoder().encode("LOGO")
        );
    });

    it("spends one batch across every table rather than one each", async () => {
        const db = makeDb();
        const seeded: [string, string][] = [["logo.jpg", "LOGO"]];
        for (let i = 0; i < PHOTO_SYNC_BATCH; i += 1) {
            seeded.push([`p${i}.jpg`, `BODY${i}`]);
        }
        const files = new FakeFiles(DIRECTORY, seeded);
        const { transport } = fakeTransport();
        for (let i = 0; i < PHOTO_SYNC_BATCH; i += 1) {
            await insert(db, `t${i}`, { imageUri: `${DIRECTORY}/p${i}.jpg` });
        }
        await insertAccount(db, "a1", { imageUri: `${DIRECTORY}/logo.jpg` });

        expect((await uploadPhotos(db, files, transport, NOW)).uploaded).toBe(PHOTO_SYNC_BATCH);
        expect((await readAccount(db, "a1")).imageKey).toBeNull();
    });
});

describe("downloadPhotos", () => {
    it("fetches a photo whose row arrived first", async () => {
        const db = makeDb();
        const peer = new FakeFiles(PEER_DIRECTORY);
        const { bucket, transport } = fakeTransport();
        bucket.objects.set(`transaction-photos/${USER}/a.jpg`, new TextEncoder().encode("PHOTO"));
        await insert(db, "t1", { imageKey: `transaction-photos/${USER}/a.jpg` });

        await expect(downloadPhotos(db, peer, transport)).resolves.toBe(1);
        expect(peer.read("a.jpg")).toStrictEqual(new TextEncoder().encode("PHOTO"));
        expect((await readRow(db, "t1")).imageUri).toBe(`${PEER_DIRECTORY}/a.jpg`);
    });

    it("leaves the row renderable through the existing fallback until the bytes land", async () => {
        const db = makeDb();
        const peer = new FakeFiles(PEER_DIRECTORY);
        const { transport } = fakeTransport();
        await insert(db, "t1", { imageKey: `transaction-photos/${USER}/a.jpg` });

        await expect(downloadPhotos(db, peer, transport)).resolves.toBe(0);
        const row = await readRow(db, "t1");
        expect(row.imageUri).toBeNull();
        expect(row.imageKey).toBe(`transaction-photos/${USER}/a.jpg`);
    });

    it("re-points to a file already on disk without fetching", async () => {
        const db = makeDb();
        const files = new FakeFiles(DIRECTORY, [["a.jpg", "PHOTO"]]);
        let fetched = 0;
        const { transport } = fakeTransport(undefined, {
            async readUrls(keys) {
                fetched += keys.length;
                return keys.map((key) => ({ key, url: `https://r2.test/get/${key}` }));
            },
        });
        await insert(db, "t1", { imageKey: `transaction-photos/${USER}/a.jpg` });

        await downloadPhotos(db, files, transport);

        expect(fetched).toBe(0);
        expect((await readRow(db, "t1")).imageUri).toBe(`${DIRECTORY}/a.jpg`);
    });

    it("does not touch a row the user cleared the photo from", async () => {
        const db = makeDb();
        const peer = new FakeFiles(PEER_DIRECTORY);
        const { bucket, transport } = fakeTransport();
        bucket.objects.set(`transaction-photos/${USER}/a.jpg`, new TextEncoder().encode("PHOTO"));
        await insert(db, "t1", { imageKey: null, imageUri: null });

        await expect(downloadPhotos(db, peer, transport)).resolves.toBe(0);
        expect((await readRow(db, "t1")).imageUri).toBeNull();
    });

    it("serves two rows sharing one photo from a single fetch", async () => {
        const db = makeDb();
        const peer = new FakeFiles(PEER_DIRECTORY);
        const { bucket, transport } = fakeTransport();
        const key = `transaction-photos/${USER}/a.jpg`;
        bucket.objects.set(key, new TextEncoder().encode("PHOTO"));
        await insert(db, "t1", { imageKey: key });
        await insert(db, "t2", { imageKey: key });

        await expect(downloadPhotos(db, peer, transport)).resolves.toBe(2);
        expect((await readRow(db, "t1")).imageUri).toBe(`${PEER_DIRECTORY}/a.jpg`);
        expect((await readRow(db, "t2")).imageUri).toBe(`${PEER_DIRECTORY}/a.jpg`);
    });

    it("fetches an account logo whose row arrived first", async () => {
        const db = makeDb();
        const peer = new FakeFiles(PEER_DIRECTORY);
        const { bucket, transport } = fakeTransport();
        bucket.objects.set(`transaction-photos/${USER}/logo.jpg`, new TextEncoder().encode("LOGO"));
        await insertAccount(db, "a1", {
            imageKey: `transaction-photos/${USER}/logo.jpg`,
        });

        await expect(downloadPhotos(db, peer, transport)).resolves.toBe(1);
        expect(peer.read("logo.jpg")).toStrictEqual(new TextEncoder().encode("LOGO"));
        const row = await readAccount(db, "a1");
        expect(row.imageUri).toBe(`${PEER_DIRECTORY}/logo.jpg`);
        expect(row.updatedAt.getTime()).toBe(EARLIER.getTime());
    });
});

describe("downloadEveryPhoto", () => {
    it("keeps fetching past one batch until nothing is missing", async () => {
        const db = makeDb();
        const peer = new FakeFiles(PEER_DIRECTORY);
        const { bucket, transport } = fakeTransport();
        const total = PHOTO_SYNC_BATCH + 3;
        for (let i = 0; i < total; i += 1) {
            const key = `transaction-photos/${USER}/p${i}.jpg`;
            bucket.objects.set(key, new TextEncoder().encode("PHOTO"));
            await insert(db, `t${i}`, { imageKey: key });
        }

        await downloadEveryPhoto(db, peer, transport);

        expect(peer.list()).toHaveLength(total);
    });
});

describe("runPhotoSync", () => {
    it("carries a photo from one device to another through the bucket", async () => {
        const bucket: FakeBucket = {
            confirmed: [],
            objects: new Map(),
            released: [],
        };

        const deviceA = makeDb();
        const filesA = new FakeFiles(DIRECTORY, [["a.jpg", "PHOTO"]]);
        await insert(deviceA, "t1", { imageUri: `${DIRECTORY}/a.jpg` });
        await runPhotoSync(deviceA, filesA, fakeTransport(bucket).transport, NOW);

        const key = (await readRow(deviceA, "t1")).imageKey;
        expect(key).toBe(`transaction-photos/${USER}/a.jpg`);

        const deviceB = makeDb();
        const filesB = new FakeFiles(PEER_DIRECTORY);
        await insert(deviceB, "t1", { imageKey: key });

        const result = await runPhotoSync(deviceB, filesB, fakeTransport(bucket).transport, NOW);

        expect(result.downloaded).toBe(1);
        expect(filesB.read("a.jpg")).toStrictEqual(new TextEncoder().encode("PHOTO"));
        expect((await readRow(deviceB, "t1")).imageUri).toBe(`${PEER_DIRECTORY}/a.jpg`);
    });

    it("is idempotent", async () => {
        const bucket: FakeBucket = {
            confirmed: [],
            objects: new Map(),
            released: [],
        };
        const db = makeDb();
        const files = new FakeFiles(DIRECTORY, [["a.jpg", "PHOTO"]]);
        await insert(db, "t1", { imageUri: `${DIRECTORY}/a.jpg` });

        await runPhotoSync(db, files, fakeTransport(bucket).transport, NOW);
        const second = await runPhotoSync(db, files, fakeTransport(bucket).transport, NOW);

        expect(second).toStrictEqual({ downloaded: 0, released: 0, uploaded: 0 });
        expect(bucket.confirmed).toHaveLength(1);
    });
});
