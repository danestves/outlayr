import { describe, expect, it } from "vite-plus/test";

import {
    adoptQueue,
    autologSourceOf,
    claimPendingWrites,
    CUTOFF_RETENTION_MS,
    foldHeld,
    holdQueue,
    parseLegacyQueue,
    parseQueue,
    QUEUE_FILE,
    releasePendingWrites,
    WALLET_DEDUPE_WINDOW_MS,
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
            { jobs: [first], key: "A" },
            { jobs: [second], key: "B" },
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
        expect(claimed.held).toStrictEqual([{ jobs: [gap], key: "A" }]);

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

    it("prunes a cutoff past its retention for persistence but still routes by it", () => {
        const gap = early("gap");
        const { files } = makeFiles({ [QUEUE_FILE]: lines(gap) });

        const claimed = claimPendingWrites(files, { cutoffs, key: "C", now: T2 + CUTOFF_RETENTION_MS });

        expect(claimed.cutoffs).toStrictEqual([]);
        expect(claimed.jobs).toStrictEqual([]);
        expect(claimed.held).toStrictEqual([{ jobs: [gap], key: "A" }]);
    });

    it("routes by a cutoff whose retention passed while a later one is still live", () => {
        const gap = early("gap");
        const { files } = makeFiles({ [QUEUE_FILE]: lines(gap) });

        const claimed = claimPendingWrites(files, { cutoffs, key: "C", now: T1 + CUTOFF_RETENTION_MS + 50_000 });

        expect(claimed.jobs).toStrictEqual([]);
        expect(claimed.held).toStrictEqual([{ jobs: [gap], key: "A" }]);
        expect(claimed.cutoffs).toStrictEqual([{ at: T2, from: "B" }]);
    });

    it("keeps a cutoff an hour past the switch, so a late watch capture still parks for the old ledger", () => {
        const { files } = makeFiles();

        const drained = claimPendingWrites(files, { cutoffs, key: "C", now: T2 + 30 * 60_000 });
        expect(drained.cutoffs).toStrictEqual(cutoffs);

        const watch = early("watch");
        files.write(QUEUE_FILE, lines(watch));
        const claimed = claimPendingWrites(files, {
            cutoffs: drained.cutoffs ?? [],
            key: "C",
            now: T2 + 60 * 60_000,
        });

        expect(claimed.cutoffs).toStrictEqual(cutoffs);
        expect(claimed.jobs).toStrictEqual([]);
        expect(claimed.held).toStrictEqual([{ jobs: [watch], key: "A" }]);
    });

    it("ignores a counter-less cutoff dated after now instead of routing a capture to its ledger", () => {
        const gap = early("gap");
        const { files } = makeFiles({ [QUEUE_FILE]: lines(gap) });

        const claimed = claimPendingWrites(files, { cutoffs: [{ at: T2, from: "A" }], key: "C", now: T1 });

        expect(claimed.jobs.map((job) => job.id)).toStrictEqual(["gap"]);
        expect(claimed.held).toBeUndefined();
    });

    it("routes a stamped capture by the counter even when its date falls after the switch", () => {
        const capture = write("capture", { date: T2 + 60_000, sequence: 4 });
        const { files } = makeFiles({ [QUEUE_FILE]: lines(capture) });

        const claimed = claimPendingWrites(files, {
            cutoffs: [
                { at: T1, from: "A", sequence: 5 },
                { at: T2, from: "B", sequence: 9 },
            ],
            key: "C",
            now: NOW,
        });

        expect(claimed.jobs).toStrictEqual([]);
        expect(claimed.held).toStrictEqual([{ jobs: [capture], key: "A" }]);
    });

    it("keeps a stamped capture current when the clock moved back before its date", () => {
        const capture = write("capture", { date: T1 - 60_000, sequence: 7 });
        const { files } = makeFiles({ [QUEUE_FILE]: lines(capture) });

        const claimed = claimPendingWrites(files, {
            cutoffs: [{ at: T1, from: "A", sequence: 5 }],
            key: "B",
            now: NOW,
        });

        expect(claimed.jobs).toStrictEqual([capture]);
        expect(claimed.held).toBeUndefined();
    });

    it("routes unstamped watch captures by their date against a cutoff that has a counter", () => {
        const older = write("older", { date: T1 - 60_000 });
        const newer = write("newer", { date: T1 + 60_000 });
        const { files } = makeFiles({ [QUEUE_FILE]: lines(older, newer) });

        const claimed = claimPendingWrites(files, {
            cutoffs: [{ at: T1, from: "A", sequence: 5 }],
            key: "B",
            now: NOW,
        });

        expect(claimed.held).toStrictEqual([{ jobs: [older], key: "A" }]);
        expect(claimed.jobs.map((job) => job.id)).toStrictEqual(["newer"]);
    });

    it("routes a stamped capture by a cutoff dated after now, and an unstamped one ignores it", () => {
        const stamped = write("stamped", { date: T2 + 60_000, sequence: 4 });
        const watch = write("watch", { date: T1 - 60_000 });
        const cutoff = { at: T2, from: "A", sequence: 5 };
        const { files } = makeFiles({ [QUEUE_FILE]: lines(stamped, watch) });

        const claimed = claimPendingWrites(files, { cutoffs: [cutoff], key: "C", now: T1 });

        expect(claimed.cutoffs).toStrictEqual([cutoff]);
        expect(claimed.held).toStrictEqual([{ jobs: [stamped], key: "A" }]);
        expect(claimed.jobs.map((job) => job.id)).toStrictEqual(["watch"]);
    });

    it("follows switch order when a later switch recorded an earlier clock", () => {
        const first = write("first", { date: T2 + 30_000, sequence: 4 });
        const second = write("second", { date: T2 + 30_000, sequence: 7 });
        const { files } = makeFiles({ [QUEUE_FILE]: lines(first, second) });

        const claimed = claimPendingWrites(files, {
            cutoffs: [
                { at: T2, from: "A", sequence: 5 },
                { at: T1, from: "B", sequence: 9 },
            ],
            key: "C",
            now: NOW,
        });

        expect(claimed.held).toStrictEqual([
            { jobs: [first], key: "A" },
            { jobs: [second], key: "B" },
        ]);
        expect(claimed.jobs).toStrictEqual([]);
    });

    it("passes a parked capture through its key's claim even when a cutoff names another ledger", () => {
        const { files } = makeFiles({ [QUEUE_FILE]: lines(late("live")) });
        holdQueue(files, "B", [early("parked")]);

        const claimed = claimPendingWrites(files, { cutoffs, key: "B", now: NOW });

        expect(claimed.jobs.map((job) => job.id)).toStrictEqual(["parked", "live"]);
        expect(claimed.held).toBeUndefined();
    });
});

describe("claimPendingWrites with purchase routes", () => {
    const T1 = 1_700_000_100_000;
    const T2 = T1 + 60_000;
    const NOW = T2 + 120_000;
    const PURCHASE = "wallet:expense:cafe:1240:visa";
    const cutoffs = [
        { at: T1, from: "A" },
        { at: T2, from: "B" },
    ];
    const siblingWindowMs = WALLET_DEDUPE_WINDOW_MS;
    const route = { at: T2 + 30_000, key: PURCHASE, ledger: "A" };

    it("follows a persisted route when the settlement is captured after the cutoff", () => {
        const settlement = write("settlement", { date: T2 + 60_000, dedupeKey: PURCHASE });
        const { disk, files } = makeFiles({ [QUEUE_FILE]: lines(settlement) });

        const claimed = claimPendingWrites(files, {
            cutoffs,
            key: "C",
            now: NOW,
            purchases: [route],
            siblingWindowMs,
        });
        releasePendingWrites(files, claimed);

        expect(claimed.jobs).toStrictEqual([]);
        expect(claimed.held).toStrictEqual([{ jobs: [settlement], key: "A" }]);
        expect(parseQueue(files.read("held-A-1.jsonl")).map((job) => job.id)).toStrictEqual(["settlement"]);
        expect(disk.has(QUEUE_FILE)).toBe(false);
    });

    it("sends an authorization appended after its settlement drained to the settlement's ledger", () => {
        const authorization = write("authorization", { date: T2 - 60_000, dedupeKey: PURCHASE });
        const { files } = makeFiles({ [QUEUE_FILE]: lines(authorization) });

        const claimed = claimPendingWrites(files, {
            cutoffs,
            key: "C",
            now: NOW,
            purchases: [{ at: T2 + 60_000, key: PURCHASE, ledger: "C" }],
            siblingWindowMs,
        });

        expect(claimed.jobs).toStrictEqual([authorization]);
        expect(claimed.held).toBeUndefined();
    });

    it("keeps an authorization and its settlement together when the switch lands between them", () => {
        const settlement = write("settlement", { date: T2 + 60_000, dedupeKey: PURCHASE });
        const authorization = write("authorization", { date: T1 - 60_000, dedupeKey: PURCHASE });
        const { files } = makeFiles({ [QUEUE_FILE]: lines(settlement, authorization) });

        const claimed = claimPendingWrites(files, { cutoffs, key: "C", now: NOW, siblingWindowMs });

        expect(claimed.jobs).toStrictEqual([]);
        expect(claimed.held?.map((entry) => entry.key)).toStrictEqual(["A"]);
        expect(claimed.held?.[0]?.jobs.map((job) => job.id).sort()).toStrictEqual(["authorization", "settlement"]);
    });

    it("routes a replay to the same ledgers and never lets a settlement anchor a later purchase", () => {
        const minute = 60_000;
        const base = T1;
        const anchor = { at: base, key: PURCHASE, ledger: "A" };
        const settlement = write("settlement", { date: base + 9 * minute, dedupeKey: PURCHASE });
        const purchase = write("purchase", { date: base + 16 * minute, dedupeKey: PURCHASE });
        const switched = [{ at: base + minute, from: "A" }];
        const { files } = makeFiles({ [QUEUE_FILE]: lines(settlement, purchase) });

        const claimed = claimPendingWrites(files, {
            cutoffs: switched,
            key: "B",
            now: base + 30 * minute,
            purchases: [anchor],
            siblingWindowMs,
        });

        expect(claimed.jobs.map((job) => job.id)).toStrictEqual(["purchase"]);
        expect(claimed.held).toStrictEqual([{ jobs: [settlement], key: "A" }]);
        expect(claimed.purchases).toStrictEqual([anchor, { at: purchase.date, key: PURCHASE, ledger: "B" }]);

        const replay = makeFiles({ [QUEUE_FILE]: lines(settlement, purchase) });
        const again = claimPendingWrites(replay.files, {
            cutoffs: switched,
            key: "B",
            now: base + 30 * minute,
            purchases: claimed.purchases,
            siblingWindowMs,
        });

        expect(again.jobs.map((job) => job.id)).toStrictEqual(["purchase"]);
        expect(again.held).toStrictEqual([{ jobs: [settlement], key: "A" }]);
        expect(again.purchases).toStrictEqual(claimed.purchases);
    });

    it("records no anchor for a covered settlement drained from its own held file", () => {
        const minute = 60_000;
        const base = T1;
        const anchor = { at: base, key: PURCHASE, ledger: "A" };
        const settlement = write("settlement", { date: base + 8 * minute, dedupeKey: PURCHASE });
        const { files } = makeFiles({ "held-A-1.jsonl": lines(settlement) });

        const claimed = claimPendingWrites(files, {
            key: "A",
            now: base + 30 * minute,
            purchases: [anchor],
            siblingWindowMs,
        });

        expect(claimed.jobs.map((job) => job.id)).toStrictEqual(["settlement"]);
        expect(claimed.held).toBeUndefined();
        expect(claimed.purchases).toStrictEqual([anchor]);
    });

    it("routes an authorization and its settlement by the earliest anchor that covers them", () => {
        const minute = 60_000;
        const base = T1;
        const first = { at: base, key: PURCHASE, ledger: "A" };
        const second = { at: base + 5 * minute, key: PURCHASE, ledger: "B" };
        const authorization = write("authorization", { date: base + 2 * minute, dedupeKey: PURCHASE });
        const settlement = write("settlement", { date: base + 9 * minute, dedupeKey: PURCHASE });
        const { files } = makeFiles({ [QUEUE_FILE]: lines(authorization, settlement) });

        const claimed = claimPendingWrites(files, {
            cutoffs: [{ at: base + minute, from: "A" }],
            key: "B",
            now: base + 30 * minute,
            purchases: [first, second],
            siblingWindowMs,
        });

        expect(claimed.jobs).toStrictEqual([]);
        expect(claimed.held).toStrictEqual([{ jobs: [authorization, settlement], key: "A" }]);
        expect(claimed.purchases).toStrictEqual([first, second]);
    });

    it("returns claim jobs in capture-date order when a held file is older than the live queue", () => {
        const older = write("authorization", { date: T1 - 60_000, dedupeKey: PURCHASE });
        const newer = write("settlement", { date: T1 + 60_000, dedupeKey: PURCHASE });
        const { files } = makeFiles({ "held-A-1.jsonl": lines(older), [QUEUE_FILE]: lines(newer) });

        const claimed = claimPendingWrites(files, { key: "A", now: NOW });

        expect(claimed.jobs.map((job) => job.id)).toStrictEqual(["authorization", "settlement"]);
    });

    it("falls back to the cutoff when the sibling is outside the window", () => {
        const settlement = write("settlement", { date: T1 + 30_000, dedupeKey: PURCHASE });
        const { files } = makeFiles({ [QUEUE_FILE]: lines(settlement) });

        const claimed = claimPendingWrites(files, {
            cutoffs,
            key: "C",
            now: NOW,
            purchases: [{ at: T1 - siblingWindowMs - 1, key: PURCHASE, ledger: "A" }],
            siblingWindowMs,
        });

        expect(claimed.jobs).toStrictEqual([]);
        expect(claimed.held).toStrictEqual([{ jobs: [settlement], key: "B" }]);
    });

    it("does not let a covered capture anchor the purchase that follows it", () => {
        const minute = 60_000;
        const base = NOW - 30 * minute;
        const anchor = { at: base, key: PURCHASE, ledger: "A" };
        const settlement = write("settlement", { date: base + 8 * minute, dedupeKey: PURCHASE });
        const third = write("third", { date: base + 16 * minute, dedupeKey: PURCHASE });
        const { files } = makeFiles({ [QUEUE_FILE]: lines(settlement, third) });

        const claimed = claimPendingWrites(files, {
            cutoffs: [{ at: base + minute, from: "A" }],
            key: "C",
            now: NOW,
            purchases: [anchor],
            siblingWindowMs,
        });

        expect(claimed.jobs.map((job) => job.id)).toStrictEqual(["third"]);
        expect(claimed.held).toStrictEqual([{ jobs: [settlement], key: "A" }]);
        expect(claimed.purchases?.some((entry) => entry.at === settlement.date)).toBe(false);
    });

    it("keeps an anchor older than a day while a queued capture still needs it", () => {
        const day = 24 * 60 * 60 * 1000;
        const old = { at: NOW - day - 120_000, key: PURCHASE, ledger: "A" };
        const settlement = write("settlement", { date: old.at + 60_000, dedupeKey: PURCHASE });
        const { files } = makeFiles({ [QUEUE_FILE]: lines(settlement) });

        const claimed = claimPendingWrites(files, { key: "C", now: NOW, purchases: [old], siblingWindowMs });

        expect(claimed.held).toStrictEqual([{ jobs: [settlement], key: "A" }]);
        expect(claimed.purchases).toStrictEqual([old]);
    });

    it("keeps new anchors and drops the ones older than a day", () => {
        const job = write("job", { date: NOW - 300_000, dedupeKey: "wallet:fresh" });
        const fresh = { at: NOW - 60_000, key: PURCHASE, ledger: "B" };
        const stale = { at: NOW - 24 * 60 * 60 * 1000 - 1, key: "wallet:stale", ledger: "A" };
        const { files } = makeFiles({ [QUEUE_FILE]: lines(job) });

        const claimed = claimPendingWrites(files, { key: "C", now: NOW, purchases: [stale, fresh], siblingWindowMs });

        expect(claimed.purchases).toStrictEqual([{ at: job.date, key: "wallet:fresh", ledger: "C" }, fresh]);
    });

    it("keeps a replayed capture on the ledger its first claim assigned when an earlier anchor arrives", () => {
        const minute = 60_000;
        const base = T1;
        const anchor = { at: base + 8 * minute, key: PURCHASE, ledger: "B" };
        const switched = [{ at: base, from: "A" }];
        const settlement = write("settlement", { date: base + 4 * minute, dedupeKey: PURCHASE });
        const { files } = makeFiles({ [QUEUE_FILE]: lines(settlement) });

        const first = claimPendingWrites(files, {
            cutoffs: switched,
            key: "C",
            now: base + 30 * minute,
            purchases: [anchor],
            siblingWindowMs,
        });

        expect(first.jobs).toStrictEqual([]);
        expect(first.held).toStrictEqual([{ jobs: [settlement], key: "B" }]);
        expect(first.assignments).toStrictEqual([{ id: "settlement", ledger: "B" }]);

        const authorization = write("authorization", { date: base - 4 * minute, dedupeKey: PURCHASE });
        files.write("claimed-1.jsonl", lines(settlement, authorization));
        const again = claimPendingWrites(files, {
            assignments: first.assignments,
            cutoffs: switched,
            key: "A",
            now: base + 40 * minute,
            purchases: first.purchases,
            siblingWindowMs,
        });

        expect(again.jobs.map((job) => job.id)).toStrictEqual(["authorization"]);
        expect(again.held).toStrictEqual([{ jobs: [settlement], key: "B" }]);
    });
});

describe("releasePendingWrites", () => {
    it("writes a held bucket under a fresh name when a hold took the one the claim saw", () => {
        const t1 = 1_700_000_100_000;
        const t2 = t1 + 60_000;
        const cutoffs = [
            { at: t1, from: "A" },
            { at: t2, from: "B" },
        ];
        const gap = write("gap", { date: t1 - 60_000 });
        const adopted = write("adopted", { date: t2 + 60_000 });
        const { files } = makeFiles({ [QUEUE_FILE]: lines(gap) });

        const claimed = claimPendingWrites(files, { cutoffs, key: "C", now: t2 + 120_000 });
        expect(claimed.held).toStrictEqual([{ jobs: [gap], key: "A" }]);

        // adoptPendingWrites or foldHeld parked for the same ledger between the claim and the release.
        holdQueue(files, "A", [adopted]);
        releasePendingWrites(files, claimed);

        expect(parseQueue(files.read("held-A-1.jsonl")).map((job) => job.id)).toStrictEqual(["adopted"]);
        expect(parseQueue(files.read("held-A-2.jsonl")).map((job) => job.id)).toStrictEqual(["gap"]);
    });
});

describe("foldHeld", () => {
    it("moves a deleted ledger's held captures so Personal's claim returns them", () => {
        const { disk, files } = makeFiles({
            "held-GONE-1.jsonl": lines(write("a")),
            "held-GONE-2.jsonl": lines(write("b")),
        });

        foldHeld(files, "GONE", "personal");

        expect([...disk.keys()].sort()).toStrictEqual(["held-personal-1.jsonl", "held-personal-2.jsonl"]);
        const claimed = claimPendingWrites(files, { key: "personal", now: 1_700_000_000_000 });
        expect(claimed.jobs.map((job) => job.id)).toStrictEqual(["a", "b"]);
    });

    it("keeps the source when the copy is not listed", () => {
        const { files } = makeFiles({ "held-GONE-1.jsonl": lines(write("a")) });
        const readOnly: QueueFiles = { ...files, write: () => undefined };

        expect(() => foldHeld(readOnly, "GONE", "personal")).toThrow(Error);
        expect(parseQueue(files.read("held-GONE-1.jsonl")).map((job) => job.id)).toStrictEqual(["a"]);
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
