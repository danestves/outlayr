import { createElevenLabs } from "@ai-sdk/elevenlabs";
import { FunctionImpl, GroupImpl } from "@confect/server";
import { createThread, getThreadMetadata, saveMessage } from "@convex-dev/agent";
import type { UserIdentity } from "convex/server";
import * as Clock from "effect/Clock";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";

import { components } from "../convex/_generated/api";
import refs from "./_generated/refs";
import databaseSchema from "./_generated/schema";
import {
    ActionCtx,
    DatabaseReader,
    DatabaseWriter,
    MutationCtx,
    MutationRunner,
    Scheduler,
} from "./_generated/services";
import { openAiGate, refuse } from "./lib/aiGate";
import { liveIdentity } from "./lib/auth";
import { admitCapture, withinCaptureAllowance } from "./lib/captures";
import { claudeModelId, elevenLabsApiKey } from "./lib/config";
import type { LedgerContext } from "./lib/ledgerPrompt";
import { fixedBurst } from "./lib/limits";
import { modelCallError } from "./lib/modelCall";
import { ELEVENLABS_TRANSCRIPTION_MODEL_ID } from "./lib/models";
import { isPro } from "./revenuecat";
import {
    buildPrompt,
    CONTEXT_TURNS,
    failure,
    listTurns,
    MAX_STREAM_CREDITS,
    ownsThread,
    PARSE_TIMEOUT_MS,
    rateLimiter,
    THREAD_TTL_MS,
    transcribeClip,
    voiceAgent,
} from "./voiceEntry";
import spec, { SpeakTextInput, VoiceEntryInput } from "./voiceEntry.spec";

const isVoiceEntryInput = Schema.is(VoiceEntryInput);
const isSpeakTextInput = Schema.is(SpeakTextInput);

const SCRIBE_TOKEN_URL = "https://api.elevenlabs.io/v1/single-use-token/realtime_scribe";
const SCRIBE_TOKEN_TIMEOUT_MS = 5000;
const decodeScribeToken = Schema.decodeUnknownEffect(Schema.Struct({ token: Schema.String }));

const clearStreamCredits = Effect.fn("VoiceEntry.clearStreamCredits")(function* clearStreamCredits(threadId: string) {
    const reader = yield* DatabaseReader;
    const writer = yield* DatabaseWriter;
    const credits = yield* reader
        .table("voiceStreamCredits")
        .index("by_threadId", (q) => q.eq("threadId", threadId))
        .take(MAX_STREAM_CREDITS);
    for (const credit of credits) {
        yield* writer.table("voiceStreamCredits").delete(credit._id);
    }
});

const requestScribeToken = Effect.fn("VoiceEntry.requestScribeToken")(function* requestScribeToken(apiKey: string) {
    const body = yield* Effect.tryPromise({
        catch: modelCallError,
        try: async () => {
            const response = await fetch(SCRIBE_TOKEN_URL, {
                headers: { "xi-api-key": apiKey },
                method: "POST",
                signal: AbortSignal.timeout(SCRIBE_TOKEN_TIMEOUT_MS),
            });
            if (!response.ok) {
                throw new Error(`ElevenLabs token request failed with ${response.status}`);
            }
            return await response.json();
        },
    });
    return yield* decodeScribeToken(body).pipe(Effect.map(({ token }) => token));
});

const ledgerContext = (args: Pick<LedgerContext, "accounts" | "categoryTree" | "currency" | "language" | "today">) =>
    ({
        accounts: args.accounts,
        categoryTree: args.categoryTree,
        currency: args.currency,
        language: args.language,
        today: args.today,
    }) satisfies LedgerContext;

const parseTurn = Effect.fn("VoiceEntry.parseTurn")(function* parseTurn(
    ctx: ActionCtx,
    turn: {
        readonly context: LedgerContext;
        readonly model: Parameters<typeof voiceAgent>[0];
        readonly text: string;
        readonly threadId: string;
        readonly userId: string;
    }
) {
    const { context, model, text, threadId, userId } = turn;
    const agent = voiceAgent(model, context, text);
    const { message, messageId } = yield* Effect.promise(() =>
        saveMessage(ctx, components.agent, { prompt: text, threadId, userId })
    );
    const parsed = yield* Effect.tryPromise({
        catch: modelCallError,
        try: async () => {
            const result = await agent.streamText(
                ctx,
                { threadId, userId },
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
        },
    }).pipe(Effect.as(true), Effect.catchTags({ ModelCallError: () => Effect.succeed(false) }));
    if (!parsed) {
        return failure("providerError", text);
    }
    return { order: message.order, status: "ok" as const, transcript: text };
});

const startThread = FunctionImpl.make(
    databaseSchema,
    spec,
    "startThread",
    Effect.fn("VoiceEntry.startThread")(function* startThread() {
        const identity = yield* liveIdentity(yield* MutationCtx);
        if (identity === null) {
            return { status: "unauthenticated" as const, threadId: null };
        }
        const ctx = yield* MutationCtx;
        const pro = yield* isPro(ctx, identity.subject);
        const perUser = yield* Effect.promise(() =>
            rateLimiter.limit(ctx, "voiceThreadPerUser", {
                config: fixedBurst("voiceThread", pro),
                key: identity.tokenIdentifier,
            })
        );
        if (!perUser.ok) {
            return { status: "rateLimited" as const, threadId: null };
        }
        const global = yield* Effect.promise(() => rateLimiter.limit(ctx, "voiceThreadGlobal"));
        if (!global.ok) {
            return { status: "rateLimited" as const, threadId: null };
        }
        const threadId = yield* Effect.promise(() =>
            createThread(ctx, components.agent, {
                title: "Voice entry",
                userId: identity.tokenIdentifier,
            })
        );
        const scheduler = yield* Scheduler;
        yield* scheduler.runAfter(Duration.millis(THREAD_TTL_MS), refs.internal.voiceEntry.expireThread, { threadId });
        return { status: "ok" as const, threadId };
    }, Effect.orDie)
);

const expireThread = FunctionImpl.make(
    databaseSchema,
    spec,
    "expireThread",
    Effect.fn("VoiceEntry.expireThread")(function* expireThread({ threadId }) {
        const ctx = yield* MutationCtx;
        const thread = yield* Effect.promise(() => getThreadMetadata(ctx, components.agent, { threadId })).pipe(
            Effect.catchDefect(() => Effect.succeed(null))
        );
        if (thread === null) {
            yield* clearStreamCredits(threadId);
            return null;
        }
        const latest = yield* Effect.promise(() =>
            ctx.runQuery(components.agent.messages.listMessagesByThreadId, {
                order: "desc",
                paginationOpts: { cursor: null, numItems: 1 },
                threadId,
            })
        );
        const idleFor = (yield* Clock.currentTimeMillis) - (latest.page[0]?._creationTime ?? thread._creationTime);
        if (idleFor < THREAD_TTL_MS) {
            const scheduler = yield* Scheduler;
            yield* scheduler.runAfter(Duration.millis(THREAD_TTL_MS - idleFor), refs.internal.voiceEntry.expireThread, {
                threadId,
            });
            return null;
        }
        yield* Effect.promise(() => ctx.runMutation(components.agent.threads.deleteAllForThreadIdAsync, { threadId }));
        yield* clearStreamCredits(threadId);
        return null;
    }, Effect.orDie)
);

const endThread = FunctionImpl.make(
    databaseSchema,
    spec,
    "endThread",
    Effect.fn("VoiceEntry.endThread")(function* endThread({ threadId }) {
        const ctx = yield* MutationCtx;
        if ((yield* ownsThread(ctx, threadId)) === null) {
            return null;
        }
        yield* Effect.promise(() => ctx.runMutation(components.agent.threads.deleteAllForThreadIdAsync, { threadId }));
        yield* clearStreamCredits(threadId);
        return null;
    }, Effect.orDie)
);

const admit = FunctionImpl.make(
    databaseSchema,
    spec,
    "admit",
    Effect.fn("VoiceEntry.admit")(function* admit() {
        const identity = yield* liveIdentity(yield* MutationCtx);
        if (identity === null) {
            return "notEntitled" as const;
        }
        const ctx = yield* MutationCtx;
        return yield* admitCapture(
            ctx,
            identity,
            Effect.promise(() => rateLimiter.limit(ctx, "voiceEntryGlobal"))
        );
    }, Effect.orDie)
);

const speak = FunctionImpl.make(
    databaseSchema,
    spec,
    "speak",
    Effect.fn("VoiceEntry.speak")(
        function* speak(args) {
            const ctx = yield* ActionCtx;
            const {
                admitted: { transcriptionKey, userId },
                model,
            } = yield* openAiGate(ctx, {
                admit: Effect.fn("VoiceEntry.speakRungs")(function* speakRungs(caller: UserIdentity) {
                    const key = yield* elevenLabsApiKey;
                    if (Option.isNone(key)) {
                        return yield* refuse("notConfigured");
                    }
                    if (!isVoiceEntryInput(args)) {
                        return yield* refuse("invalid");
                    }
                    const owner = yield* ownsThread(ctx, args.threadId);
                    if (owner === null) {
                        return yield* refuse("invalid");
                    }
                    const { runMutation } = yield* MutationRunner;
                    yield* withinCaptureAllowance(ctx, caller, {
                        admit: runMutation(refs.internal.voiceEntry.admit),
                        burst: "voiceEntry",
                    });
                    return { transcriptionKey: key.value, userId: owner };
                }),
                args,
                feature: "voice_entry",
                modelId: claudeModelId,
                sessionId: args.threadId,
            });

            const heard = yield* transcribeClip(
                createElevenLabs({ apiKey: Redacted.value(transcriptionKey) }).transcription(
                    ELEVENLABS_TRANSCRIPTION_MODEL_ID
                ),
                args.audio,
                args.language
            );
            if ("error" in heard) {
                return failure(heard.error === "empty" ? "unclear" : "providerError");
            }

            return yield* parseTurn(ctx, {
                context: ledgerContext(args),
                model,
                text: heard.text,
                threadId: args.threadId,
                userId,
            });
        },
        Effect.catchTags({ AiRefused: ({ status }) => Effect.succeed(failure(status)) }),
        Effect.orDie
    )
);

const grantStream = FunctionImpl.make(
    databaseSchema,
    spec,
    "grantStream",
    Effect.fn("VoiceEntry.grantStream")(function* grantStream({ threadId }) {
        const writer = yield* DatabaseWriter;
        yield* writer.table("voiceStreamCredits").insert({ threadId });
        return null;
    }, Effect.orDie)
);

const spendStream = FunctionImpl.make(
    databaseSchema,
    spec,
    "spendStream",
    Effect.fn("VoiceEntry.spendStream")(function* spendStream({ threadId }) {
        const reader = yield* DatabaseReader;
        const writer = yield* DatabaseWriter;
        const now = yield* Clock.currentTimeMillis;
        const credits = yield* reader
            .table("voiceStreamCredits")
            .index("by_threadId", (q) => q.eq("threadId", threadId))
            .take(MAX_STREAM_CREDITS);
        const oldest = credits.find((credit) => now - credit._creationTime < THREAD_TTL_MS);
        if (oldest === undefined) {
            return false;
        }
        yield* writer.table("voiceStreamCredits").delete(oldest._id);
        return true;
    }, Effect.orDie)
);

const openStream = FunctionImpl.make(
    databaseSchema,
    spec,
    "openStream",
    Effect.fn("VoiceEntry.openStream")(
        function* openStream(args) {
            const ctx = yield* ActionCtx;
            const {
                admitted: { scribeKey },
            } = yield* openAiGate(ctx, {
                admit: Effect.fn("VoiceEntry.openStreamRungs")(function* openStreamRungs(caller: UserIdentity) {
                    const key = yield* elevenLabsApiKey;
                    if (Option.isNone(key)) {
                        return yield* refuse("notConfigured");
                    }
                    const owner = yield* ownsThread(ctx, args.threadId);
                    if (owner === null) {
                        return yield* refuse("invalid");
                    }
                    const { runMutation } = yield* MutationRunner;
                    yield* withinCaptureAllowance(ctx, caller, {
                        admit: runMutation(refs.internal.voiceEntry.admit),
                        burst: "voiceEntry",
                    });
                    return { scribeKey: key.value };
                }),
                args,
                feature: "voice_entry",
                modelId: claudeModelId,
                sessionId: args.threadId,
            });
            const { runMutation } = yield* MutationRunner;
            // The capture is already counted, so the credit is granted before the token fetch can fail.
            yield* runMutation(refs.internal.voiceEntry.grantStream, { threadId: args.threadId });
            return yield* requestScribeToken(Redacted.value(scribeKey)).pipe(
                Effect.map((token) => ({ status: "ok" as const, token })),
                Effect.catchTags({
                    ModelCallError: () => Effect.succeed({ status: "providerError" as const, token: null }),
                    SchemaError: () => Effect.succeed({ status: "providerError" as const, token: null }),
                })
            );
        },
        Effect.catchTags({ AiRefused: ({ status }) => Effect.succeed({ status, token: null }) }),
        Effect.orDie
    )
);

const speakText = FunctionImpl.make(
    databaseSchema,
    spec,
    "speakText",
    Effect.fn("VoiceEntry.speakText")(
        function* speakText(args) {
            const ctx = yield* ActionCtx;
            const {
                admitted: { userId },
                model,
            } = yield* openAiGate(ctx, {
                admit: Effect.fn("VoiceEntry.speakTextRungs")(function* speakTextRungs() {
                    if (!isSpeakTextInput(args)) {
                        return yield* refuse("invalid");
                    }
                    const owner = yield* ownsThread(ctx, args.threadId);
                    if (owner === null) {
                        return yield* refuse("invalid");
                    }
                    return { userId: owner };
                }),
                args,
                feature: "voice_entry",
                modelId: claudeModelId,
                sessionId: args.threadId,
            });
            const text = args.transcript.trim();
            if (text.length === 0) {
                return failure("unclear");
            }
            const { runMutation } = yield* MutationRunner;
            const spent = yield* runMutation(refs.internal.voiceEntry.spendStream, { threadId: args.threadId });
            if (!spent) {
                return failure("invalid");
            }
            return yield* parseTurn(ctx, {
                context: ledgerContext(args),
                model,
                text,
                threadId: args.threadId,
                userId,
            });
        },
        Effect.catchTags({ AiRefused: ({ status }) => Effect.succeed(failure(status)) }),
        Effect.orDie
    )
);

export default GroupImpl.make(databaseSchema, spec).pipe(
    Layer.provide(startThread),
    Layer.provide(expireThread),
    Layer.provide(FunctionImpl.make(databaseSchema, spec, "listTurns", listTurns)),
    Layer.provide(endThread),
    Layer.provide(admit),
    Layer.provide(speak),
    Layer.provide(openStream),
    Layer.provide(speakText),
    Layer.provide(grantStream),
    Layer.provide(spendStream),
    GroupImpl.finalize
);
