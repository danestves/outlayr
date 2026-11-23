import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import { PendingWrite } from "@/domain/meta-values";

/** Written by `app-intents/LogTransactionIntent.swift`: the field names are the wire format. */
export type PendingWrite = typeof PendingWrite.Type;

export type AutologSource = "notification" | "shortcut" | "wallet" | "watch";

export function autologSourceOf(write: PendingWrite): AutologSource {
    if (write.categoryId) {
        return "watch";
    }
    const kind = /^(wallet|notification):/.exec(write.dedupeKey ?? "")?.[1];
    return kind === "wallet" || kind === "notification" ? kind : "shortcut";
}

export const QUEUE_FILE = "queue.jsonl";

/** Some intents date a capture, then wait on a server lookup, so a capture from before a switch can arrive late. */
export const SWITCH_GRACE_MS = 10 * 60 * 1000;

const CLAIM_NAME = /^claimed-(\d+)\.jsonl$/;

const DIGITS = /^\d+$/;

const HELD_SUFFIX = ".jsonl";

export interface QueueFiles {
    claim: (name: string) => boolean;
    discard: (name: string) => void;
    list: () => string[];
    read: (name: string) => string;
    write: (name: string, text: string) => void;
}

/** A switch marker cutoff: at `at`, the launch left the ledger `from`. */
export interface SwitchCutoff {
    at: number;
    from: string;
}

export interface ClaimLedger {
    /** Ids the user dismissed: a dismissed capture is dropped even when the switch would have parked it. */
    dismissed?: ReadonlySet<string>;
    /** Switch cutoffs, oldest first: a capture older than one belongs to the ledger it names. */
    cutoffs?: readonly SwitchCutoff[];
    /** `ledgerKey` of the profile this launch opened. */
    key: string;
    /** When the claim ran, for the grace that decides which cutoffs the bridge keeps persisting. */
    now: number;
}

export interface ClaimRoute {
    cutoffs: readonly SwitchCutoff[];
    dismissed?: ReadonlySet<string>;
    key: string;
}

export interface ClaimedWrites {
    /** Capture ids the intent stored a server reply for; see `CaptureLookup.swift`. */
    captured?: ReadonlySet<string>;
    /** The marker's cutoffs still inside their grace, for the bridge to persist once the release lands. */
    cutoffs?: SwitchCutoff[];
    /** Captures a switch left behind, one file per destination ledger; `release` writes each to `name`. */
    held?: { jobs: PendingWrite[]; name: string }[];
    jobs: PendingWrite[];
    names: string[];
    /** How a late append routes: the same cutoffs, ledger and dismissals the claim used. */
    route?: ClaimRoute;
    /** Every job id read during the claim, so a release can tell a late append from what it already took. */
    seen: ReadonlySet<string>;
}

function claimOrder(name: string): number {
    return Number(CLAIM_NAME.exec(name)?.[1] ?? 0);
}

function claimNames(files: QueueFiles): string[] {
    return files
        .list()
        .filter((name) => CLAIM_NAME.test(name))
        .sort((a, b) => claimOrder(a) - claimOrder(b));
}

function claimName(files: QueueFiles): string {
    const highest = claimNames(files).reduce((top, name) => Math.max(top, claimOrder(name)), 0);
    return `claimed-${highest + 1}.jsonl`;
}

// Anchored on the whole key: a UUID carries dashes, so a looser match would read another ledger's files.
function heldOrder(name: string, key: string): number | null {
    const prefix = `held-${key}-`;
    if (!(name.startsWith(prefix) && name.endsWith(HELD_SUFFIX))) {
        return null;
    }
    const order = name.slice(prefix.length, -HELD_SUFFIX.length);
    return DIGITS.test(order) ? Number(order) : null;
}

function heldNames(files: QueueFiles, key: string): string[] {
    return files
        .list()
        .filter((name) => heldOrder(name, key) !== null)
        .sort((a, b) => (heldOrder(a, key) ?? 0) - (heldOrder(b, key) ?? 0));
}

function heldName(files: QueueFiles, key: string): string {
    const highest = files.list().reduce((top, name) => Math.max(top, heldOrder(name, key) ?? 0), 0);
    return `held-${key}-${highest + 1}.jsonl`;
}

function uniqueById(jobs: PendingWrite[]): PendingWrite[] {
    const ids = new Set<string>();
    return jobs.filter((job) => {
        if (ids.has(job.id)) {
            return false;
        }
        ids.add(job.id);
        return true;
    });
}

function addJob(buckets: Map<string, PendingWrite[]>, key: string, job: PendingWrite): void {
    const bucket = buckets.get(key);
    if (bucket === undefined) {
        buckets.set(key, [job]);
    } else {
        bucket.push(job);
    }
}

function pruneCutoffs(cutoffs: readonly SwitchCutoff[], now: number): SwitchCutoff[] {
    return cutoffs.filter((entry) => entry.at <= now && now - entry.at < SWITCH_GRACE_MS).sort((a, b) => a.at - b.at);
}

function destinationOf(job: PendingWrite, route: ClaimRoute): string {
    // The earliest cutoff after the capture: the first ledger it could not have reached.
    const cutoff = route.cutoffs.find((entry) => entry.at > job.date);
    return cutoff === undefined || cutoff.from === route.key ? route.key : cutoff.from;
}

const decodePendingWrite = Schema.decodeUnknownOption(PendingWrite);

const decodeLegacyQueue = Schema.decodeUnknownOption(
    Schema.Array(Schema.NullOr(PendingWrite).pipe(Schema.catchDecoding(() => Effect.succeedSome(null))))
);

function parsePendingWrite(line: string): PendingWrite | null {
    try {
        return Option.getOrNull(decodePendingWrite(JSON.parse(line)));
    } catch {
        return null;
    }
}

/** A bad line is skipped: a killed extension leaves a partial last line and the rest is still good. */
export function parseQueue(text: string): PendingWrite[] {
    const jobs: PendingWrite[] = [];
    for (const line of text.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed) {
            continue;
        }
        const write = parsePendingWrite(trimmed);
        if (write) {
            jobs.push(write);
        }
    }
    return jobs;
}

const HELD_NAME = /^held-.+-\d+\.jsonl$/;

/** Every id parked in any ledger's held file: a dismissal must outlive them or a parked capture files itself later. */
export function heldIds(files: QueueFiles): Set<string> {
    const ids = new Set<string>();
    for (const name of files.list()) {
        if (!HELD_NAME.test(name)) {
            continue;
        }
        for (const job of parseQueue(files.read(name))) {
            ids.add(job.id);
        }
    }
    return ids;
}

function toQueueText(jobs: PendingWrite[]): string {
    return jobs.map((job) => JSON.stringify(job)).join("\n");
}

export function parseLegacyQueue(raw: string): PendingWrite[] {
    try {
        const parsed = decodeLegacyQueue(JSON.parse(raw));
        return Option.isSome(parsed) ? parsed.value.filter((write) => write !== null) : [];
    } catch {
        return [];
    }
}

/** True once the claim file exists, so an unwritable container never acks a write it did not park. */
export function adoptQueue(files: QueueFiles, jobs: PendingWrite[]): boolean {
    if (jobs.length === 0) {
        return true;
    }
    const name = claimName(files);
    files.write(name, toQueueText(jobs));
    return files.list().includes(name);
}

/**
 * Renamed rather than read-and-cleared, so a concurrent append lands in the claim or the fresh file, never in
 * between. Earlier claims never released replay too, so a force-quit mid-drain does not drop writes, and a replay can
 * park one capture twice, so both buckets keep its first copy.
 */
export function claimPendingWrites(files: QueueFiles, ledger?: ClaimLedger): ClaimedWrites {
    const names = claimNames(files);
    const next = claimName(files);
    if (files.claim(next)) {
        names.push(next);
    }
    const parked = ledger === undefined ? [] : heldNames(files, ledger.key);
    names.push(...parked);
    const ownHeld = new Set(parked);
    // Routing reads every cutoff on disk: a capture dated before one belongs to its ledger even after the grace, which
    // only decides what the bridge persists once the release lands.
    const full = ledger === undefined ? [] : [...(ledger.cutoffs ?? [])].sort((a, b) => a.at - b.at);
    const cutoffs = ledger === undefined ? [] : pruneCutoffs(full, ledger.now);
    const route = ledger === undefined ? undefined : { cutoffs: full, dismissed: ledger.dismissed, key: ledger.key };
    const jobs: PendingWrite[] = [];
    const leaving = new Map<string, PendingWrite[]>();
    const seen = new Set<string>();
    for (const name of names) {
        const parsed = parseQueue(files.read(name));
        for (const job of parsed) {
            seen.add(job.id);
        }
        // A held file for this ledger already names it, so routing its jobs again could only move them.
        if (route === undefined || ownHeld.has(name)) {
            jobs.push(...parsed);
            continue;
        }
        for (const job of parsed) {
            const destination = destinationOf(job, route);
            if (destination === route.key) {
                jobs.push(job);
            } else if (!route.dismissed?.has(job.id)) {
                addJob(leaving, destination, job);
            }
        }
    }
    const claimed: ClaimedWrites = { jobs: uniqueById(jobs), names, seen };
    if (route !== undefined) {
        claimed.cutoffs = cutoffs;
        claimed.route = route;
    }
    if (leaving.size > 0) {
        claimed.held = [...leaving].map(([key, bucket]) => ({
            jobs: uniqueById(bucket),
            name: heldName(files, key),
        }));
    }
    return claimed;
}

/** Writes a name nothing has used before discarding: a crash in between replays the claims into another held file. */
export function releasePendingWrites(files: QueueFiles, claimed: ClaimedWrites): void {
    for (const { jobs, name } of claimed.held ?? []) {
        files.write(name, toQueueText(jobs));
        if (!files.list().includes(name)) {
            throw new Error(`Held pending writes were not stored in ${name}, so their claim files stay for a replay`);
        }
    }
    const { route } = claimed;
    const own: PendingWrite[] = [];
    const leaving = new Map<string, PendingWrite[]>();
    for (const name of claimed.names) {
        // An intent that opened the live queue before the rename appends to the claimed file after the claim read it.
        const late = parseQueue(files.read(name)).filter((job) => !claimed.seen.has(job.id));
        // A held file for this ledger already names it, so a late append there is the current ledger's.
        if (route === undefined || heldOrder(name, route.key) !== null) {
            own.push(...late);
            continue;
        }
        for (const job of late) {
            const destination = destinationOf(job, route);
            if (destination === route.key) {
                own.push(job);
            } else if (!route.dismissed?.has(job.id)) {
                addJob(leaving, destination, job);
            }
        }
    }
    for (const [key, bucket] of leaving) {
        const name = heldName(files, key);
        files.write(name, toQueueText(uniqueById(bucket)));
        if (!files.list().includes(name)) {
            throw new Error(`Held pending writes were not stored in ${name}, so their claim files stay for a replay`);
        }
    }
    if (!adoptQueue(files, uniqueById(own))) {
        throw new Error("Late pending writes could not be parked, so their claim files stay for a replay");
    }
    for (const name of claimed.names) {
        files.discard(name);
    }
}
