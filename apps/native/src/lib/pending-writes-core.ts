import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

/** Only five fields are required: an extension build older than the app is normal. */
const PendingWrite = Schema.Struct({
    amount: Schema.Finite,
    /** The amount as it arrived (e.g. "€12,40"); the drain reads the currency back out of it. */
    amountText: Schema.optional(Schema.NullOr(Schema.String)),
    card: Schema.optional(Schema.NullOr(Schema.String)),
    category: Schema.NullOr(Schema.String).pipe(Schema.withDecodingDefault(Effect.succeed(null))),
    categoryId: Schema.optional(Schema.NullOr(Schema.String)),
    /** Beats `amountText` when the automation pinned one. */
    currency: Schema.optional(Schema.NullOr(Schema.String)),
    /** Epoch ms: when the intent ran, not when the app drained it. */
    date: Schema.Finite,
    /**
     * Identifies the purchase, where `id` identifies the enqueue: Wallet fires once on authorize and again on
     * settle. Carries no timestamp; the window is `WALLET_DEDUPE_WINDOW_MS` in `src/data/pending-writes-core.ts`.
     */
    dedupeKey: Schema.optional(Schema.NullOr(Schema.String)),
    id: Schema.String,
    income: Schema.Boolean,
    note: Schema.String,
    text: Schema.optional(Schema.NullOr(Schema.String)),
});

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

export const QUEUE_DIRECTORY = "pending-writes";

export const QUEUE_FILE = "queue.jsonl";

const CLAIM_NAME = /^claimed-(\d+)\.jsonl$/;

export interface QueueFiles {
    claim: (name: string) => boolean;
    discard: (name: string) => void;
    list: () => string[];
    read: (name: string) => string;
    write: (name: string, text: string) => void;
}

export interface ClaimedWrites {
    jobs: PendingWrite[];
    names: string[];
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

export function adoptQueue(files: QueueFiles, jobs: PendingWrite[]): void {
    if (jobs.length === 0) {
        return;
    }
    files.write(claimName(files), toQueueText(jobs));
}

/**
 * Renamed rather than read-and-cleared, so a concurrent append lands in the claim or the fresh file, never in
 * between. Earlier claims never released replay too, so a force-quit mid-drain does not drop writes.
 */
export function claimPendingWrites(files: QueueFiles): ClaimedWrites {
    const names = claimNames(files);
    const next = claimName(files);
    if (files.claim(next)) {
        names.push(next);
    }
    return {
        jobs: names.flatMap((name) => parseQueue(files.read(name))),
        names,
    };
}

export function releasePendingWrites(files: QueueFiles, claimed: ClaimedWrites): void {
    for (const name of claimed.names) {
        files.discard(name);
    }
}
