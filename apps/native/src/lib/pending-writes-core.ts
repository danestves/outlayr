import { z } from "zod";

/** Written by `app-intents/LogTransactionIntent.swift`: the field names are the wire format. */
export interface PendingWrite {
    amount: number;
    /** The amount as it arrived (e.g. "€12,40"); the drain reads the currency back out of it. */
    amountText?: string | null;
    card?: string | null;
    category: string | null;
    categoryId?: string | null;
    /** Beats `amountText` when the automation pinned one. */
    currency?: string | null;
    /** Epoch ms: when the intent ran, not when the app drained it. */
    date: number;
    /**
     * Identifies the purchase, where `id` identifies the enqueue: Wallet fires once on authorize and again on
     * settle. Carries no timestamp; the window is `WALLET_DEDUPE_WINDOW_MS` in `src/data/pending-writes-core.ts`.
     */
    dedupeKey?: string | null;
    id: string;
    income: boolean;
    note: string;
    text?: string | null;
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

/** Only five fields are required: an extension build older than the app is normal. */
const pendingWriteSchema = z.object({
    amount: z.number().finite(),
    amountText: z.string().nullish(),
    card: z.string().nullish(),
    category: z
        .string()
        .nullish()
        .transform((value) => value ?? null),
    categoryId: z.string().nullish(),
    currency: z.string().nullish(),
    date: z.number().finite(),
    dedupeKey: z.string().nullish(),
    id: z.string(),
    income: z.boolean(),
    note: z.string(),
    text: z.string().nullish(),
});

function parsePendingWrite(line: string): PendingWrite | null {
    try {
        const parsed = pendingWriteSchema.safeParse(JSON.parse(line));
        return parsed.success ? parsed.data : null;
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
        const parsed = z.array(pendingWriteSchema.nullable().catch(null)).safeParse(JSON.parse(raw));
        return parsed.success ? parsed.data.filter((write) => write !== null) : [];
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
