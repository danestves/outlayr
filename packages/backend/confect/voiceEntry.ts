import { HOUR, RateLimiter } from "@convex-dev/rate-limiter";
import { transcribe } from "@outlayr/ai/speech";
import type { SpeechModel } from "@outlayr/ai/speech";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Infer, ObjectType } from "convex/values";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import { components, internal } from "../convex/_generated/api";
import type { Doc, Id } from "../convex/_generated/dataModel";
import { query } from "../convex/_generated/server";
import type { ActionCtx, MutationCtx, QueryCtx } from "../convex/_generated/server";
import { liveIdentity } from "./lib/auth";
import { categoryChoiceLines, placeCategory } from "./lib/categoryChoice";
import { clampDate, draftCurrency, MAX_NAME_LENGTH, normalizeDomain, pickKnown, trimTo } from "./lib/ledgerPrompt";
import type { LedgerContext } from "./lib/ledgerPrompt";
import { runTransactionEdge } from "./lib/runEdge";
import { MAX_AMOUNT } from "./lib/sanitizeLimits";
import { QUOTE_FIELDS, RecurrenceUnit } from "./lib/voiceDraft";
import type { ProposedDraft, VoiceDraft, VoiceQuote, VoiceRecurrence } from "./lib/voiceDraft";
import type { SpeakResult, SpeakStatus } from "./voiceEntry.spec";

const MAX_MERCHANT_LENGTH = 80;
const MAX_DETAILS_LENGTH = 200;
const MAX_PAST_DAYS = 366;
const MAX_RECURRENCE_EVERY = 99;
const MAX_QUOTE_LENGTH = 60;
const MAX_QUOTES = 8;
const MAX_FUTURE_DAYS = 1;
// Both calls run in sequence inside the client's 25s abort.
const TRANSCRIBE_TIMEOUT_MS = 10_000;
export const PARSE_TIMEOUT_MS = 10_000;
export const CONTEXT_TURNS = 12;
// The privacy backstop for a thread whose `endThread` never ran, measured from its last turn rather than its opening.
export const THREAD_TTL_MS = 60 * 60 * 1000;
export const ENDED_THREAD_GRACE_MS = TRANSCRIBE_TIMEOUT_MS + PARSE_TIMEOUT_MS + 5000;

// Each is a counted capture awaiting its transcript, so this also bounds what one thread can bank.
export const MAX_STREAM_CREDITS = 20;

export const PROPOSE_DRAFT_TOOL = "proposeDraft";

type Heard = { text: string } | { error: "empty" | "provider" };

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
    // Optional: a required field the model skips would fail the whole answer.
    parentCategoryName: Schema.optionalKey(Schema.NullOr(Schema.String)),
    quotes: Schema.optionalKey(
        Schema.Array(Schema.Struct({ field: Schema.Literals(QUOTE_FIELDS), text: Schema.String }))
    ),
    recurrence: Schema.NullOr(Schema.Struct({ every: Schema.Finite, unit: RecurrenceUnit })),
    toAccountName: Schema.NullOr(Schema.String),
});

export type ModelOutput = typeof ModelOutput.Type;

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
        "Always answer with the complete draft for the latest sentence: for a correction, re-issue the previous draft with only the corrected fields changed.",
        `Today is ${args.today}${weekday ? ` (${weekday})` : ""}. Resolve relative dates ("yesterday", "last Friday", "this morning") against it and answer as YYYY-MM-DD; with no date mentioned, answer today.`,
        `The ledger's currency is ${args.currency}. Set currency only when a different one is said outright (as a code, a name or a symbol); otherwise null.`,
        "amount is the number of major units spoken, always positive.",
        'kind is "income" only for money received (salary, a refund, a payment from someone); "transfer" when the money moved between two of their own accounts ("moved 500 from Checking to Savings", "paid the Amex from Checking"); everything else is "expense".',
        "merchant is the place or person the money went to or came from, in its own spelling, 1–4 words, never the amount or the date. With none said, use a two- or three-word description of the purchase. For a transfer, merchant is null.",
        "details is anything else worth keeping (what was bought, who it was for); null when the merchant already says it all.",
        'domain is the merchant\'s primary web domain, a bare hostname ("carrefour.es", "mercadona.es", "netflix.com"), only when you know it with confidence for that merchant in the person\'s region; otherwise null. Never for a transfer or a person.',
        'recurrence is set only when the words say the charge repeats ("every month", "monthly", "a subscription", "weekly", "every two weeks"): the unit and how many units apart, e.g. {"every": 1, "unit": "month"}; otherwise null. A transfer has no recurrence.',
        ...categoryChoiceLines(args.categoryTree),
        "A transfer has no category.",
        args.accounts.length > 0
            ? `Their accounts are: ${args.accounts.join(", ")}. Set accountName verbatim when one is said or clearly implied ("on the Amex"); otherwise null. For a transfer, accountName is the account the money left and toAccountName the one it reached; toAccountName is null for the other kinds.`
            : "They have no accounts; accountName and toAccountName are null.",
        "found is false when the words carry no amount and correct nothing (a greeting, a question, noise); then every other field may be null.",
        'quotes lists, for each field the latest sentence actually says, the words it was read from, copied character for character from that sentence, e.g. {"field": "amount", "text": "doce cincuenta"}. Leave out fields the sentence does not say, including ones a correction carries over.',
        args.language ? `The app is in ${args.language}; they may speak another language.` : "",
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
    const { currency } = draftCurrency(output.currency, args.currency);
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
                pickKnown(output.accountName, args.accounts, { loose: true }) ??
                trimTo(output.accountName, MAX_NAME_LENGTH),
            kind: "transfer",
            toAccountName:
                pickKnown(output.toAccountName, args.accounts, { loose: true }) ??
                trimTo(output.toAccountName, MAX_NAME_LENGTH),
        };
    }
    const placed = placeCategory(args.categoryTree, {
        categoryName: output.categoryName,
        parentCategoryName: output.parentCategoryName,
    });
    return {
        ...base,
        // An unknown account comes back as spoken, so the client can tell "none named" from "named but unplaced".
        accountName:
            pickKnown(output.accountName, args.accounts, { loose: true }) ??
            trimTo(output.accountName, MAX_NAME_LENGTH),
        categoryName: placed.categoryName,
        domain: normalizeDomain(output.domain),
        income: output.kind === "income",
        kind: "entry",
        merchant: trimTo(output.merchant, MAX_MERCHANT_LENGTH) ?? "",
        parentCategoryName: placed.parentCategoryName,
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

export function proposeDraft(output: ModelOutput, context: LedgerContext, sentence: string): ProposedDraft {
    const draft = normalizeDraft(output, context);
    return { draft, quotes: draft === null ? [] : normalizeQuotes(output.quotes, sentence) };
}

export function turnMessages(history: readonly { readonly reply: string; readonly said: string }[], sentence: string) {
    return [
        ...history.flatMap((turn) => [
            { content: turn.said, role: "user" as const },
            { content: turn.reply, role: "assistant" as const },
        ]),
        { content: sentence, role: "user" as const },
    ];
}

export const transcribeClip = Effect.fn("VoiceEntry.transcribeClip")(
    function* transcribeClip(model: SpeechModel, audio: ArrayBuffer, language: string | undefined) {
        const text = yield* transcribe(model, new File([audio], "clip.m4a", { type: "audio/mp4" }), {
            language,
            timeout: Duration.millis(TRANSCRIBE_TIMEOUT_MS),
        });
        const heard: Heard = { text };
        return heard;
    },
    Effect.catchTags({
        ModelCallError: ({ reason }): Effect.Effect<Heard> =>
            Effect.succeed({ error: reason === "noTranscript" ? "empty" : "provider" }),
    })
);

const threadIn = (db: QueryCtx["db"], threadId: string) =>
    Effect.promise(async () => {
        const id = db.normalizeId("voiceThreads", threadId);
        return id === null ? null : await db.get(id);
    });

export const threadOwner = Effect.fn("VoiceEntry.threadOwner")(function* threadOwner(
    db: QueryCtx["db"],
    threadId: string
) {
    return (yield* threadIn(db, threadId))?.userId ?? null;
});

// Compared on `tokenIdentifier`, not the bare `subject`: two issuers can hand out the same subject.
export const ownsThread = Effect.fn("VoiceEntry.ownsThread")(function* ownsThread(
    ctx: QueryCtx | MutationCtx | ActionCtx,
    threadId: string
) {
    const identity = yield* liveIdentity(ctx);
    if (identity === null) {
        return null;
    }
    const owner =
        "db" in ctx
            ? yield* threadOwner(ctx.db, threadId)
            : yield* Effect.promise((): Promise<string | null> =>
                  ctx.runQuery(internal.voiceEntry.threadOwner, { threadId })
              );
    return owner === identity.tokenIdentifier ? owner : null;
});

const latestTurns = (db: QueryCtx["db"], threadId: Id<"voiceThreads">, count: number) =>
    Effect.promise(() =>
        db
            .query("voiceTurns")
            .withIndex("by_threadId_and_order", (q) => q.eq("threadId", threadId))
            .order("desc")
            .take(count)
    ).pipe(Effect.map((turns) => turns.toReversed()));

export const beginTurn = Effect.fn("VoiceEntry.beginTurn")(function* beginTurn(
    ctx: MutationCtx,
    turn: { readonly said: string; readonly threadId: string }
) {
    const thread = yield* threadIn(ctx.db, turn.threadId);
    if (thread === null) {
        return null;
    }
    const recent = yield* latestTurns(ctx.db, thread._id, CONTEXT_TURNS);
    const order = (recent.at(-1)?.order ?? -1) + 1;
    const turnId = yield* Effect.promise(() =>
        ctx.db.insert("voiceTurns", { order, said: turn.said, threadId: thread._id })
    );
    const history = recent.flatMap(({ reply, said }) => (reply === undefined ? [] : [{ reply, said }]));
    return { history, order, turnId };
});

export const clearStreamCredits = Effect.fn("VoiceEntry.clearStreamCredits")(function* clearStreamCredits(
    db: MutationCtx["db"],
    threadId: string
) {
    const credits = yield* Effect.promise(() =>
        db
            .query("voiceStreamCredits")
            .withIndex("by_threadId", (q) => q.eq("threadId", threadId))
            .take(MAX_STREAM_CREDITS)
    );
    for (const credit of credits) {
        yield* Effect.promise(() => db.delete(credit._id));
    }
});

export const DELETE_BATCH = 200;

export const deleteThreadBatch = Effect.fn("VoiceEntry.deleteThreadBatch")(function* deleteThreadBatch(
    db: MutationCtx["db"],
    threadId: Id<"voiceThreads">
) {
    const turns = yield* Effect.promise(() =>
        db
            .query("voiceTurns")
            .withIndex("by_threadId_and_order", (q) => q.eq("threadId", threadId))
            .take(DELETE_BATCH)
    );
    for (const turn of turns) {
        yield* Effect.promise(() => db.delete(turn._id));
    }
    if (turns.length === DELETE_BATCH) {
        return false;
    }
    yield* Effect.promise(() => db.delete(threadId));
    yield* clearStreamCredits(db, threadId);
    return true;
});

export const TURNS_SHOWN = 40;

export const readTurns = Effect.fn("VoiceEntry.readTurns")(function* readTurns(ctx: QueryCtx, threadId: string) {
    const thread = yield* threadIn(ctx.db, threadId);
    if (thread === null || (yield* ownsThread(ctx, threadId)) === null) {
        return [];
    }
    const turns = yield* latestTurns(ctx.db, thread._id, TURNS_SHOWN);
    return turns.map(({ order, proposed, said }) => ({ order, proposed: proposed ?? null, said }));
});

export function uiMessagesOf(turn: Doc<"voiceTurns">) {
    const said = {
        _creationTime: turn._creationTime,
        id: `${turn._id}-said`,
        key: `${turn.threadId}-${turn.order}-0`,
        order: turn.order,
        parts: [{ state: "done" as const, text: turn.said, type: "text" as const }],
        role: "user" as const,
        status: "success" as const,
        stepOrder: 0,
        text: turn.said,
    };
    if (turn.proposed === undefined) {
        return [said];
    }
    const answer = {
        _creationTime: turn._creationTime,
        id: `${turn._id}-answer`,
        key: `${turn.threadId}-${turn.order}-1`,
        order: turn.order,
        parts: [
            {
                output: turn.proposed,
                state: "output-available" as const,
                toolCallId: turn._id,
                type: `tool-${PROPOSE_DRAFT_TOOL}` as const,
            },
        ],
        role: "assistant" as const,
        status: "success" as const,
        stepOrder: 1,
        text: "",
    };
    return [said, answer];
}

const streamArgs = v.optional(
    v.union(
        v.object({ kind: v.literal("list"), startOrder: v.optional(v.number()) }),
        v.object({
            cursors: v.array(v.object({ cursor: v.number(), streamId: v.string() })),
            kind: v.literal("deltas"),
        })
    )
);

export function noStreams(args: Infer<typeof streamArgs>) {
    if (args === undefined) {
        return undefined;
    }
    return args.kind === "list" ? { kind: "list" as const, messages: [] } : { deltas: [], kind: "deltas" as const };
}

const listTurnsArgs = {
    paginationOpts: paginationOptsValidator,
    streamArgs,
    threadId: v.string(),
};

const readUiTurns = Effect.fn("VoiceEntry.listTurns")(function* readUiTurns(
    ctx: QueryCtx,
    args: ObjectType<typeof listTurnsArgs>
) {
    const streams = noStreams(args.streamArgs);
    if (args.paginationOpts.numItems === 0) {
        return { continueCursor: "", isDone: true, page: [], streams };
    }
    const thread = yield* threadIn(ctx.db, args.threadId);
    if (thread === null || (yield* ownsThread(ctx, args.threadId)) === null) {
        return { continueCursor: "", isDone: true, page: [], streams };
    }
    const turns = yield* Effect.promise(() =>
        ctx.db
            .query("voiceTurns")
            .withIndex("by_threadId_and_order", (q) => q.eq("threadId", thread._id))
            .order("desc")
            .paginate(args.paginationOpts)
    );
    return { ...turns, page: turns.page.flatMap(uiMessagesOf), streams };
});

// Another person's thread reads as empty, so a stale id after sign-out cannot leak their sentences.
export const listTurns = query({
    args: listTurnsArgs,
    handler: (ctx, args) => runTransactionEdge(readUiTurns(ctx, args)),
});
