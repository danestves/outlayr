import { describe, expect, it } from "@jest/globals";

import {
    adoptQueue,
    claimPendingWrites,
    parseLegacyQueue,
    parseQueue,
    QUEUE_FILE,
    releasePendingWrites,
} from "./pending-writes-core";
import type { PendingWrite, QueueFiles } from "./pending-writes-core";

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

        expect(claimPendingWrites(files)).toStrictEqual({ jobs: [], names: [] });
    });

    it("leaves the claim in place until it is released", () => {
        const { disk, files } = makeFiles({ [QUEUE_FILE]: lines(write("a")) });

        const claimed = claimPendingWrites(files);
        expect(disk.has("claimed-1.jsonl")).toBe(true);

        releasePendingWrites(files, claimed);
        expect([...disk.keys()]).toStrictEqual([]);
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
});
