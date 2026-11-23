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

export interface ClaimLedger {
    /** `ledgerKey` of the profile this launch opened: captures older than `left.at` are not its own. */
    key: string;
    /** The switch that opened this launch left another ledger behind. */
    left?: { at: number; from: string };
}

export interface ClaimedWrites {
    /** Capture ids the intent stored a server reply for; see `CaptureLookup.swift`. */
    captured?: ReadonlySet<string>;
    /** Captures a switch left behind, for the ledger they were made on; `release` writes them to `name`. */
    held?: { jobs: PendingWrite[]; name: string };
    jobs: PendingWrite[];
    names: string[];
    /** A release settles the switch by clearing its marker. */
    settlesSwitch?: boolean;
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
    const key = ledger?.key;
    const left = ledger?.left;
    const holding = key !== undefined && left !== undefined && left.from !== key ? left : undefined;
    const held = key === undefined ? [] : heldNames(files, key);
    names.push(...held);
    const hidden = new Set(held);
    const jobs: PendingWrite[] = [];
    const leaving: PendingWrite[] = [];
    for (const name of names) {
        const parsed = parseQueue(files.read(name));
        if (hidden.has(name) || holding === undefined) {
            jobs.push(...parsed);
        } else {
            for (const job of parsed) {
                if (job.date < holding.at) {
                    leaving.push(job);
                } else {
                    jobs.push(job);
                }
            }
        }
    }
    const claimed: ClaimedWrites = { jobs: uniqueById(jobs), names };
    if (holding !== undefined) {
        claimed.settlesSwitch = true;
        if (leaving.length > 0) {
            claimed.held = { jobs: uniqueById(leaving), name: heldName(files, holding.from) };
        }
    }
    return claimed;
}

/** Writes a name nothing has used before discarding: a crash in between replays the claims into another held file. */
export function releasePendingWrites(files: QueueFiles, claimed: ClaimedWrites): void {
    const { held } = claimed;
    if (held !== undefined && held.jobs.length > 0) {
        files.write(held.name, toQueueText(held.jobs));
    }
    for (const name of claimed.names) {
        files.discard(name);
    }
}
