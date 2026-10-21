import { RECURRING_TYPE } from "@outlayr/money/recurrence";
import type { RecurringType } from "@outlayr/money/recurrence";
import { roundMoney } from "@outlayr/money/round";

import type {
    ProposedDraft,
    VoiceDraft,
    VoiceQuote,
    VoiceQuoteField,
    VoiceRecurrence,
    VoiceRecurrenceUnit,
} from "@/lib/convex";
import { PROPOSE_DRAFT_TOOL } from "@/lib/convex";

import { minorUnitsFor } from "./money";

export interface ResolvedRecurrence {
    coefficient: number;
    type: RecurringType;
}

export interface ResolvedVoiceEntry {
    accountId: string | null;
    accountUnresolved: boolean;
    categoryUnresolved: boolean;
    amount: number;
    categoryId: string | null;
    currency: string;
    date: Date;
    details: string | null;
    domain: string | null;
    income: boolean;
    kind: "entry";
    merchant: string;
    recurrence: ResolvedRecurrence | null;
}

// A cross-currency move needs a rate nobody speaks, so a `currency` unlike an account's goes to the transfer editor.
export interface ResolvedVoiceTransfer {
    amount: number;
    currency: string;
    date: Date;
    details: string | null;
    fromAccount: AccountCandidate | null;
    fromUnresolved: boolean;
    kind: "transfer";
    toAccount: AccountCandidate | null;
    toUnresolved: boolean;
}

export type ResolvedVoiceDraft = ResolvedVoiceEntry | ResolvedVoiceTransfer;

export interface CategoryCandidate {
    id: string;
    income: boolean;
    name: string | null;
}

export interface AccountCandidate {
    currency: string;
    id: string;
    name: string;
}

interface ResolveArgs {
    accounts: readonly AccountCandidate[];
    /** The prompt did not carry every account, so a draft naming none may name one the model never saw. */
    accountsOmitted?: boolean;
    categoriesOmitted?: boolean;
    categories: readonly CategoryCandidate[];
    currency: string;
    draft: VoiceDraft;
    now: Date;
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** The same fold `transfer-core.ts:categoryKey` links CSV values under. */
const foldName = (value: string) => value.trim().toLowerCase();

// Today keeps the clock so the entry sorts among today's rows; other days land at noon, clear of DST edges.
export function spokenDateToLocal(date: string, now: Date): Date {
    const match = ISO_DATE.exec(date);
    if (match === null) {
        return now;
    }
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    const isToday = year === now.getFullYear() && month === now.getMonth() && day === now.getDate();
    if (isToday) {
        return now;
    }
    const local = new Date(year, month, day, 12, 0, 0, 0);
    return Number.isNaN(local.getTime()) ? now : local;
}

const RECURRING_TYPE_OF = {
    day: RECURRING_TYPE.daily,
    month: RECURRING_TYPE.monthly,
    week: RECURRING_TYPE.weekly,
    year: RECURRING_TYPE.yearly,
} as const satisfies Record<VoiceRecurrenceUnit, RecurringType>;

export function resolveRecurrence(recurrence: VoiceRecurrence | null): ResolvedRecurrence | null {
    return recurrence === null ? null : { coefficient: recurrence.every, type: RECURRING_TYPE_OF[recurrence.unit] };
}

// Duplicate names are no match: the ledger allows them, and a draft that could land on either is not saved unasked.
export function uniqueMatch<T>(
    candidates: readonly T[],
    name: string | null,
    nameOf: (candidate: T) => string | null
): T | null {
    if (name == null) {
        return null;
    }
    const wanted = foldName(name);
    const matches = candidates.filter((candidate) => {
        const candidateName = nameOf(candidate);
        return candidateName != null && foldName(candidateName) === wanted;
    });
    return matches.length === 1 ? (matches[0] ?? null) : null;
}

export function resolveVoiceDraft({
    accounts,
    accountsOmitted = false,
    categories,
    categoriesOmitted = false,
    currency,
    draft,
    now,
}: ResolveArgs): ResolvedVoiceDraft {
    const findAccount = (name: string | null) => uniqueMatch(accounts, name, (candidate) => candidate.name);

    if (draft.kind === "transfer") {
        const fromAccount = findAccount(draft.fromAccountName);
        const matchedTo = findAccount(draft.toAccountName);
        const toAccount = matchedTo !== null && matchedTo.id === fromAccount?.id ? null : matchedTo;
        const moved = draft.currency ?? fromAccount?.currency ?? currency;
        return {
            amount: roundMoney(draft.amount, minorUnitsFor(moved)),
            currency: moved,
            date: spokenDateToLocal(draft.date, now),
            details: draft.details,
            fromAccount,
            fromUnresolved: draft.fromAccountName === null ? accountsOmitted : fromAccount === null,
            kind: "transfer",
            toAccount,
            toUnresolved: draft.toAccountName === null ? accountsOmitted : toAccount === null,
        };
    }

    const category = uniqueMatch(
        categories.filter((candidate) => candidate.income === draft.income),
        draft.categoryName,
        (candidate) => candidate.name
    );

    const spent = draft.currency ?? currency;
    const account = findAccount(draft.accountName);
    return {
        accountId: account?.id ?? null,
        accountUnresolved: draft.accountName === null ? accountsOmitted : account === null,
        amount: roundMoney(draft.amount, minorUnitsFor(spent)),
        categoryId: category?.id ?? null,
        categoryUnresolved: categoriesOmitted,
        currency: spent,
        date: spokenDateToLocal(draft.date, now),
        details: draft.details,
        domain: draft.domain,
        income: draft.income,
        kind: "entry",
        merchant: draft.merchant,
        recurrence: resolveRecurrence(draft.recurrence),
    };
}

// Sync can tombstone a category or account before Save is tapped, and the row would land on a hidden one.
export function stillCurrent(
    draft: { accountId: string | null; categoryId: string | null },
    live: { accountIds: ReadonlySet<string>; categoryIds: ReadonlySet<string> }
): boolean {
    const categoryCurrent = draft.categoryId === null || live.categoryIds.has(draft.categoryId);
    const accountCurrent = draft.accountId === null || live.accountIds.has(draft.accountId);
    return categoryCurrent && accountCurrent;
}

export function transferStillCurrent(
    transfer: { fromAccount: { id: string } | null; toAccount: { id: string } | null },
    live: { accountIds: ReadonlySet<string> }
): boolean {
    const legs = [transfer.fromAccount, transfer.toAccount];
    return legs.every((leg) => leg === null || live.accountIds.has(leg.id));
}

export function savableEntry(draft: ResolvedVoiceEntry): { categoryId: string } | null {
    const named = draft.merchant.trim().length > 0;
    const placed = !(draft.accountUnresolved || draft.categoryUnresolved);
    const ready = draft.categoryId !== null && draft.amount > 0 && named && placed;
    return ready && draft.categoryId !== null ? { categoryId: draft.categoryId } : null;
}

export function savableTransfer(draft: ResolvedVoiceTransfer): { from: AccountCandidate; to: AccountCandidate } | null {
    const { fromAccount, toAccount, currency } = draft;
    if (fromAccount === null || toAccount === null || !(draft.amount > 0)) {
        return null;
    }
    return fromAccount.currency === currency && toAccount.currency === currency
        ? { from: fromAccount, to: toAccount }
        : null;
}

// The recorder meters in dBFS (-160 silence to 0 clipping); speech in a quiet room sits between -40 and -10.
const METER_FLOOR_DB = -45;
const METER_CEILING_DB = -8;

export function meterToLevel(metering: number | undefined): number {
    if (metering == null || !Number.isFinite(metering)) {
        return 0;
    }
    const level = (metering - METER_FLOOR_DB) / (METER_CEILING_DB - METER_FLOOR_DB);
    return Math.min(1, Math.max(0, level));
}

const SPEECH_OVER_ROOM = 0.14;
const SPEECH_FLOOR = 0.1;
const SOUND_OVER_ROOM = 0.07;
const SOUND_MS = 300;
const ROOM_WINDOW_MS = 3000;
export const TRAILING_SILENCE_MS = 2000;
export const NO_SPEECH_TIMEOUT_MS = 9000;
export const MAX_RECORDING_MS = 45_000;

export interface SilenceWatch {
    lastSpeechAt: number | null;
    recent: readonly { at: number; level: number }[];
    sampledAt: number;
    soundMs: number;
    startedAt: number;
}

export function startSilenceWatch(at: number): SilenceWatch {
    return { lastSpeechAt: null, recent: [], sampledAt: at, soundMs: 0, startedAt: at };
}

type SilenceVerdict = "keep" | "finished" | "nothingSaid" | "tooLong";

export interface SilenceJudgement {
    verdict: SilenceVerdict;
    watch: SilenceWatch;
}

export function judgeSilence(watch: SilenceWatch, level: number, at: number): SilenceJudgement {
    const elapsed = Math.max(0, at - watch.sampledAt);
    const recent = [...watch.recent.filter((sample) => at - sample.at < ROOM_WINDOW_MS), { at, level }];
    const room = Math.min(...recent.map((sample) => sample.level));
    const speech = level >= Math.max(SPEECH_FLOOR, room + SPEECH_OVER_ROOM);
    const murmur = !speech && level >= room + SOUND_OVER_ROOM;
    const next: SilenceWatch = {
        lastSpeechAt: speech ? at : watch.lastSpeechAt,
        recent,
        sampledAt: at,
        soundMs: murmur ? watch.soundMs + elapsed : watch.soundMs,
        startedAt: watch.startedAt,
    };
    const heardSomething = next.lastSpeechAt !== null || next.soundMs >= SOUND_MS;
    if (at - next.startedAt >= MAX_RECORDING_MS) {
        return { verdict: heardSomething ? "tooLong" : "nothingSaid", watch: next };
    }
    if (next.lastSpeechAt === null) {
        if (at - next.startedAt < NO_SPEECH_TIMEOUT_MS) {
            return { verdict: "keep", watch: next };
        }
        return { verdict: heardSomething ? "finished" : "nothingSaid", watch: next };
    }
    return { verdict: at - next.lastSpeechAt >= TRAILING_SILENCE_MS ? "finished" : "keep", watch: next };
}

/** `YYYY-MM-DD` on the device's own calendar, never UTC's. */
export function localIsoDate(now: Date): string {
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${now.getFullYear()}-${month}-${day}`;
}

export interface VoiceTurnMessage {
    order: number;
    parts: readonly { output?: unknown; state?: string; type: string }[];
    role: string;
    status: string;
    text: string;
}

export type VoiceTurn =
    | { kind: "said"; order: number; text: string }
    | { draft: VoiceDraft | null; kind: "proposed"; order: number };

const DRAFT_PART = `tool-${PROPOSE_DRAFT_TOOL}`;

export function proposedDraftOf(message: VoiceTurnMessage): ProposedDraft | null {
    if (message.role !== "assistant") {
        return null;
    }
    const part = message.parts.find(
        (candidate) => candidate.type === DRAFT_PART && candidate.state === "output-available"
    );
    if (part === undefined) {
        return null;
    }
    // SAFETY: the part is the `ProposedDraft` the server's `proposeDraft` tool returned.
    return part.output as ProposedDraft;
}

export function voiceTurnsOf(messages: readonly VoiceTurnMessage[]): VoiceTurn[] {
    const turns: VoiceTurn[] = [];
    for (const message of messages) {
        if (message.role === "user") {
            turns.push({ kind: "said", order: message.order, text: message.text });
            continue;
        }
        const proposed = proposedDraftOf(message);
        if (proposed !== null) {
            turns.push({ draft: proposed.draft, kind: "proposed", order: message.order });
        }
    }
    return turns;
}

export type VoiceDraftField = "amount" | "merchant" | "category" | "account" | "date" | "kind" | "schedule" | "details";

export function draftDelta(previous: VoiceDraft, next: VoiceDraft): VoiceDraftField[] {
    const changed: VoiceDraftField[] = [];
    if (previous.kind !== next.kind) {
        changed.push("kind");
    }
    if (previous.amount !== next.amount || previous.currency !== next.currency) {
        changed.push("amount");
    }
    if (previous.date !== next.date) {
        changed.push("date");
    }
    if (previous.details !== next.details) {
        changed.push("details");
    }
    if (previous.kind === "entry" && next.kind === "entry") {
        if (previous.merchant !== next.merchant) {
            changed.push("merchant");
        }
        if (previous.categoryName !== next.categoryName || previous.income !== next.income) {
            changed.push("category");
        }
        if (previous.accountName !== next.accountName) {
            changed.push("account");
        }
        if (
            previous.recurrence?.every !== next.recurrence?.every ||
            previous.recurrence?.unit !== next.recurrence?.unit
        ) {
            changed.push("schedule");
        }
    } else if (
        previous.kind === "transfer" &&
        next.kind === "transfer" &&
        (previous.fromAccountName !== next.fromAccountName || previous.toAccountName !== next.toAccountName)
    ) {
        changed.push("account");
    }
    return changed;
}

export interface HeardSegment {
    field: VoiceQuoteField | null;
    start: number;
    text: string;
}

export function heardSegments(sentence: string, quotes: readonly VoiceQuote[]): HeardSegment[] {
    // Lower-casing can change a string's length (İ); then only exact matches are safe to slice.
    const folded = sentence.toLowerCase();
    const caseless = folded.length === sentence.length;
    const haystack = caseless ? folded : sentence;
    const spans: { end: number; field: VoiceQuoteField; start: number }[] = [];
    for (const quote of quotes) {
        const needle = caseless ? quote.text.trim().toLowerCase() : quote.text.trim();
        if (needle.length === 0) {
            continue;
        }
        const overlaps = (at: number) => spans.some((span) => at < span.end && at + needle.length > span.start);
        let start = haystack.indexOf(needle);
        while (start !== -1 && overlaps(start)) {
            start = haystack.indexOf(needle, start + 1);
        }
        if (start !== -1) {
            spans.push({ end: start + needle.length, field: quote.field, start });
        }
    }
    spans.sort((a, b) => a.start - b.start);
    const segments: HeardSegment[] = [];
    let cursor = 0;
    for (const span of spans) {
        if (span.start > cursor) {
            segments.push({ field: null, start: cursor, text: sentence.slice(cursor, span.start) });
        }
        segments.push({ field: span.field, start: span.start, text: sentence.slice(span.start, span.end) });
        cursor = span.end;
    }
    if (cursor < sentence.length) {
        segments.push({ field: null, start: cursor, text: sentence.slice(cursor) });
    }
    return segments;
}
