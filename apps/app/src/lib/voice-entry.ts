import type { CategoryBranch } from "@outlayr/backend/confect/lib/ledgerPrompt";
import type { ProposedDraft, VoiceDraft } from "@outlayr/backend/confect/voiceEntry";
import { decimalsFor } from "@outlayr/money/currency";
import { RECURRING_TYPE } from "@outlayr/money/recurrence";
import { roundMoney } from "@outlayr/money/round";

import { liveCategories } from "./category-writes";
import { openAccounts } from "./dashboard-series-ledger";
import type { Ledger } from "./dashboard-series-ledger";
import { blankValues, wallText } from "./entry-writes";
import type { EntryValues } from "./entry-writes";
import { money } from "./ledger";
import { transferAccounts } from "./transfer-create";
import type { NewTransferValues } from "./transfer-create";

// Mirrors `namesWithinBudget` in packages/backend/confect/lib/ledgerPrompt.ts, or an oversized ledger fails every take.
const MAX_CATEGORY_NAMES = 200;
const MAX_ACCOUNT_NAMES = 50;
const MAX_CHILDREN_PER_BRANCH = 50;
const MAX_NAME_LENGTH = 80;
const MAX_TOTAL_NAMES = 400;

export interface PromptLedger {
    accounts: string[];
    accountsOmitted: boolean;
    categoriesOmitted: boolean;
    categoryTree: CategoryBranch[];
}

const fits = (name: string) => name.length <= MAX_NAME_LENGTH;
const count = (branches: readonly CategoryBranch[]) =>
    branches.reduce((sum, branch) => sum + 1 + branch.children.length, 0);

/** The names the model may answer with: the accounts the entry form offers and every live category. */
export function promptLedger(books: Ledger["books"]): PromptLedger {
    const accounts = openAccounts(books).map((row) => row.name);
    const live = liveCategories(books.categories);
    const tree = live.flatMap((row) =>
        row.parentId === null && row.name !== null
            ? [
                  {
                      children: live.flatMap((child) =>
                          child.parentId === row.localId && child.name !== null ? [child.name] : []
                      ),
                      name: row.name,
                  },
              ]
            : []
    );
    const keptAccounts = accounts.filter(fits).slice(0, MAX_ACCOUNT_NAMES);
    let total = keptAccounts.length;
    const categoryTree: CategoryBranch[] = [];
    for (const branch of tree.slice(0, MAX_CATEGORY_NAMES)) {
        const room = MAX_TOTAL_NAMES - total - 1;
        if (room < 0) {
            break;
        }
        if (fits(branch.name)) {
            const children = branch.children.filter(fits).slice(0, Math.min(MAX_CHILDREN_PER_BRANCH, room));
            categoryTree.push({ children, name: branch.name });
            total += 1 + children.length;
        }
    }
    return {
        accounts: keptAccounts,
        accountsOmitted: keptAccounts.length < accounts.length,
        categoriesOmitted: count(categoryTree) < count(tree),
        categoryTree,
    };
}

const foldName = (value: string) => value.trim().toLowerCase();

// Duplicate names are no match: the ledger allows them, and a draft that could land on either is not saved unasked.
function uniqueMatch<T extends { name: string | null }>(candidates: readonly T[], name: string | null): T | null {
    if (name === null) {
        return null;
    }
    const wanted = foldName(name);
    const matches = candidates.filter((candidate) => candidate.name !== null && foldName(candidate.name) === wanted);
    return matches.length === 1 ? (matches[0] ?? null) : null;
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/u;

/** Today keeps the clock so the entry sorts among today's rows; other days land at noon, as the phone files them. */
function spokenDateText(date: string, ledger: Pick<Ledger, "offsetAt">, at: number) {
    const now = wallText(at, ledger);
    return !ISO_DAY.test(date) || now.startsWith(date) ? now : `${date}T12:00`;
}

/** The ledger's calendar day, which the model resolves "yesterday" against. */
export const ledgerToday = (ledger: Pick<Ledger, "offsetAt">, at: number) => wallText(at, ledger).slice(0, 10);

const REPEAT_OF = {
    day: RECURRING_TYPE.daily,
    month: RECURRING_TYPE.monthly,
    week: RECURRING_TYPE.weekly,
    year: RECURRING_TYPE.yearly,
} as const;

/** Why the sheet cannot save a draft on its own and hands it to the form instead. */
export type VoiceGap = "account" | "amount" | "category" | "currency" | "merchant" | "schedule";

export type ResolvedVoiceDraft =
    | { gaps: readonly VoiceGap[]; kind: "entry"; newCategory: string | null; values: EntryValues }
    | { currency: string; gaps: readonly VoiceGap[]; kind: "transfer"; values: NewTransferValues };

type VoiceTransferDraft = Extract<VoiceDraft, { kind: "transfer" }>;
type VoiceEntryDraft = Extract<VoiceDraft, { kind: "entry" }>;

function resolveTransfer(ledger: Ledger, draft: VoiceTransferDraft, dateText: string): ResolvedVoiceDraft {
    const choices = transferAccounts(ledger.books);
    const from = uniqueMatch(choices, draft.fromAccountName);
    const matchedTo = uniqueMatch(choices, draft.toAccountName);
    const to = matchedTo?.localId === from?.localId ? null : matchedTo;
    const currency = draft.currency ?? from?.currency ?? ledger.currency;
    const amount = roundMoney(draft.amount, decimalsFor(currency));
    const gaps: VoiceGap[] = [];
    if (from === null || to === null) {
        gaps.push("account");
    }
    // A cross-currency move needs a rate nobody speaks.
    if ([from, to].some((side) => side !== null && side.currency !== currency)) {
        gaps.push("currency");
    }
    if (!(amount > 0)) {
        gaps.push("amount");
    }
    return {
        currency,
        gaps,
        kind: "transfer",
        values: {
            arrivedByHand: false,
            arrivedText: "",
            dateText,
            feeText: "",
            fromId: from?.localId ?? null,
            note: draft.details ?? "",
            sentText: amount > 0 ? money(amount, from?.currency ?? currency) : "",
            toId: to?.localId ?? null,
        },
    };
}

function entryGaps(
    draft: VoiceEntryDraft,
    matched: { account: boolean; amount: number; category: boolean },
    sent: Pick<PromptLedger, "accountsOmitted">
) {
    const gaps: VoiceGap[] = [];
    if (!matched.category) {
        gaps.push("category");
    }
    if (draft.accountName === null ? sent.accountsOmitted : !matched.account) {
        gaps.push("account");
    }
    if (!(matched.amount > 0)) {
        gaps.push("amount");
    }
    if (draft.merchant.trim() === "") {
        gaps.push("merchant");
    }
    // The form has no "every 2 weeks"; the schedule is said, so it is never dropped quietly.
    if (draft.recurrence !== null && draft.recurrence.every !== 1) {
        gaps.push("schedule");
    }
    return gaps;
}

function resolveEntry(
    ledger: Ledger,
    sent: Pick<PromptLedger, "accountsOmitted" | "categoriesOmitted">,
    draft: VoiceEntryDraft,
    dateText: string,
    at: number
): ResolvedVoiceDraft {
    const sameSide = liveCategories(ledger.books.categories).filter((row) => row.income === draft.income);
    const category = uniqueMatch(sameSide, draft.categoryName);
    const account = uniqueMatch(openAccounts(ledger.books), draft.accountName);
    const currency = draft.currency ?? account?.currency ?? ledger.currency;
    const amount = roundMoney(draft.amount, decimalsFor(currency));
    const spoken = draft.categoryName === null ? null : foldName(draft.categoryName);
    const known = sameSide.some((row) => row.name !== null && foldName(row.name) === spoken);
    const newCategory =
        draft.categoryName !== null && category === null && !known && !sent.categoriesOmitted
            ? draft.categoryName
            : null;
    const blank = blankValues(ledger, account?.localId ?? null, at);
    return {
        gaps: entryGaps(draft, { account: account !== null, amount, category: category !== null }, sent),
        kind: "entry",
        newCategory,
        values: {
            ...blank,
            accountId: account?.localId ?? blank.accountId,
            amountText: amount > 0 ? money(amount, currency) : "",
            categoryId: category?.localId ?? null,
            currency,
            currencyByHand: draft.currency !== null && draft.currency !== (account?.currency ?? blank.currency),
            dateText,
            details: draft.details ?? "",
            income: draft.income,
            note: draft.merchant.trim(),
            recurringType: draft.recurrence === null ? RECURRING_TYPE.none : REPEAT_OF[draft.recurrence.unit],
        },
    };
}

/** The draft as the forms' values, and what keeps the sheet from saving it as it stands. */
export function resolveVoiceDraft(
    ledger: Ledger,
    sent: Pick<PromptLedger, "accountsOmitted" | "categoriesOmitted">,
    draft: VoiceDraft,
    at: number
): ResolvedVoiceDraft {
    const dateText = spokenDateText(draft.date, ledger, at);
    return draft.kind === "transfer"
        ? resolveTransfer(ledger, draft, dateText)
        : resolveEntry(ledger, sent, draft, dateText, at);
}

interface TurnMessage {
    order: number;
    parts: readonly { output?: unknown; state?: string; type: string }[];
    role: string;
    status: string;
    text: string;
}

const DRAFT_PART = "tool-proposeDraft";

export type TurnAnswer = { kind: "pending" } | { kind: "failed" } | { kind: "proposed"; proposed: ProposedDraft };

/** The assistant's answer to the turn at `order`, as `proposeDraft` returned it. */
export function answerAt(messages: readonly TurnMessage[], order: number): TurnAnswer {
    const answer = messages.find((message) => message.role === "assistant" && message.order === order);
    if (answer === undefined) {
        return { kind: "pending" };
    }
    const part = answer.parts.find((each) => each.type === DRAFT_PART && each.state === "output-available");
    if (part !== undefined) {
        // SAFETY: the part is the `ProposedDraft` the server's `proposeDraft` tool returned.
        return { kind: "proposed", proposed: part.output as ProposedDraft };
    }
    return answer.status === "failed" ? { kind: "failed" } : { kind: "pending" };
}

// The recorder meters in dBFS (-160 silence to 0 clipping); speech in a quiet room sits between -40 and -10.
const METER_FLOOR_DB = -45;
const METER_CEILING_DB = -8;

export function meterToLevel(rms: number): number {
    const db = 20 * Math.log10(rms);
    if (!Number.isFinite(db)) {
        return 0;
    }
    return Math.min(1, Math.max(0, (db - METER_FLOOR_DB) / (METER_CEILING_DB - METER_FLOOR_DB)));
}

// The phone's silence judge (apps/native/src/domain/voice-entry.ts), so a take ends after the same pause.
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

export const startSilenceWatch = (at: number): SilenceWatch => ({
    lastSpeechAt: null,
    recent: [],
    sampledAt: at,
    soundMs: 0,
    startedAt: at,
});

export type SilenceVerdict = "keep" | "finished" | "nothingSaid" | "tooLong";

export function judgeSilence(watch: SilenceWatch, level: number, at: number) {
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
    let verdict: SilenceVerdict = "keep";
    if (at - next.startedAt >= MAX_RECORDING_MS) {
        verdict = heardSomething ? "tooLong" : "nothingSaid";
    } else if (next.lastSpeechAt === null) {
        if (at - next.startedAt >= NO_SPEECH_TIMEOUT_MS) {
            verdict = heardSomething ? "finished" : "nothingSaid";
        }
    } else if (at - next.lastSpeechAt >= TRAILING_SILENCE_MS) {
        verdict = "finished";
    }
    return { verdict, watch: next };
}
