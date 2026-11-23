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
    /** Captures a switch left behind, for the ledger they were made on; `release` appends them to `name`. */
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
 * between. Earlier claims never released replay too, so a force-quit mid-drain does not drop writes.
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
    const heldName = key === undefined ? undefined : `held-${key}.jsonl`;
    if (heldName !== undefined && files.list().includes(heldName)) {
        names.push(heldName);
    }
    const jobs: PendingWrite[] = [];
    const leaving: PendingWrite[] = [];
    for (const name of names) {
        const parsed = parseQueue(files.read(name));
        if (name === heldName || holding === undefined) {
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
    const claimed: ClaimedWrites = { jobs, names };
    if (holding !== undefined) {
        claimed.settlesSwitch = true;
        if (leaving.length > 0) {
            claimed.held = { jobs: leaving, name: `held-${holding.from}.jsonl` };
        }
    }
    return claimed;
}

/** Appends before discarding: a crash between the two replays the claims, so the held file dedupes by id. */
export function releasePendingWrites(files: QueueFiles, claimed: ClaimedWrites): void {
    const { held } = claimed;
    if (held !== undefined && held.jobs.length > 0) {
        const existing = parseQueue(files.read(held.name));
        const ids = new Set(existing.map((job) => job.id));
        for (const job of held.jobs) {
            if (!ids.has(job.id)) {
                ids.add(job.id);
                existing.push(job);
            }
        }
        files.write(held.name, toQueueText(existing));
    }
    for (const name of claimed.names) {
        files.discard(name);
    }
}
