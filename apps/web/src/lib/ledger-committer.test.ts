import type { PushRow } from "@outlayr/backend/confect/sync";
import { DbClient } from "@tanstack/react-db";
import { ConvexError } from "convex/values";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { ledgerDependencies } from "./db";
import { snapshotOf } from "./ledger-cache";
import { ledgerCommitter } from "./ledger-committer";
import { ledgerBooks, preloadLedger } from "./ledger-db";
import type { LedgerPusher } from "./ledger-write";
import { fakeConvex } from "./test-convex";

const HOLD_MS = 60_000;
const answered = { accepted: 1, nextSeq: 1, skipped: 0 };

// SAFETY: a fixture. The committer only reads the envelope, and the fake server takes any fields.
const entry = (localId: string) =>
    ({
        deletedAt: null,
        fields: { note: localId },
        localId,
        table: "transactions",
        updatedAt: 1,
    }) as unknown as PushRow;

const plan = (localId: string) =>
    ({ deletedAt: 1, fields: {}, localId, table: "budgetPlans", updatedAt: 1 }) as unknown as PushRow;

type Push = LedgerPusher["mutation"];

const unanswered: Push = () => Promise.race([]);

const openTab = async (push: Push) => {
    const db = new DbClient(ledgerDependencies(fakeConvex({ push })));
    await preloadLedger(db);
    return db;
};

const saved = (db: DbClient) => JSON.stringify(snapshotOf(db, undefined, "owner").collections);

const turn = () =>
    new Promise<void>((resolve) => {
        setTimeout(resolve, 0);
    });

const shown = (db: DbClient) => ledgerBooks(db).transactions.map((row) => row.localId);

const sentIds = (push: Push) => vi.mocked(push).mock.calls.map(([, args]) => args.rows.map((row) => row.localId));

const memory = new Map<string, string>();

const storedRows = () => [...memory.keys()].filter((key) => key.startsWith("outlayr-unsent:"));

describe("ledger committer", () => {
    beforeEach(() => {
        memory.clear();
        const storage = {
            getItem: (key: string) => memory.get(key) ?? null,
            removeItem: (key: string) => memory.delete(key),
            setItem: (key: string, value: string) => memory.set(key, value),
        };
        vi.stubGlobal(
            "localStorage",
            new Proxy(storage, {
                getOwnPropertyDescriptor: (_target, key) =>
                    memory.has(String(key)) ? { configurable: true, enumerable: true, value: "" } : undefined,
                ownKeys: () => [...memory.keys()],
            })
        );
        vi.stubGlobal("window", new EventTarget());
    });

    it("sends on the next load what a closed tab left unsent", async () => {
        const closed = await openTab(unanswered);
        ledgerCommitter(closed, "owner").commit([entry("a")]);
        expect(storedRows()).toHaveLength(1);

        const push = vi.fn<Push>(() => Promise.resolve(answered));
        const committer = ledgerCommitter(await openTab(push), "owner");
        committer.resume();
        await vi.waitFor(() => expect(storedRows()).toHaveLength(0));

        expect(sentIds(push)).toStrictEqual([["a"]]);
    });

    it("drops another account's unsent rows without sending them", async () => {
        const closed = await openTab(unanswered);
        ledgerCommitter(closed, "owner").commit([entry("a")]);

        const push = vi.fn<Push>(() => Promise.resolve(answered));
        ledgerCommitter(await openTab(push), "someone-else").resume();

        expect(storedRows()).toHaveLength(0);
        expect(push).not.toHaveBeenCalled();
    });

    it("stores nothing for a signed-out page", async () => {
        const db = await openTab(unanswered);
        ledgerCommitter(db, undefined).commit([entry("a")]);

        expect(shown(db)).toStrictEqual(["a"]);
        expect(storedRows()).toHaveLength(0);
    });

    it("undoes a held commit: the rows leave the screen and are never pushed", async () => {
        const push = vi.fn<Push>(() => Promise.resolve(answered));
        const db = await openTab(push);
        const held = ledgerCommitter(db, "owner").commit([entry("a")], { holdMs: HOLD_MS });
        expect(shown(db)).toStrictEqual(["a"]);

        expect(held.undo()).toBe(true);

        expect(shown(db)).toStrictEqual([]);
        expect(await held.flush()).toStrictEqual({ status: "undone" });
        expect(push).not.toHaveBeenCalled();
        expect(storedRows()).toHaveLength(0);
    });

    it("cannot undo once the push has started", async () => {
        const db = await openTab(unanswered);
        const held = ledgerCommitter(db, "owner").commit([entry("a")], { holdMs: HOLD_MS });
        void held.flush();

        expect(held.undo()).toBe(false);
        expect(shown(db)).toStrictEqual(["a"]);
    });

    it("leaves no shown row and no stored rows when the push is rejected", async () => {
        const db = await openTab(() => Promise.reject(new Error("refused")));
        const committer = ledgerCommitter(db, "owner");

        const outcome = await committer.commit([entry("a")]).settled;

        expect(outcome.status).toBe("failed");
        expect(shown(db)).toStrictEqual([]);
        expect(storedRows()).toHaveLength(0);
        expect(committer.getSnapshot()).toStrictEqual({ failed: 1, held: 0, sending: 0 });
    });

    it("saves the same rows on a retry after a failure", async () => {
        const push = vi.fn<Push>(() => Promise.resolve(answered)).mockRejectedValueOnce(new Error("refused"));
        const committer = ledgerCommitter(await openTab(push), "owner");
        const outcome = await committer.commit([entry("a"), entry("b")]).settled;
        if (outcome.status !== "failed") {
            throw new Error("the first push was meant to fail");
        }

        expect(await outcome.retry()).toStrictEqual({ status: "saved" });

        expect(sentIds(push)).toStrictEqual([
            ["a", "b"],
            ["a", "b"],
        ]);
        expect(committer.getSnapshot()).toStrictEqual({ failed: 0, held: 0, sending: 0 });
    });

    it("stores and pushes a held commit when the page goes away", async () => {
        const push = vi.fn<Push>(() => Promise.resolve(answered));
        const held = ledgerCommitter(await openTab(push), "owner").commit([entry("a")], { holdMs: HOLD_MS });
        expect(storedRows()).toHaveLength(0);

        window.dispatchEvent(new Event("pagehide"));

        expect(storedRows()).toHaveLength(1);
        expect(sentIds(push)).toStrictEqual([["a"]]);
        expect(await held.settled).toStrictEqual({ status: "saved" });
    });

    it("reverts rows added to a held commit with the same undo", async () => {
        const db = await openTab(unanswered);
        const held = ledgerCommitter(db, "owner").commit([entry("a")], { holdMs: HOLD_MS });

        expect(held.add([entry("b")])).toBe(true);
        expect(shown(db).toSorted()).toStrictEqual(["a", "b"]);
        held.undo();

        expect(shown(db)).toStrictEqual([]);
    });

    it("pushes rows of a table the web never shows", async () => {
        const push = vi.fn<Push>(() => Promise.resolve(answered));
        const committer = ledgerCommitter(await openTab(push), "owner");

        expect(await committer.commit([plan("p")]).settled).toStrictEqual({ status: "saved" });

        expect(sentIds(push)).toStrictEqual([["p"]]);
    });

    it("keeps unsent rows out of the saved copy, so a reload and resume() cannot apply them twice", async () => {
        const db = await openTab(unanswered);
        ledgerCommitter(db, "owner").commit([entry("a")]);

        expect(shown(db)).toStrictEqual(["a"]);
        expect(saved(db)).not.toContain('"localId":"a"');
    });

    it("finishes a commit only once the pushed row is in the table", async () => {
        const convex = fakeConvex();
        const db = new DbClient(ledgerDependencies(convex));
        await preloadLedger(db);
        convex.quiet();
        const finished = vi.fn<() => void>();
        const commit = ledgerCommitter(db, "owner").commit([entry("a")]);
        void commit.settled.then(finished);
        await vi.waitFor(() => expect(storedRows()).toHaveLength(0));
        await turn();
        expect(finished).not.toHaveBeenCalled();
        expect(saved(db)).not.toContain('"localId":"a"');

        convex.speak();

        expect(await commit.settled).toStrictEqual({ status: "saved" });
        expect(saved(db)).toContain('"localId":"a"');
        expect(shown(db)).toStrictEqual(["a"]);
    });

    it("shows a closed tab's unsent rows at once on a restored copy, and sends them once", async () => {
        const closed = await openTab(unanswered);
        ledgerCommitter(closed, "owner").commit([entry("a")]);
        const copy = snapshotOf(closed, undefined, "owner");
        const convex = fakeConvex();
        const push = vi.spyOn(convex, "mutation");
        convex.quiet();
        const db = new DbClient(ledgerDependencies(convex));
        db.hydrate({ collections: copy.collections });
        const loaded = preloadLedger(db);
        const committer = ledgerCommitter(db, "owner");

        committer.resume();
        committer.resume();
        expect(shown(db)).toStrictEqual(["a"]);
        expect(push).not.toHaveBeenCalled();
        convex.speak();
        await loaded;
        await vi.waitFor(() => expect(committer.getSnapshot().sending).toBe(0));

        expect(sentIds(push)).toStrictEqual([["a"]]);
        expect(shown(db)).toStrictEqual(["a"]);
        expect(storedRows()).toHaveLength(0);
    });

    it("keeps unsent rows for a later load when the server refuses this one", async () => {
        const closed = await openTab(unanswered);
        ledgerCommitter(closed, "owner").commit([entry("a")]);
        const push = vi.fn<Push>(() => Promise.resolve(answered));
        const db = new DbClient(ledgerDependencies(fakeConvex({ push, refusal: new ConvexError("Pro is required") })));
        const loaded = preloadLedger(db);
        const committer = ledgerCommitter(db, "owner");

        committer.resume();
        await expect(loaded).rejects.toBeInstanceOf(ConvexError);
        await vi.waitFor(() => expect(committer.getSnapshot().sending).toBe(0));

        expect(push).not.toHaveBeenCalled();
        expect(storedRows()).toHaveLength(1);
        expect(committer.getSnapshot()).toStrictEqual({ failed: 0, held: 0, sending: 0 });
    });
});
