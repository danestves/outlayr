import {
    Agent,
    createTool,
    getThreadMetadata,
    listUIMessages,
    stepCountIs,
    syncStreams,
    vStreamArgs,
} from "@convex-dev/agent";
import { HOUR, RateLimiter } from "@convex-dev/rate-limiter";
import { transcribe } from "ai";
import type { LanguageModel, TranscriptionModel } from "ai";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import { components } from "../convex/_generated/api";
import { query } from "../convex/_generated/server";
import type { ActionCtx, MutationCtx, QueryCtx } from "../convex/_generated/server";
import {
    clampDate,
    CURRENCY_PATTERN,
    describeTree,
    MAX_NAME_LENGTH,
    normalizeDomain,
    pickKnown,
    trimTo,
} from "./lib/ledgerPrompt";
import type { LedgerContext } from "./lib/ledgerPrompt";
import { modelCallError, modelSchema } from "./lib/modelCall";
import type { SpeakResult, SpeakStatus } from "./voiceEntry.spec";

// A Convex value tops out at 1MB; a minute of AAC at the client's 48kbps mono preset is ~360KB.
export const MAX_AUDIO_BYTES = 900_000;
const MAX_MERCHANT_LENGTH = 80;
const MAX_DETAILS_LENGTH = 200;
const MAX_PAST_DAYS = 366;
const MAX_RECURRENCE_EVERY = 99;
const MAX_QUOTE_LENGTH = 60;
const MAX_QUOTES = 8;
// The ledger's 13-digit ceiling (apps/native/src/domain/numpad.ts) keeps cent arithmetic inside float64's safe range.
const MAX_AMOUNT = 9_999_999_999_999;
const MAX_FUTURE_DAYS = 1;
// Both calls run in sequence inside the client's 25s abort.
const TRANSCRIBE_TIMEOUT_MS = 10_000;
export const PARSE_TIMEOUT_MS = 10_000;
export const CONTEXT_TURNS = 12;
// The privacy backstop for a thread whose `endThread` never ran, measured from its last turn rather than its opening.
export const THREAD_TTL_MS = 60 * 60 * 1000;

export const PROPOSE_DRAFT_TOOL = "proposeDraft";

type Heard = { text: string } | { error: "empty" | "provider" };

/** `ai` still admits older model specs in `LanguageModel`; the agent takes the current one only. */
type AgentModel = Extract<LanguageModel, { specificationVersion: "v4" }>;

interface VoiceDraftBase {
    amount: number;
    /** ISO 4217, upper case. Null means the ledger's own currency. */
    currency: string | null;
    /** `YYYY-MM-DD` in the device's local calendar. */
    date: string;
    details: string | null;
}

export type RecurrenceUnit = "day" | "week" | "month" | "year";

export interface VoiceRecurrence {
    every: number;
    unit: RecurrenceUnit;
}

export interface VoiceEntryDraft extends VoiceDraftBase {
    accountName: string | null;
    categoryName: string | null;
    domain: string | null;
    income: boolean;
    kind: "entry";
    merchant: string;
    recurrence: VoiceRecurrence | null;
}

export interface VoiceTransferDraft extends VoiceDraftBase {
    fromAccountName: string | null;
    kind: "transfer";
    toAccountName: string | null;
}

export type VoiceDraft = VoiceEntryDraft | VoiceTransferDraft;

const QUOTE_FIELDS = ["amount", "merchant", "category", "account", "date", "schedule"] as const;

export interface VoiceQuote {
    field: (typeof QUOTE_FIELDS)[number];
    text: string;
}

/** A null `draft` means the words held no transaction. */
export interface ProposedDraft {
    draft: VoiceDraft | null;
    quotes?: VoiceQuote[];
}

export function failure(status: Exclude<SpeakStatus, "ok">, transcript: string | null = null): SpeakResult {
    return { order: null, status, transcript };
}

/** Only the JSON shape: the model's output stays untrusted until `normalizeDraft`. */
export const ModelOutput = Schema.Struct({
    accountName: Schema.NullOr(Schema.String),
    amount: Schema.NullOr(Schema.Finite),
    categoryName: Schema.NullOr(Schema.String),
    currency: Schema.NullOr(Schema.String),
    date: Schema.NullOr(Schema.String),
    details: Schema.NullOr(Schema.String),
    domain: Schema.NullOr(Schema.String),
    found: Schema.Boolean,
    kind: Schema.Literals(["expense", "income", "transfer"]),
    merchant: Schema.NullOr(Schema.String),
    // Optional: a required field the model skips would fail the whole tool call.
    quotes: Schema.optionalKey(
        Schema.Array(Schema.Struct({ field: Schema.Literals(QUOTE_FIELDS), text: Schema.String }))
    ),
    recurrence: Schema.NullOr(
        Schema.Struct({ every: Schema.Finite, unit: Schema.Literals(["day", "week", "month", "year"]) })
    ),
    toAccountName: Schema.NullOr(Schema.String),
});

export type ModelOutput = typeof ModelOutput.Type;

const modelOutputSchema = modelSchema(ModelOutput);

// Unsharded, a global counter is one hot document that throws OCC write conflicts under concurrency.
export const rateLimiter = new RateLimiter(components.rateLimiter, {
    voiceEntryGlobal: {
        kind: "fixed window",
        period: HOUR,
        rate: 1000,
        shards: 10,
    },
    voiceThreadGlobal: {
        kind: "fixed window",
        period: HOUR,
        rate: 2000,
        shards: 10,
    },
});

function weekdayOf(isoDate: string): string {
    const parsed = new Date(`${isoDate}T12:00:00Z`);
    return Number.isNaN(parsed.getTime())
        ? ""
        : new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "long" }).format(parsed);
}

export function buildPrompt(args: LedgerContext): string {
    const weekday = weekdayOf(args.today);
    return [
        'A person speaks entries for their expense tracker, one sentence at a time. Each sentence is either a new transaction or a correction to the draft you proposed just before it ("no, that was yesterday", "make it groceries", "it was fifty, not fifteen").',
        `Always answer by calling ${PROPOSE_DRAFT_TOOL} exactly once, with the complete draft: for a correction, re-issue the previous draft with only the corrected fields changed.`,
        `Today is ${args.today}${weekday ? ` (${weekday})` : ""}. Resolve relative dates ("yesterday", "last Friday", "this morning") against it and answer as YYYY-MM-DD; with no date mentioned, answer today.`,
        `The ledger's currency is ${args.currency}. Set currency only when a different one is said outright (as a code, a name or a symbol); otherwise null.`,
        "amount is the number of major units spoken, always positive.",
        'kind is "income" only for money received (salary, a refund, a payment from someone); "transfer" when the money moved between two of their own accounts ("moved 500 from Checking to Savings", "paid the Amex from Checking"); everything else is "expense".',
        "merchant is the place or person the money went to or came from, in its own spelling, 1–4 words, never the amount or the date. With none said, use a two- or three-word description of the purchase. For a transfer, merchant is null.",
        "details is anything else worth keeping (what was bought, who it was for); null when the merchant already says it all.",
        'domain is the merchant\'s primary web domain, a bare hostname ("carrefour.es", "mercadona.es", "netflix.com"), only when you know it with confidence for that merchant in the person\'s region; otherwise null. Never for a transfer or a person.',
        'recurrence is set only when the words say the charge repeats ("every month", "monthly", "a subscription", "weekly", "every two weeks"): the unit and how many units apart, e.g. {"every": 1, "unit": "month"}; otherwise null. A transfer has no recurrence.',
        `The person's categories, with any nested under them, are: ${describeTree(args.categoryTree)}. Pick the one that fits best and answer its name verbatim, or null when none fits. Never invent a category name. A transfer has no category.`,
        args.accounts.length > 0
            ? `Their accounts are: ${args.accounts.join(", ")}. Set accountName verbatim when one is said or clearly implied ("on the Amex"); otherwise null. For a transfer, accountName is the account the money left and toAccountName the one it reached; toAccountName is null for the other kinds.`
            : "They have no accounts; accountName and toAccountName are null.",
        "found is false when the words carry no amount and correct nothing (a greeting, a question, noise); then every other field may be null.",
        'quotes lists, for each field the latest sentence actually says, the words it was read from, copied character for character from that sentence, e.g. {"field": "amount", "text": "doce cincuenta"}. Leave out fields the sentence does not say, including ones a correction carries over.',
        args.language ? `The speaker's language is ${args.language}.` : "",
    ]
        .filter((line) => line.length > 0)
        .join(" ");
}

function normalizeRecurrence(candidate: ModelOutput["recurrence"]): VoiceRecurrence | null {
    if (candidate === null || !Number.isFinite(candidate.every)) {
        return null;
    }
    return { every: Math.min(MAX_RECURRENCE_EVERY, Math.max(1, Math.round(candidate.every))), unit: candidate.unit };
}

export function normalizeDraft(output: ModelOutput, args: LedgerContext): VoiceDraft | null {
    const { amount } = output;
    if (!(output.found && amount != null && Number.isFinite(amount) && amount > 0 && amount <= MAX_AMOUNT)) {
        return null;
    }
    const knownCategories = args.categoryTree.flatMap((branch) => [branch.name, ...branch.children]);
    const spokenCurrency = output.currency?.trim().toUpperCase() ?? null;
    const currency =
        spokenCurrency != null && CURRENCY_PATTERN.test(spokenCurrency) && spokenCurrency !== args.currency
            ? spokenCurrency
            : null;
    const base = {
        amount,
        currency,
        date: clampDate(output.date, args.today, MAX_PAST_DAYS, MAX_FUTURE_DAYS),
        details: trimTo(output.details, MAX_DETAILS_LENGTH),
    };
    if (output.kind === "transfer") {
        return {
            ...base,
            fromAccountName:
                pickKnown(output.accountName, args.accounts) ?? trimTo(output.accountName, MAX_NAME_LENGTH),
            kind: "transfer",
            toAccountName:
                pickKnown(output.toAccountName, args.accounts) ?? trimTo(output.toAccountName, MAX_NAME_LENGTH),
        };
    }
    return {
        ...base,
        // An unknown account comes back as spoken, so the client can tell "none named" from "named but unplaced".
        accountName: pickKnown(output.accountName, args.accounts) ?? trimTo(output.accountName, MAX_NAME_LENGTH),
        categoryName: pickKnown(output.categoryName, knownCategories),
        domain: normalizeDomain(output.domain),
        income: output.kind === "income",
        kind: "entry",
        merchant: trimTo(output.merchant, MAX_MERCHANT_LENGTH) ?? "",
        recurrence: normalizeRecurrence(output.recurrence),
    };
}

export function normalizeQuotes(quotes: ModelOutput["quotes"], sentence: string): VoiceQuote[] {
    const folded = sentence.toLowerCase();
    return (quotes ?? [])
        .map((quote) => ({ field: quote.field, text: quote.text.trim() }))
        .filter(
            (quote) =>
                quote.text.length > 0 &&
                quote.text.length <= MAX_QUOTE_LENGTH &&
                folded.includes(quote.text.toLowerCase())
        )
        .slice(0, MAX_QUOTES);
}

export function voiceAgent(model: AgentModel, context: LedgerContext, sentence: string) {
    const proposeDraft = createTool({
        description: "Propose the transaction the person just described, or the corrected version of the last draft.",
        execute: (_ctx, input): Promise<ProposedDraft> => {
            const draft = normalizeDraft(input, context);
            return Promise.resolve({ draft, quotes: draft === null ? [] : normalizeQuotes(input.quotes, sentence) });
        },
        inputSchema: modelOutputSchema,
    });
    return new Agent(components.agent, {
        languageModel: model,
        name: "voice-entry",
        stopWhen: stepCountIs(1),
        tools: { [PROPOSE_DRAFT_TOOL]: proposeDraft },
    });
}

export const transcribeClip = Effect.fn("VoiceEntry.transcribeClip")(
    function* transcribeClip(model: TranscriptionModel, audio: ArrayBuffer, language: string | undefined) {
        const result = yield* Effect.tryPromise({
            catch: modelCallError,
            try: () =>
                transcribe({
                    abortSignal: AbortSignal.timeout(TRANSCRIBE_TIMEOUT_MS),
                    audio: new Uint8Array(audio),
                    maxRetries: 0,
                    model,
                    providerOptions: {
                        elevenlabs: {
                            diarize: false,
                            languageCode: language?.split("-")[0],
                            tagAudioEvents: false,
                            timestampsGranularity: "none",
                        },
                    },
                }),
        });
        const text = result.text.trim();
        const heard: Heard = text.length === 0 ? { error: "empty" } : { text };
        return heard;
    },
    Effect.catchTags({
        ModelCallError: ({ reason }): Effect.Effect<Heard> =>
            Effect.succeed({ error: reason === "noTranscript" ? "empty" : "provider" }),
    })
);

// Compared on `tokenIdentifier`, not the bare `subject`: two issuers can hand out the same subject.
export async function ownsThread(ctx: QueryCtx | MutationCtx | ActionCtx, threadId: string): Promise<string | null> {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
        return null;
    }
    const thread = await getThreadMetadata(ctx, components.agent, { threadId }).catch(() => null);
    return thread?.userId === identity.tokenIdentifier ? identity.tokenIdentifier : null;
}

// Another person's thread reads as empty, so a stale id after sign-out cannot leak their sentences.
export const listTurns = query({
    args: {
        paginationOpts: paginationOptsValidator,
        streamArgs: vStreamArgs,
        threadId: v.string(),
    },
    handler: async (ctx, args) => {
        if ((await ownsThread(ctx, args.threadId)) === null) {
            return { continueCursor: "", isDone: true, page: [], streams: undefined };
        }
        const paginated = await listUIMessages(ctx, components.agent, args);
        const streams = await syncStreams(ctx, components.agent, args);
        return { ...paginated, streams };
    },
});
