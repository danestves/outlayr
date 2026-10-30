import { createAnthropic } from "@ai-sdk/anthropic";
import { createElevenLabs } from "@ai-sdk/elevenlabs";
import { FunctionImpl, GroupImpl } from "@confect/server";
import { createThread, getThreadMetadata, saveMessage } from "@convex-dev/agent";
import { isRateLimitError } from "@convex-dev/rate-limiter";
import { AI_CONSENT_VERSION } from "@outlayr/money/contract";
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
import { ActionCtx, Auth, MutationCtx, MutationRunner, Scheduler } from "./_generated/services";
import { traced } from "./lib/aiTracing";
import { admitCapture } from "./lib/captures";
import { anthropicApiKey, claudeModelId, elevenLabsApiKey } from "./lib/config";
import type { LedgerContext } from "./lib/ledgerPrompt";
import { fixedBurst, perUserBurst } from "./lib/limits";
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
        const auth = yield* Auth;
        const identity = yield* auth.getUserIdentity.pipe(
            Effect.catchTags({ NoUserIdentityFoundError: () => Effect.succeed(null) })
        );
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
        const auth = yield* Auth;
        const identity = yield* auth.getUserIdentity.pipe(
            Effect.catchTags({ NoUserIdentityFoundError: () => Effect.succeed(null) })
        );
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
    Effect.fn("VoiceEntry.speak")(function* speak(args) {
        const auth = yield* Auth;
        const identity = yield* auth.getUserIdentity.pipe(
            Effect.catchTags({ NoUserIdentityFoundError: () => Effect.succeed(null) })
        );
        if (identity === null) {
            return failure("unauthenticated");
        }

        // Read per call, so clearing a key with `npx convex env set` takes effect on the next clip.
        const apiKey = yield* anthropicApiKey;
        const transcriptionKey = yield* elevenLabsApiKey;
        if (Option.isNone(apiKey) || Option.isNone(transcriptionKey) || args.aiConsent !== AI_CONSENT_VERSION) {
            return failure("notConfigured");
        }

        if (!isVoiceEntryInput(args)) {
            return failure("invalid");
        }

        const ctx = yield* ActionCtx;
        const userId = yield* ownsThread(ctx, args.threadId);
        if (userId === null) {
            return failure("invalid");
        }

        const pro = yield* isPro(ctx, identity.subject);
        const burst = yield* perUserBurst("voiceEntry", pro);
        const perUser = yield* Effect.promise(() =>
            rateLimiter.limit(ctx, "voiceEntryPerUser", { config: burst, key: identity.tokenIdentifier })
        );
        if (!perUser.ok) {
            return failure("rateLimited");
        }

        const { runMutation } = yield* MutationRunner;
        const admitted = yield* runMutation(refs.internal.voiceEntry.admit).pipe(
            Effect.catchDefect((defect) =>
                isRateLimitError(defect) ? Effect.succeed("rateLimited" as const) : Effect.die(defect)
            )
        );
        if (admitted !== "ok") {
            return failure(admitted);
        }

        const heard = yield* transcribeClip(
            createElevenLabs({ apiKey: Redacted.value(transcriptionKey.value) }).transcription(
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
        const modelId = yield* claudeModelId;
        const agent = voiceAgent(
            traced(createAnthropic({ apiKey: Redacted.value(apiKey.value) })(modelId), "voice_entry", {
                distinctId: args.shareAnalytics === true ? identity.subject : undefined,
                sessionId: args.threadId,
            }),
            context,
            heard.text
        );
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
    }, Effect.orDie)
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
