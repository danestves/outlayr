import { describe, expect, it } from "vite-plus/test";

import {
    adoptQueue,
    autologSourceOf,
    claimPendingWrites,
    parseLegacyQueue,
    parseQueue,
    QUEUE_FILE,
    releasePendingWrites,
    SWITCH_GRACE_MS,
} from "./queue-file";
import type { PendingWrite, QueueFiles } from "./queue-file";

function write(id: string, overrides: Partial<PendingWrite> = {}): PendingWrite {
    return {
        amount: 12.4,
        category: null,
        date: 1_700_000_000_000,
        id,
        income: false,
        note: "Bakery",
        ...overrides,
    };
}

function makeFiles(initial: Record<string, string> = {}) {
    const disk = new Map(Object.entries(initial));
    const files: QueueFiles = {
        claim(name) {
            const live = disk.get(QUEUE_FILE);
            if (live == null || live === "") {
                return false;
            }
            disk.set(name, live);
            disk.delete(QUEUE_FILE);
            return true;
        },
        discard: (name) => {
            disk.delete(name);
        },
        list: () => [...disk.keys()],
        read: (name) => disk.get(name) ?? "",
        write: (name, text) => {
            disk.set(name, text);
        },
    };
    return { disk, files };
}

function lines(...jobs: PendingWrite[]): string {
    return `${jobs.map((job) => JSON.stringify(job)).join("\n")}\n`;
}

describe("parseQueue", () => {
    it("skips a partial last line rather than losing the whole file", () => {
        const good = write("a");
        const text = `${lines(good)}{"id":"b","amount":3`;

        expect(parseQueue(text).map((job) => job.id)).toStrictEqual(["a"]);
    });

    it("rejects a line that is JSON but not a write", () => {
        expect(parseQueue('{"id":"a"}\nnull\n[]')).toStrictEqual([]);
    });

    it("keeps the order the lines were appended in", () => {
        const text = lines(write("a"), write("b"), write("c"));

        expect(parseQueue(text).map((job) => job.id)).toStrictEqual(["a", "b", "c"]);
    });
});

describe("claimPendingWrites", () => {
    it("moves the live queue aside so a concurrent append is not lost", () => {
        const { disk, files } = makeFiles({ [QUEUE_FILE]: lines(write("a")) });

        const claimed = claimPendingWrites(files);

        expect(claimed.names).toStrictEqual(["claimed-1.jsonl"]);
        expect(disk.has(QUEUE_FILE)).toBe(false);
        expect(claimed.jobs.map((job) => job.id)).toStrictEqual(["a"]);
    });

    it("replays what an interrupted drain claimed and never released", () => {
        const { files } = makeFiles({
            "claimed-1.jsonl": lines(write("a")),
            [QUEUE_FILE]: lines(write("b")),
        });

        const claimed = claimPendingWrites(files);

        expect(claimed.names).toStrictEqual(["claimed-1.jsonl", "claimed-2.jsonl"]);
        expect(claimed.jobs.map((job) => job.id)).toStrictEqual(["a", "b"]);
    });

    it("orders leftovers oldest first past a single digit", () => {
        const { files } = makeFiles({
            "claimed-10.jsonl": lines(write("j")),
            "claimed-2.jsonl": lines(write("b")),
        });

        const claimed = claimPendingWrites(files);

        expect(claimed.jobs.map((job) => job.id)).toStrictEqual(["b", "j"]);
        expect(claimed.names).toStrictEqual(["claimed-2.jsonl", "claimed-10.jsonl"]);
    });

    it("claims nothing when the queue is empty", () => {
        const { files } = makeFiles();

        expect(claimPendingWrites(files)).toStrictEqual({ jobs: [], names: [], seen: new Set() });
    });

    it("leaves the claim in place until it is released", () => {
        const { disk, files } = makeFiles({ [QUEUE_FILE]: lines(write("a")) });

        const claimed = claimPendingWrites(files);
        expect(disk.has("claimed-1.jsonl")).toBe(true);

        releasePendingWrites(files, claimed);
        expect([...disk.keys()]).toStrictEqual([]);
    });
});

describe("claimPendingWrites across a switch", () => {
    const AT = 1_700_000_100_000;
    const SETTLED = AT + SWITCH_GRACE_MS;
    const early = (id: string) => write(id, { date: AT - 60_000 });
    const late = (id: string) => write(id, { date: AT + 60_000 });

    it("holds a capture dated before the switch for the ledger it left, and the next claim there takes it", () => {
        const gap = early("gap");
        const fresh = late("fresh");
        const { disk, files } = makeFiles({ [QUEUE_FILE]: lines(gap, fresh) });

        const claimed = claimPendingWrites(files, { key: "B", left: { at: AT, from: "A" }, now: SETTLED });

        expect(claimed.jobs.map((job) => job.id)).toStrictEqual(["fresh"]);
        expect(claimed.held).toStrictEqual({ jobs: [gap], name: "held-A-1.jsonl" });
        expect(claimed.settlesSwitch).toBe(true);

        releasePendingWrites(files, claimed);

        expect(disk.has(QUEUE_FILE)).toBe(false);
        expect(parseQueue(files.read("held-A-1.jsonl")).map((job) => job.id)).toStrictEqual(["gap"]);

        const back = claimPendingWrites(files, { key: "A", now: SETTLED });
        expect(back.names).toStrictEqual(["held-A-1.jsonl"]);
        expect(back.jobs.map((job) => job.id)).toStrictEqual(["gap"]);

        releasePendingWrites(files, back);
        expect(disk.has("held-A-1.jsonl")).toBe(false);
    });

    it("returns a replayed capture once when two releases held it for the same ledger", () => {
        const gap = early("gap");
        const { files } = makeFiles({ [QUEUE_FILE]: lines(gap) });

        releasePendingWrites(files, claimPendingWrites(files, { key: "B", left: { at: AT, from: "A" }, now: SETTLED }));

        files.write("claimed-1.jsonl", lines(gap));
        releasePendingWrites(files, claimPendingWrites(files, { key: "B", left: { at: AT, from: "A" }, now: SETTLED }));

        expect(parseQueue(files.read("held-A-1.jsonl")).map((job) => job.id)).toStrictEqual(["gap"]);
        expect(parseQueue(files.read("held-A-2.jsonl")).map((job) => job.id)).toStrictEqual(["gap"]);

        const back = claimPendingWrites(files, { key: "A", now: SETTLED });
        expect(back.names).toStrictEqual(["held-A-1.jsonl", "held-A-2.jsonl"]);
        expect(back.jobs.map((job) => job.id)).toStrictEqual(["gap"]);
    });

    it("keeps the marker through the grace, still parking gap captures, and settles once it passes", () => {
        const gap = early("gap");
        const fresh = late("fresh");
        const left = { at: AT, from: "A" };
        const { files } = makeFiles({ [QUEUE_FILE]: lines(gap, fresh) });

        const claimed = claimPendingWrites(files, { key: "B", left, now: AT + 60_000 });

        expect(claimed.jobs.map((job) => job.id)).toStrictEqual(["fresh"]);
        expect(claimed.held).toStrictEqual({ jobs: [gap], name: "held-A-1.jsonl" });
        expect(claimed.settlesSwitch).toBeUndefined();

        releasePendingWrites(files, claimed);

        expect(claimPendingWrites(files, { key: "B", left, now: SETTLED }).settlesSwitch).toBe(true);
    });

    it("drops a dismissed capture instead of parking it", () => {
        const gap = early("gap");
        const dismissed = early("dismissed");
        const { disk, files } = makeFiles({ [QUEUE_FILE]: lines(gap, dismissed) });

        const claimed = claimPendingWrites(files, {
            dismissed: new Set(["dismissed"]),
            key: "B",
            left: { at: AT, from: "A" },
            now: SETTLED,
        });
        releasePendingWrites(files, claimed);

        expect(claimed.jobs).toStrictEqual([]);
        expect([...disk.keys()]).toStrictEqual(["held-A-1.jsonl"]);
        expect(parseQueue(files.read("held-A-1.jsonl")).map((job) => job.id)).toStrictEqual(["gap"]);
    });
});

describe("releasePendingWrites", () => {
    it("keeps a job the intent appended to the claimed file after the claim read it", () => {
        const { disk, files } = makeFiles({ [QUEUE_FILE]: lines(write("a")) });

        const claimed = claimPendingWrites(files);
        files.write("claimed-1.jsonl", lines(write("a"), write("late")));
        releasePendingWrites(files, claimed);

        expect(disk.has("claimed-1.jsonl")).toBe(false);
        expect(parseQueue(files.read("claimed-2.jsonl")).map((job) => job.id)).toStrictEqual(["late"]);

        const next = claimPendingWrites(files);
        expect(next.jobs.map((job) => job.id)).toStrictEqual(["late"]);
    });
});

describe("adoptQueue", () => {
    it("parks the pre-file queue ahead of anything appended since", () => {
        const { files } = makeFiles({ [QUEUE_FILE]: lines(write("new")) });

        adoptQueue(files, parseLegacyQueue(JSON.stringify([write("old")])));
        const claimed = claimPendingWrites(files);

        expect(claimed.jobs.map((job) => job.id)).toStrictEqual(["old", "new"]);
    });

    it("writes nothing when the old key held no usable writes", () => {
        const { disk, files } = makeFiles();

        adoptQueue(files, parseLegacyQueue("not json"));

        expect([...disk.keys()]).toStrictEqual([]);
    });

    it("reports a write the container dropped, so the server keeps its copy", () => {
        const { files } = makeFiles();
        const readOnly: QueueFiles = { ...files, write: () => undefined };

        expect(adoptQueue(readOnly, [write("inbound:1")])).toBeFalsy();
        expect(adoptQueue(files, [write("inbound:1")])).toBeTruthy();
    });
});

describe("autologSourceOf", () => {
    it("tells the four entry points apart", () => {
        expect(autologSourceOf(write("a", { dedupeKey: "wallet:expense:cafe:1240:visa" }))).toBe("wallet");
        expect(autologSourceOf(write("b", { dedupeKey: "notification:expense:you paid" }))).toBe("notification");
        expect(autologSourceOf(write("c", { categoryId: "cat-1" }))).toBe("watch");
        expect(autologSourceOf(write("d"))).toBe("shortcut");
    });
});
