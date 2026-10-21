// oxlint-disable unicorn/filename-case -- the Convex module name is the function path: clients call these as api.voiceEntry.*

import { createAnthropic } from "@ai-sdk/anthropic";
import { createElevenLabs } from "@ai-sdk/elevenlabs";
import {
    Agent,
    createThread,
    createTool,
    getThreadMetadata,
    listUIMessages,
    saveMessage,
    stepCountIs,
    syncStreams,
    vStreamArgs,
} from "@convex-dev/agent";
import { HOUR, isRateLimitError, RateLimiter } from "@convex-dev/rate-limiter";
import { NoTranscriptGeneratedError, transcribe } from "ai";
import type { LanguageModel, TranscriptionModel } from "ai";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Infer } from "convex/values";
import { z } from "zod";

import { components, internal } from "./_generated/api";
import { action, internalMutation, mutation, query } from "./_generated/server";
import type { ActionCtx, MutationCtx, QueryCtx } from "./_generated/server";
import { admitCapture } from "./lib/captures";
import {
    clampDate,
    CURRENCY_PATTERN,
    DATE_PATTERN,
    describeTree,
    LANGUAGE_PATTERN,
    MAX_NAME_LENGTH,
    namesWithinBudget,
    normalizeDomain,
    pickKnown,
    trimTo,
} from "./lib/ledgerPrompt";
import type { LedgerContext } from "./lib/ledgerPrompt";
import { perUserBurst } from "./lib/limits";
import { AI_CONSENT_VERSION, CLAUDE_MODEL_ID, ELEVENLABS_TRANSCRIPTION_MODEL_ID } from "./lib/models";
import { isPro } from "./revenuecat";

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
const PARSE_TIMEOUT_MS = 10_000;
const CONTEXT_TURNS = 12;
// The privacy backstop for a thread whose `endThread` never ran, measured from its last turn rather than its opening.
const THREAD_TTL_MS = 60 * 60 * 1000;

export const PROPOSE_DRAFT_TOOL = "proposeDraft";

/** `ai` still admits older model specs in `LanguageModel`; the agent takes the current one only. */
type AgentModel = Extract<LanguageModel, { specificationVersion: "v4" }>;

// A privacy boundary: the clip plus only what the model needs in this ledger's terms. No ids, balances or history.
export const voiceEntryArgs = {
    accounts: v.array(v.string()),
    aiConsent: v.optional(v.number()),
    /** AAC in an MP4 container, as the client records it. */
    audio: v.bytes(),
    categoryTree: v.array(v.object({ children: v.array(v.string()), name: v.string() })),
    currency: v.string(),
    language: v.optional(v.string()),
    threadId: v.string(),
    /** `YYYY-MM-DD` in the device's local calendar. */
    today: v.string(),
};

const speakStatus = v.union(
    v.literal("ok"),
    v.literal("unauthenticated"),
    v.literal("notConfigured"),
    v.literal("rateLimited"),
    v.literal("notEntitled"),
    v.literal("quotaExceeded"),
    v.literal("invalid"),
    v.literal("providerError"),
    /** No words heard; nothing was written to the thread. */
    v.literal("unclear")
);

const speakResult = v.object({
    /** The turn the transcript landed on; the draft answers at the same order. */
    order: v.union(v.number(), v.null()),
    status: speakStatus,
    transcript: v.union(v.string(), v.null()),
});

export type SpeakStatus = Infer<typeof speakStatus>;

export interface SpeakResult {
    order: number | null;
    status: SpeakStatus;
    transcript: string | null;
}

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

function failure(status: Exclude<SpeakStatus, "ok">, transcript: string | null = null): SpeakResult {
    return { order: null, status, transcript };
}

/** Only the JSON shape: the model's output stays untrusted until `normalizeDraft`. */
export const modelOutputSchema = z.object({
    accountName: z.string().nullable(),
    amount: z.number().nullable(),
    categoryName: z.string().nullable(),
    currency: z.string().nullable(),
    date: z.string().nullable(),
    details: z.string().nullable(),
    domain: z.string().nullable(),
    found: z.boolean(),
    kind: z.enum(["expense", "income", "transfer"]),
    merchant: z.string().nullable(),
    // Optional: a required field the model skips would fail the whole tool call.
    quotes: z.array(z.object({ field: z.enum(QUOTE_FIELDS), text: z.string() })).optional(),
    recurrence: z.object({ every: z.number(), unit: z.enum(["day", "week", "month", "year"]) }).nullable(),
    toAccountName: z.string().nullable(),
});

export type ModelOutput = z.infer<typeof modelOutputSchema>;

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

function voiceAgent(model: AgentModel, context: LedgerContext, sentence: string) {
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

export async function transcribeClip(
    model: TranscriptionModel,
    audio: ArrayBuffer,
    language: string | undefined
): Promise<{ text: string } | { error: "empty" | "provider" }> {
    try {
        const result = await transcribe({
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
        });
        const text = result.text.trim();
        return text.length === 0 ? { error: "empty" } : { text };
    } catch (error) {
        if (NoTranscriptGeneratedError.isInstance(error)) {
            return { error: "empty" };
        }
        return { error: "provider" };
    }
}

// Compared on `tokenIdentifier`, not the bare `subject`: two issuers can hand out the same subject.
async function ownsThread(ctx: QueryCtx | MutationCtx | ActionCtx, threadId: string): Promise<string | null> {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
        return null;
    }
    const thread = await getThreadMetadata(ctx, components.agent, { threadId }).catch(() => null);
    return thread?.userId === identity.tokenIdentifier ? identity.tokenIdentifier : null;
}

const startThreadResult = v.object({
    status: v.union(v.literal("ok"), v.literal("unauthenticated"), v.literal("rateLimited")),
    threadId: v.union(v.string(), v.null()),
});

export interface StartThreadResult {
    status: "ok" | "unauthenticated" | "rateLimited";
    threadId: string | null;
}

export const startThread = mutation({
    args: {},
    handler: async (ctx): Promise<StartThreadResult> => {
        const identity = await ctx.auth.getUserIdentity();
        if (identity === null) {
            return { status: "unauthenticated", threadId: null };
        }
        const perUser = await rateLimiter.limit(ctx, "voiceThreadPerUser", {
            config: perUserBurst("voiceThread", await isPro(ctx, identity.subject)),
            key: identity.tokenIdentifier,
        });
        if (!perUser.ok) {
            return { status: "rateLimited", threadId: null };
        }
        const global = await rateLimiter.limit(ctx, "voiceThreadGlobal");
        if (!global.ok) {
            return { status: "rateLimited", threadId: null };
        }
        const threadId = await createThread(ctx, components.agent, {
            title: "Voice entry",
            userId: identity.tokenIdentifier,
        });
        await ctx.scheduler.runAfter(THREAD_TTL_MS, internal.voiceEntry.expireThread, { threadId });
        return { status: "ok", threadId };
    },
    returns: startThreadResult,
});

export const expireThread = internalMutation({
    args: { threadId: v.string() },
    handler: async (ctx, { threadId }) => {
        const thread = await getThreadMetadata(ctx, components.agent, { threadId }).catch(() => null);
        if (thread === null) {
            return;
        }
        const latest = await ctx.runQuery(components.agent.messages.listMessagesByThreadId, {
            order: "desc",
            paginationOpts: { cursor: null, numItems: 1 },
            threadId,
        });
        const idleFor = Date.now() - (latest.page[0]?._creationTime ?? thread._creationTime);
        if (idleFor < THREAD_TTL_MS) {
            await ctx.scheduler.runAfter(THREAD_TTL_MS - idleFor, internal.voiceEntry.expireThread, { threadId });
            return;
        }
        await ctx.runMutation(components.agent.threads.deleteAllForThreadIdAsync, { threadId });
    },
    returns: v.null(),
});

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

export const endThread = mutation({
    args: { threadId: v.string() },
    handler: async (ctx, { threadId }) => {
        if ((await ownsThread(ctx, threadId)) === null) {
            return;
        }
        await ctx.runMutation(components.agent.threads.deleteAllForThreadIdAsync, { threadId });
    },
    returns: v.null(),
});

export const admit = internalMutation({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (identity === null) {
            return "notEntitled" as const;
        }
        return admitCapture(ctx, identity, () => rateLimiter.limit(ctx, "voiceEntryGlobal"));
    },
});

export const speak = action({
    args: voiceEntryArgs,
    handler: async (ctx, args): Promise<SpeakResult> => {
        const identity = await ctx.auth.getUserIdentity();
        if (identity === null) {
            return failure("unauthenticated");
        }

        // Read per call, so clearing a key with `npx convex env set` takes effect on the next clip.
        const apiKey = process.env.ANTHROPIC_API_KEY;
        const transcriptionKey = process.env.ELEVENLABS_API_KEY;
        if (!apiKey || !transcriptionKey || args.aiConsent !== AI_CONSENT_VERSION) {
            return failure("notConfigured");
        }

        if (
            args.audio.byteLength === 0 ||
            args.audio.byteLength > MAX_AUDIO_BYTES ||
            !namesWithinBudget(args.categoryTree, args.accounts) ||
            !DATE_PATTERN.test(args.today) ||
            !CURRENCY_PATTERN.test(args.currency) ||
            (args.language !== undefined && !LANGUAGE_PATTERN.test(args.language))
        ) {
            return failure("invalid");
        }

        const userId = await ownsThread(ctx, args.threadId);
        if (userId === null) {
            return failure("invalid");
        }

        const perUser = await rateLimiter.limit(ctx, "voiceEntryPerUser", {
            config: perUserBurst("voiceEntry", await isPro(ctx, identity.subject)),
            key: identity.tokenIdentifier,
        });
        if (!perUser.ok) {
            return failure("rateLimited");
        }

        const admitted = await ctx.runMutation(internal.voiceEntry.admit, {}).catch((error) => {
            if (isRateLimitError(error)) {
                return "rateLimited" as const;
            }
            throw error;
        });
        if (admitted !== "ok") {
            return failure(admitted);
        }

        const heard = await transcribeClip(
            createElevenLabs({ apiKey: transcriptionKey }).transcription(ELEVENLABS_TRANSCRIPTION_MODEL_ID),
            args.audio,
            args.language
        );
        if ("error" in heard) {
            return failure(heard.error === "empty" ? "unclear" : "providerError");
        }

        const context: LedgerContext = {
            accounts: args.accounts,
            categoryTree: args.categoryTree,
            currency: args.currency,
            language: args.language,
            today: args.today,
        };
        const modelId = process.env.CLAUDE_MODEL_ID || CLAUDE_MODEL_ID;
        const agent = voiceAgent(createAnthropic({ apiKey })(modelId), context, heard.text);
        const { message, messageId } = await saveMessage(ctx, components.agent, {
            prompt: heard.text,
            threadId: args.threadId,
            userId,
        });
        try {
            const result = await agent.streamText(
                ctx,
                { threadId: args.threadId, userId },
                {
                    abortSignal: AbortSignal.timeout(PARSE_TIMEOUT_MS),
                    maxRetries: 0,
                    promptMessageId: messageId,
                    reasoning: "low",
                    system: buildPrompt(context),
                },
                {
                    contextOptions: { recentMessages: CONTEXT_TURNS * 2 },
                    saveStreamDeltas: true,
                }
            );
            await result.consumeStream();
        } catch {
            return failure("providerError", heard.text);
        }
        return { order: message.order, status: "ok", transcript: heard.text };
    },
    returns: speakResult,
});
