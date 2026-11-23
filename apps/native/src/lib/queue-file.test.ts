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
    const T1 = 1_700_000_100_000;
    const T2 = T1 + 60_000;
    const NOW = T2 + 120_000;
    const cutoffs = [
        { at: T1, from: "A" },
        { at: T2, from: "B" },
    ];
    const early = (id: string) => write(id, { date: T1 - 60_000 });
    const between = (id: string) => write(id, { date: T1 + 30_000 });
    const late = (id: string) => write(id, { date: T2 + 60_000 });

    it("parks a capture dated before each cutoff for the ledger that cutoff left", () => {
        const first = early("first");
        const second = between("second");
        const current = late("current");
        const { disk, files } = makeFiles({ [QUEUE_FILE]: lines(first, second, current) });

        const claimed = claimPendingWrites(files, { cutoffs, key: "C", now: NOW });

        expect(claimed.cutoffs).toStrictEqual(cutoffs);
        expect(claimed.jobs.map((job) => job.id)).toStrictEqual(["current"]);
        expect(claimed.held).toStrictEqual([
            { jobs: [first], name: "held-A-1.jsonl" },
            { jobs: [second], name: "held-B-1.jsonl" },
        ]);

        releasePendingWrites(files, claimed);

        expect([...disk.keys()].sort()).toStrictEqual(["held-A-1.jsonl", "held-B-1.jsonl"]);
        expect(parseQueue(files.read("held-A-1.jsonl")).map((job) => job.id)).toStrictEqual(["first"]);
        expect(parseQueue(files.read("held-B-1.jsonl")).map((job) => job.id)).toStrictEqual(["second"]);
    });

    it("hands a parked capture back when the ledger it was parked for opens", () => {
        const gap = early("gap");
        const fresh = late("fresh");
        const { disk, files } = makeFiles({ [QUEUE_FILE]: lines(gap, fresh) });

        const claimed = claimPendingWrites(files, { cutoffs, key: "B", now: NOW });

        expect(claimed.jobs.map((job) => job.id)).toStrictEqual(["fresh"]);
        expect(claimed.held).toStrictEqual([{ jobs: [gap], name: "held-A-1.jsonl" }]);

        releasePendingWrites(files, claimed);

        expect(disk.has(QUEUE_FILE)).toBe(false);

        const back = claimPendingWrites(files, { cutoffs: [], key: "A", now: NOW });
        expect(back.names).toStrictEqual(["held-A-1.jsonl"]);
        expect(back.jobs.map((job) => job.id)).toStrictEqual(["gap"]);

        releasePendingWrites(files, back);
        expect(disk.has("held-A-1.jsonl")).toBe(false);
    });

    it("returns a replayed capture once when two releases held it for the same ledger", () => {
        const gap = early("gap");
        const { files } = makeFiles({ [QUEUE_FILE]: lines(gap) });

        releasePendingWrites(files, claimPendingWrites(files, { cutoffs, key: "B", now: NOW }));

        files.write("claimed-1.jsonl", lines(gap));
        releasePendingWrites(files, claimPendingWrites(files, { cutoffs, key: "B", now: NOW }));

        expect(parseQueue(files.read("held-A-1.jsonl")).map((job) => job.id)).toStrictEqual(["gap"]);
        expect(parseQueue(files.read("held-A-2.jsonl")).map((job) => job.id)).toStrictEqual(["gap"]);

        const back = claimPendingWrites(files, { key: "A", now: NOW });
        expect(back.names).toStrictEqual(["held-A-1.jsonl", "held-A-2.jsonl"]);
        expect(back.jobs.map((job) => job.id)).toStrictEqual(["gap"]);
    });

    it("prunes an expired cutoff for persistence but still routes by it", () => {
        const gap = early("gap");
        const { files } = makeFiles({ [QUEUE_FILE]: lines(gap) });

        const claimed = claimPendingWrites(files, { cutoffs, key: "C", now: T2 + SWITCH_GRACE_MS });

        expect(claimed.cutoffs).toStrictEqual([]);
        expect(claimed.jobs).toStrictEqual([]);
        expect(claimed.held).toStrictEqual([{ jobs: [gap], name: "held-A-1.jsonl" }]);
    });

    it("routes by a cutoff whose grace passed while a later one is still live", () => {
        const gap = early("gap");
        const { files } = makeFiles({ [QUEUE_FILE]: lines(gap) });

        const claimed = claimPendingWrites(files, { cutoffs, key: "C", now: T1 + SWITCH_GRACE_MS + 50_000 });

        expect(claimed.jobs).toStrictEqual([]);
        expect(claimed.held).toStrictEqual([{ jobs: [gap], name: "held-A-1.jsonl" }]);
        expect(claimed.cutoffs).toStrictEqual([{ at: T2, from: "B" }]);
    });

    it("drops a dismissed capture instead of parking it", () => {
        const gap = early("gap");
        const dismissed = early("dismissed");
        const { disk, files } = makeFiles({ [QUEUE_FILE]: lines(gap, dismissed) });

        const claimed = claimPendingWrites(files, {
            cutoffs,
            dismissed: new Set(["dismissed"]),
            key: "C",
            now: NOW,
        });
        releasePendingWrites(files, claimed);

        expect(claimed.jobs).toStrictEqual([]);
        expect([...disk.keys()]).toStrictEqual(["held-A-1.jsonl"]);
        expect(parseQueue(files.read("held-A-1.jsonl")).map((job) => job.id)).toStrictEqual(["gap"]);
    });

    it("parks a late append for the ledger its cutoff names instead of adopting it", () => {
        const { disk, files } = makeFiles({ [QUEUE_FILE]: lines(late("current")) });

        const claimed = claimPendingWrites(files, { cutoffs, key: "C", now: NOW });
        files.write("claimed-1.jsonl", lines(late("current"), early("late-gap")));
        releasePendingWrites(files, claimed);

        expect(parseQueue(files.read("held-A-1.jsonl")).map((job) => job.id)).toStrictEqual(["late-gap"]);
        expect(disk.has(QUEUE_FILE)).toBe(false);
        expect(disk.has("claimed-2.jsonl")).toBe(false);
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
