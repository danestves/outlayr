import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { eq, sql } from "drizzle-orm";

import type { Database } from "@/db/client";
import { transactions } from "@/db/schema";
import { migratedDatabase } from "@/db/test-database";
import { clearEnrichmentCache, getCachedEnrichment, setCachedEnrichment } from "@/domain/enrichment-cache";
import type { RemoteEnrichmentResult } from "@/domain/enrichment-cache";

import { attachMissingLogos } from "./logo-backfill-core";
import type { LogoBackfillDeps } from "./logo-backfill-core";
import { rememberLogoCandidate, rememberLogoDismissal } from "./logo-backfill-state";

const makeDb = migratedDatabase;

const NOW = new Date("2026-09-07T21:00:00Z");
const LOGO = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);

const REMOTE: RemoteEnrichmentResult = {
    categoryName: "Groceries",
    domain: "intermarche.com",
    isNewCategory: false,
    tags: [],
};

/** A classified name the model could not place: a real miss, unlike the all-null shape. */
const NOTHING: RemoteEnrichmentResult = { categoryName: "Shopping", domain: null, isNewCategory: false, tags: [] };

async function seedRow(
    db: Database,
    id: string,
    note: string,
    overrides: Partial<typeof transactions.$inferInsert> = {}
): Promise<void> {
    await rememberLogoCandidate(db, id, NOW.getTime(), 14 * 24 * 60 * 60 * 1000);
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

function makeDeps(overrides: Partial<LogoBackfillDeps> = {}): LogoBackfillDeps & {
    enrichCalls: string[];
    fetched: string[];
} {
    const enrichCalls: string[] = [];
    const fetched: string[] = [];
    return {
        enrich: async ({ name }) => {
            enrichCalls.push(name);
            return { groundedLookup: true, result: REMOTE };
        },
        enrichCalls,
        fetchImage: async ({ domain }) => {
            fetched.push(domain ?? "");
            return { bytes: LOGO, kind: "logo" };
        },
        fetched,
        now: NOW.getTime(),
        persist: async () => ({ imageColor: "#ff0000", imageUri: "file:///photos/logo.jpg" }),
        ...overrides,
    };
}

async function rowImage(db: Database, id: string) {
    const [row] = await db
        .select({ imageColor: transactions.imageColor, imageUri: transactions.imageUri })
        .from(transactions)
        .where(eq(transactions.id, id));
    return row;
}

describe("attachMissingLogos", () => {
    let db: Database;

    beforeEach(() => {
        db = makeDb();
        clearEnrichmentCache();
    });

    it("leaves a row that arrived by sync to the device that made it", async () => {
        await db.insert(transactions).values({
            amount: 10,
            currency: "EUR",
            date: NOW,
            day: NOW,
            id: "synced",
            income: false,
            month: NOW,
            note: "Intermarche",
            updatedAt: NOW,
        });
        const deps = makeDeps();

        await expect(attachMissingLogos(db, deps)).resolves.toBe(0);
        expect(deps.enrichCalls).toStrictEqual([]);
    });

    it("stops sending names the moment consent is withdrawn", async () => {
        await seedRow(db, "a", "Lescot", { date: NOW });
        await seedRow(db, "b", "Monoprix", { date: new Date(NOW.getTime() - 1000) });
        let calls = 0;
        const enrich = jest.fn<NonNullable<LogoBackfillDeps["enrich"]>>(async () => {
            calls += 1;
            return calls === 1 ? null : { groundedLookup: true, result: REMOTE };
        });

        await expect(attachMissingLogos(db, makeDeps({ enrich }))).resolves.toBe(0);

        expect(enrich).toHaveBeenCalledTimes(1);
    });

    it("leaves a row a peer has edited since this device wrote it bare", async () => {
        await seedRow(db, "a", "Intermarche");
        await db
            .update(transactions)
            .set({ updatedAt: new Date(NOW.getTime() + 1) })
            .where(eq(transactions.id, "a"));
        const deps = makeDeps();

        await expect(attachMissingLogos(db, deps)).resolves.toBe(0);
        expect(deps.enrichCalls).toStrictEqual([]);
    });

    it("lets a future-dated row age out by when it was saved, not by its date", async () => {
        await rememberLogoCandidate(db, "pending", NOW.getTime() - 15 * 24 * 60 * 60 * 1000, Number.POSITIVE_INFINITY);
        await db.insert(transactions).values({
            amount: 10,
            currency: "EUR",
            date: new Date(NOW.getTime() + 30 * 24 * 60 * 60 * 1000),
            day: NOW,
            id: "pending",
            income: false,
            month: NOW,
            note: "Intermarche",
            updatedAt: new Date(NOW.getTime() - 15 * 24 * 60 * 60 * 1000),
        });
        const deps = makeDeps();

        await expect(attachMissingLogos(db, deps)).resolves.toBe(0);
        expect(deps.enrichCalls).toStrictEqual([]);
    });

    it("keeps a retry deadline across launches", async () => {
        await seedRow(db, "a", "Iolanda");
        const enrich = jest.fn<NonNullable<LogoBackfillDeps["enrich"]>>(async () => ({
            groundedLookup: true,
            result: NOTHING,
        }));

        await attachMissingLogos(db, makeDeps({ enrich }));
        // A fresh process holds nothing in memory; only the row's database survives.
        await attachMissingLogos(db, makeDeps({ enrich }));

        expect(enrich).toHaveBeenCalledTimes(1);
    });

    it("paints every row of a merchant from one lookup, each with its own file", async () => {
        await seedRow(db, "a", "Intermarche");
        // An hour older, so the newest-first scan names the group by "a" without relying on SQLite's tie-break.
        await seedRow(db, "b", "INTERMARCHÉ", { date: new Date(NOW.getTime() - 3_600_000) });
        let persisted = 0;
        const deps = makeDeps({
            persist: async () => {
                persisted += 1;
                return { imageColor: "#ff0000", imageUri: `file:///photos/logo-${persisted}.jpg` };
            },
        });

        await expect(attachMissingLogos(db, deps)).resolves.toBe(2);

        expect(deps.enrichCalls).toStrictEqual(["Intermarche"]);
        expect(deps.fetched).toStrictEqual(["intermarche.com"]);
        await expect(rowImage(db, "a")).resolves.toStrictEqual({
            imageColor: "#ff0000",
            imageUri: "file:///photos/logo-1.jpg",
        });
        await expect(rowImage(db, "b")).resolves.toMatchObject({ imageUri: "file:///photos/logo-2.jpg" });
    });

    it("asks the backend past a session entry that has no domain", async () => {
        await seedRow(db, "a", "Sushi Way Les Ha");
        setCachedEnrichment("sushi way les ha", { ...NOTHING, domain: null }, "EUR");
        const deps = makeDeps({
            enrich: async () => ({ groundedLookup: true, result: { ...REMOTE, domain: "sushiway.fr" } }),
        });

        await expect(attachMissingLogos(db, deps)).resolves.toBe(1);
        expect(deps.fetched).toStrictEqual(["sushiway.fr"]);
    });

    it("stamps the paint past a row whose clock runs ahead", async () => {
        const today = new Date();
        const ahead = new Date(today.getTime() + 60 * 60 * 1000);
        await rememberLogoCandidate(db, "a", ahead.getTime(), Number.POSITIVE_INFINITY);
        await db.insert(transactions).values({
            amount: 10,
            currency: "EUR",
            date: today,
            day: today,
            id: "a",
            income: false,
            month: today,
            note: "Intermarche",
            updatedAt: ahead,
        });

        await expect(attachMissingLogos(db, makeDeps({ now: today.getTime() }))).resolves.toBe(1);

        const [row] = await db.select({ updatedAt: transactions.updatedAt }).from(transactions);
        expect(row.updatedAt.getTime()).toBeGreaterThan(ahead.getTime());
    });

    it("leaves a row that already has an identity alone", async () => {
        await seedRow(db, "icon", "Intermarche", { icon: "cart" });
        await seedRow(db, "emoji", "Intermarche", { emoji: "🛒" });
        await seedRow(db, "tinted", "Intermarche", { customColor: "#123456" });
        await seedRow(db, "photo", "Intermarche", { imageUri: "file:///photos/mine.jpg" });
        await seedRow(db, "synced", "Intermarche", { imageKey: "r2/key" });
        await seedRow(db, "gone", "Intermarche", { deletedAt: NOW });
        await seedRow(db, "blank", "");
        await seedRow(db, "old", "Intermarche", { date: new Date("2026-08-01T00:00:00Z") });
        const deps = makeDeps();

        await expect(attachMissingLogos(db, deps)).resolves.toBe(0);
        expect(deps.enrichCalls).toStrictEqual([]);
    });

    it("leaves a row whose logo the user removed alone, even when that happens mid-pass", async () => {
        await seedRow(db, "before", "Intermarche");
        await seedRow(db, "during", "Intermarche");
        await seedRow(db, "still", "Intermarche");
        await rememberLogoDismissal(db, "before");
        const deps = makeDeps({
            persist: async () => {
                await rememberLogoDismissal(db, "during");
                return { imageColor: null, imageUri: "file:///photos/logo.jpg" };
            },
        });

        await expect(attachMissingLogos(db, deps)).resolves.toBe(1);

        await expect(rowImage(db, "before")).resolves.toMatchObject({ imageUri: null });
        await expect(rowImage(db, "during")).resolves.toMatchObject({ imageUri: null });
        await expect(rowImage(db, "still")).resolves.toMatchObject({ imageUri: "file:///photos/logo.jpg" });
    });

    it("asks again once a grounded search has had time to land", async () => {
        await seedRow(db, "a", "Sushi Way Les Ha");
        let answers = 0;
        const deps = makeDeps({
            enrich: async () => {
                answers += 1;
                return {
                    groundedLookup: true,
                    result: answers === 1 ? { ...NOTHING, grounding: true } : { ...REMOTE, domain: "sushiway.fr" },
                };
            },
        });

        await attachMissingLogos(db, deps);
        await attachMissingLogos(db, deps);
        await expect(rowImage(db, "a")).resolves.toMatchObject({ imageUri: null });

        deps.now = NOW.getTime() + 3 * 60 * 1000;
        await expect(attachMissingLogos(db, deps)).resolves.toBe(1);
        expect(deps.fetched).toStrictEqual(["sushiway.fr"]);
    });

    it("spends at most three model calls per pass and leaves the rest for the next one", async () => {
        for (const name of ["Lescot", "Monoprix", "Franprix", "Amorino", "Picard"]) {
            await seedRow(db, name, name);
        }
        const deps = makeDeps();

        await attachMissingLogos(db, deps);
        expect(deps.enrichCalls).toHaveLength(3);

        await attachMissingLogos(db, deps);
        expect(deps.enrichCalls).toHaveLength(5);
    });

    it("does not paint a row the user changed while the lookup was out", async () => {
        await seedRow(db, "photo", "Intermarche");
        await seedRow(db, "renamed", "Intermarche");
        await seedRow(db, "recurrencied", "Intermarche");
        await seedRow(db, "still", "Intermarche");
        const deps = makeDeps({
            persist: async () => {
                await db
                    .update(transactions)
                    .set({ imageUri: "file:///photos/mine.jpg" })
                    .where(eq(transactions.id, "photo"));
                await db.update(transactions).set({ note: "Carrefour" }).where(eq(transactions.id, "renamed"));
                await db.update(transactions).set({ currency: "VES" }).where(eq(transactions.id, "recurrencied"));
                return { imageColor: "#ff0000", imageUri: "file:///photos/logo.jpg" };
            },
        });

        await expect(attachMissingLogos(db, deps)).resolves.toBe(1);

        await expect(rowImage(db, "photo")).resolves.toMatchObject({ imageUri: "file:///photos/mine.jpg" });
        await expect(rowImage(db, "renamed")).resolves.toMatchObject({ imageUri: null });
        await expect(rowImage(db, "recurrencied")).resolves.toMatchObject({ imageUri: null });
        await expect(rowImage(db, "still")).resolves.toMatchObject({ imageUri: "file:///photos/logo.jpg" });
    });

    it("does not let throttled merchants starve an older row", async () => {
        for (let index = 0; index < 15; index += 1) {
            await seedRow(db, `miss-${index}`, `Unknown Shop ${index}`, {
                date: new Date(NOW.getTime() - index * 1000),
            });
        }
        await seedRow(db, "old", "Uber Eats", { date: new Date(NOW.getTime() - 5 * 24 * 60 * 60 * 1000) });
        const deps = makeDeps({ enrich: async () => ({ groundedLookup: true, result: NOTHING }) });

        await expect(attachMissingLogos(db, deps)).resolves.toBe(1);

        expect(deps.fetched).toStrictEqual(["ubereats.com"]);
    });

    it("looks a same-named merchant up once per currency", async () => {
        await seedRow(db, "fr", "Carrefour", { currency: "EUR" });
        await seedRow(db, "ve", "Carrefour", { currency: "VES" });
        const enrich = jest.fn<NonNullable<LogoBackfillDeps["enrich"]>>(async ({ currency }) => ({
            groundedLookup: true,
            result: { ...REMOTE, domain: currency === "EUR" ? "carrefour.fr" : "carrefour.com.ve" },
        }));
        const deps = makeDeps({ enrich });

        await attachMissingLogos(db, deps);

        expect(enrich).toHaveBeenCalledTimes(2);
        expect(deps.fetched.sort()).toStrictEqual(["carrefour.com.ve", "carrefour.fr"]);
    });

    it("neither caches an empty answer for the form nor believes it for long", async () => {
        await seedRow(db, "a", "Intermarche");
        const empty: RemoteEnrichmentResult = { categoryName: null, domain: null, isNewCategory: false, tags: [] };
        const enrich = jest.fn<NonNullable<LogoBackfillDeps["enrich"]>>(async () => ({
            groundedLookup: true,
            result: empty,
        }));
        const deps = makeDeps({ enrich });

        await attachMissingLogos(db, deps);

        expect(getCachedEnrichment("intermarche")).toStrictEqual({ hit: false });
        deps.now = NOW.getTime() + 31 * 60 * 1000;
        await attachMissingLogos(db, deps);
        expect(enrich).toHaveBeenCalledTimes(2);
    });

    it("asks the names never tried before retrying an expired miss", async () => {
        for (const [index, name] of ["Lescot", "Monoprix", "Franprix", "Amorino"].entries()) {
            await seedRow(db, name, name, { date: new Date(NOW.getTime() - index * 1000) });
        }
        const enrich = jest.fn<NonNullable<LogoBackfillDeps["enrich"]>>(async () => ({
            groundedLookup: true,
            result: NOTHING,
        }));
        const deps = makeDeps({ enrich });

        await attachMissingLogos(db, deps);
        expect(enrich.mock.calls.map(([args]) => args.name)).toStrictEqual(["Lescot", "Monoprix", "Franprix"]);

        deps.now = NOW.getTime() + 7 * 60 * 60 * 1000;
        await attachMissingLogos(db, deps);
        expect(enrich.mock.calls[3]?.[0].name).toBe("Amorino");
    });

    it("stops at the next step when cancelled, and removes a file the row never took", async () => {
        await seedRow(db, "a", "Intermarche");
        await seedRow(db, "b", "Uber Eats", { date: new Date(NOW.getTime() - 1000) });
        let cancelled = false;
        const discarded: string[] = [];
        const deps = makeDeps({
            cancelled: () => cancelled,
            discard: (uri) => {
                discarded.push(uri);
            },
            persist: async () => {
                cancelled = true;
                return { imageColor: null, imageUri: "file:///photos/late.jpg" };
            },
        });

        await expect(attachMissingLogos(db, deps)).resolves.toBe(0);

        expect(discarded).toStrictEqual(["file:///photos/late.jpg"]);
        expect(deps.fetched).toStrictEqual(["intermarche.com"]);
        await expect(rowImage(db, "a")).resolves.toMatchObject({ imageUri: null });
    });

    it("sends nothing for a row renamed while an earlier lookup was out", async () => {
        await seedRow(db, "first", "Intermarche");
        await seedRow(db, "second", "Iolanda", { date: new Date(NOW.getTime() - 1000) });
        const enrich = jest.fn<NonNullable<LogoBackfillDeps["enrich"]>>(async ({ name }) => {
            if (name === "Intermarche") {
                await db.update(transactions).set({ note: "Renamed" }).where(eq(transactions.id, "second"));
            }
            return { groundedLookup: true, result: REMOTE };
        });

        await attachMissingLogos(db, makeDeps({ enrich }));

        expect(enrich.mock.calls.map(([args]) => args.name)).toStrictEqual(["Intermarche"]);
    });

    it("removes the file when the paint itself fails", async () => {
        await seedRow(db, "a", "Intermarche");
        const discarded: string[] = [];
        const deps = makeDeps({
            discard: (uri) => {
                discarded.push(uri);
            },
            persist: async () => {
                await db.run(sql`DROP TABLE transactions`);
                return { imageColor: null, imageUri: "file:///photos/orphan.jpg" };
            },
        });

        await expect(attachMissingLogos(db, deps)).rejects.toThrow();
        expect(discarded).toStrictEqual(["file:///photos/orphan.jpg"]);
    });

    it("sends no image request for a row renamed while the model was answering", async () => {
        await seedRow(db, "a", "Intermarche");
        const deps = makeDeps({
            enrich: async () => {
                await db.update(transactions).set({ note: "Renamed" }).where(eq(transactions.id, "a"));
                return { groundedLookup: true, result: REMOTE };
            },
        });

        await attachMissingLogos(db, deps);

        expect(deps.fetched).toStrictEqual([]);
    });

    it("sends no image request for a domain that arrived after a cancel", async () => {
        await seedRow(db, "a", "Intermarche");
        let cancelled = false;
        const deps = makeDeps({
            cancelled: () => cancelled,
            enrich: async () => {
                cancelled = true;
                return { groundedLookup: true, result: REMOTE };
            },
        });

        await attachMissingLogos(db, deps);

        expect(deps.fetched).toStrictEqual([]);
    });

    it("treats a miss as provisional when the request went out without the web lookup", async () => {
        await seedRow(db, "a", "Iolanda");
        const enrich = jest.fn<NonNullable<LogoBackfillDeps["enrich"]>>(async () => ({
            groundedLookup: false,
            result: NOTHING,
        }));
        const deps = makeDeps({ enrich });

        await attachMissingLogos(db, deps);
        deps.now = NOW.getTime() + 31 * 60 * 1000;
        await attachMissingLogos(db, deps);

        expect(enrich).toHaveBeenCalledTimes(2);
    });

    it("keeps every lookup on-device when the cloud is off, and asks as soon as it is on", async () => {
        await seedRow(db, "a", "Intermarche");
        await seedRow(db, "b", "Uber Eats");
        const off = makeDeps({ enrich: null });

        await expect(attachMissingLogos(db, off)).resolves.toBe(1);
        expect(off.fetched).toStrictEqual(["ubereats.com"]);

        const on = makeDeps();
        await expect(attachMissingLogos(db, on)).resolves.toBe(1);
        expect(on.enrichCalls).toStrictEqual(["Intermarche"]);
    });

    it("does not paint a row a peer's edit reached while the lookup was out", async () => {
        await seedRow(db, "a", "Intermarche");
        const deps = makeDeps({
            persist: async () => {
                await db
                    .update(transactions)
                    .set({ updatedAt: new Date(NOW.getTime() + 1) })
                    .where(eq(transactions.id, "a"));
                return { imageColor: null, imageUri: "file:///photos/logo.jpg" };
            },
        });

        await expect(attachMissingLogos(db, deps)).resolves.toBe(0);
        await expect(rowImage(db, "a")).resolves.toMatchObject({ imageUri: null });
    });

    it("retries a domain whose image tiers had nothing after a short wait, without painting", async () => {
        await seedRow(db, "a", "Intermarche");
        const fetchImage = jest.fn<LogoBackfillDeps["fetchImage"]>(async () => ({ kind: "none" }));
        const deps = makeDeps({ fetchImage });

        await attachMissingLogos(db, deps);
        await attachMissingLogos(db, deps);
        expect(fetchImage).toHaveBeenCalledTimes(1);
        await expect(rowImage(db, "a")).resolves.toMatchObject({ imageUri: null });

        deps.now = NOW.getTime() + 31 * 60 * 1000;
        await attachMissingLogos(db, deps);
        expect(fetchImage).toHaveBeenCalledTimes(2);
    });
});
