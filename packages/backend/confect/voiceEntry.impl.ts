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
import { ActionCtx, MutationCtx, MutationRunner, Scheduler } from "./_generated/services";
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
    ownsThread,
    PARSE_TIMEOUT_MS,
    rateLimiter,
    THREAD_TTL_MS,
    transcribeClip,
    voiceAgent,
} from "./voiceEntry";
import spec, { VoiceEntryInput } from "./voiceEntry.spec";

const isVoiceEntryInput = Schema.is(VoiceEntryInput);

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

            const context: LedgerContext = {
                accounts: args.accounts,
                categoryTree: args.categoryTree,
                currency: args.currency,
                language: args.language,
                today: args.today,
            };
            const agent = voiceAgent(model, context, heard.text);
            const { message, messageId } = yield* Effect.promise(() =>
                saveMessage(ctx, components.agent, {
                    prompt: heard.text,
                    threadId: args.threadId,
                    userId,
                })
            );
            const parsed = yield* Effect.tryPromise({
                catch: modelCallError,
                try: async () => {
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
                },
            }).pipe(Effect.as(true), Effect.catchTags({ ModelCallError: () => Effect.succeed(false) }));
            if (!parsed) {
                return failure("providerError", heard.text);
            }
            return { order: message.order, status: "ok" as const, transcript: heard.text };
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
    GroupImpl.finalize
);
