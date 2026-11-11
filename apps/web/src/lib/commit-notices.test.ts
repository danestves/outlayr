import { DbClient } from "@tanstack/react-db";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { categoryPush, seededCategories } from "./category-writes";
import { noticedCommits } from "./commit-notices";
import type { Notice } from "./commit-notices";
import { ledgerDependencies } from "./db";
import { ledgerCommitter } from "./ledger-committer";
import { ledgerBooks, preloadLedger } from "./ledger-db";
import type { LedgerPusher } from "./ledger-write";
import { fakeConvex } from "./test-convex";

type Push = LedgerPusher["mutation"];

const rows = seededCategories((name) => name, 1).map((row) => categoryPush(row));
const copy = { failed: "Could not delete", text: "Deleted" };
const answered = { accepted: 1, nextSeq: 1, skipped: 0 };
const unanswered: Push = () => Promise.race([]);
const refused: Push = () => Promise.reject(new Error("refused"));

const open = async (push: Push) => {
    const db = new DbClient(ledgerDependencies(fakeConvex({ push })));
    await preloadLedger(db);
    const up = new Set<Notice>();
    const host = {
        holdMs: 60_000,
        show: (notice: Notice) => {
            up.add(notice);
            return () => {
                up.delete(notice);
            };
        },
    };
    return {
        commits: noticedCommits(ledgerCommitter(db, undefined), host),
        shown: () => ledgerBooks(db).categories.length,
        up,
    };
};

const holdRunsOut = () => window.dispatchEvent(new Event("pagehide"));

describe("commit notices", () => {
    beforeEach(() => {
        vi.stubGlobal("window", new EventTarget());
    });

    it("tells the person a held commit failed and takes its Undo notice down", async () => {
        const { commits, shown, up } = await open(refused);
        const held = commits.commitWithUndo(rows, copy);
        expect([...up].map((notice) => notice.text)).toStrictEqual(["Deleted"]);

        holdRunsOut();
        await held.settled;

        expect([...up]).toStrictEqual([{ failed: true, text: "Could not delete" }]);
        expect(shown()).toBe(0);
    });

    it("does nothing when Undo is pressed after the hold ran out", async () => {
        const { commits, shown, up } = await open(unanswered);
        const onUndone = vi.fn<() => void>();
        commits.commitWithUndo(rows, { ...copy, onUndone });
        const [notice] = up;

        holdRunsOut();
        notice?.onUndo?.();

        expect(onUndone).not.toHaveBeenCalled();
        expect(shown()).toBe(rows.length);
    });

    it("offers Undo once the page has left, and Undo takes back the rows and the caller's own change", async () => {
        const push = vi.fn<Push>(() => Promise.resolve(answered));
        const { commits, shown, up } = await open(push);
        const onUndone = vi.fn<() => void>();
        const left = Promise.resolve();
        commits.commitWithUndo(rows, { ...copy, after: left, onUndone });
        expect(up.size).toBe(0);
        await left;
        const [notice] = up;

        notice?.onUndo?.();

        expect(onUndone).toHaveBeenCalledOnce();
        expect(shown()).toBe(0);
        expect(up.size).toBe(0);
        expect(push).not.toHaveBeenCalled();
    });

    it("says saved at once, then tells the person the commit failed and answers false", async () => {
        const { commits, up } = await open(refused);

        const saved = commits.commit(rows, { failed: "Could not save", saved: "Saved" });
        expect([...up]).toStrictEqual([{ text: "Saved" }]);

        expect(await saved).toBe(false);
        expect([...up].at(-1)).toStrictEqual({ failed: true, text: "Could not save" });
    });
});
