import { FunctionImpl, GroupImpl } from "@confect/server";
import { generateObject } from "@outlayr/ai/generate";
import type { TextModel } from "@outlayr/ai/model";
import { resolveSpeechModel } from "@outlayr/ai/speech";
import { route } from "@outlayr/model-router/route";
import type { UserIdentity } from "convex/server";
import * as Clock from "effect/Clock";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import refs from "./_generated/refs";
import databaseSchema from "./_generated/schema";
import {
    ActionCtx,
    DatabaseReader,
    DatabaseWriter,
    MutationCtx,
    MutationRunner,
    QueryCtx,
    Scheduler,
} from "./_generated/services";
import { openAiGate, refuse } from "./lib/aiGate";
import { liveIdentity } from "./lib/auth";
import { admitCapture, withinCaptureAllowance } from "./lib/captures";
import { outboundHttp } from "./lib/http";
import type { LedgerContext } from "./lib/ledgerPrompt";
import { fixedBurst } from "./lib/limits";
import { isPro } from "./revenuecat";
import {
    beginTurn,
    buildPrompt,
    clearStreamCredits,
    deleteThreadBatch,
    ENDED_THREAD_GRACE_MS,
    failure,
    listTurns,
    MAX_STREAM_CREDITS,
    ModelOutput,
    ownsThread,
    PARSE_TIMEOUT_MS,
    proposeDraft,
    rateLimiter,
    readTurns,
    THREAD_TTL_MS,
    threadOwner,
    transcribeClip,
    turnMessages,
} from "./voiceEntry";
import spec, { SpeakTextInput, VoiceEntryInput } from "./voiceEntry.spec";

const isVoiceEntryInput = Schema.is(VoiceEntryInput);
const isSpeakTextInput = Schema.is(SpeakTextInput);

const ledgerContext = (args: Pick<LedgerContext, "accounts" | "categoryTree" | "currency" | "language" | "today">) =>
    ({
        accounts: args.accounts,
        categoryTree: args.categoryTree,
        currency: args.currency,
        language: args.language,
        today: args.today,
    }) satisfies LedgerContext;

const parseTurn = Effect.fn("VoiceEntry.parseTurn")(function* parseTurn(turn: {
    readonly context: LedgerContext;
    readonly model: TextModel;
    readonly text: string;
    readonly threadId: string;
}) {
    const { context, model, text, threadId } = turn;
    const { runMutation } = yield* MutationRunner;
    const begun = yield* runMutation(refs.internal.voiceEntry.beginTurn, { said: text, threadId });
    if (begun === null) {
        return failure("invalid", text);
    }
    const answered = yield* generateObject(model, ModelOutput, {
        messages: turnMessages(begun.history, text),
        system: buildPrompt(context),
        timeout: Duration.millis(PARSE_TIMEOUT_MS),
    }).pipe(
        Effect.map(Option.some),
        Effect.catchTags({ ModelCallError: () => Effect.succeed(Option.none<ModelOutput>()) })
    );
    if (Option.isNone(answered)) {
        return failure("providerError", text);
    }
    yield* runMutation(refs.internal.voiceEntry.answerTurn, {
        proposed: proposeDraft(answered.value, context, text),
        reply: JSON.stringify(answered.value),
        turnId: begun.turnId,
    });
    return { order: begun.order, status: "ok" as const, transcript: text };
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
            ctx.db.insert("voiceThreads", { userId: identity.tokenIdentifier })
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
    Effect.fn("VoiceEntry.expireThread")(function* expireThread({ idleLimitMs = THREAD_TTL_MS, threadId }) {
        const ctx = yield* MutationCtx;
        const scheduler = yield* Scheduler;
        const id = ctx.db.normalizeId("voiceThreads", threadId);
        const thread = id === null ? null : yield* Effect.promise(() => ctx.db.get(id));
        if (thread === null) {
            yield* clearStreamCredits(ctx.db, threadId);
            return null;
        }
        const latest = yield* Effect.promise(() =>
            ctx.db
                .query("voiceTurns")
                .withIndex("by_threadId_and_order", (q) => q.eq("threadId", thread._id))
                .order("desc")
                .first()
        );
        const idleFor = (yield* Clock.currentTimeMillis) - (latest?._creationTime ?? thread._creationTime);
        if (idleFor < idleLimitMs) {
            yield* scheduler.runAfter(Duration.millis(idleLimitMs - idleFor), refs.internal.voiceEntry.expireThread, {
                idleLimitMs,
                threadId,
            });
            return null;
        }
        if (!(yield* deleteThreadBatch(ctx.db, thread._id))) {
            yield* scheduler.runAfter(Duration.zero, refs.internal.voiceEntry.expireThread, {
                idleLimitMs: 0,
                threadId,
            });
        }
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
        const scheduler = yield* Scheduler;
        yield* scheduler.runAfter(Duration.millis(ENDED_THREAD_GRACE_MS), refs.internal.voiceEntry.expireThread, {
            idleLimitMs: ENDED_THREAD_GRACE_MS,
            threadId,
        });
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
                admitted: { speech },
                model,
            } = yield* openAiGate(ctx, {
                admit: Effect.fn("VoiceEntry.speakRungs")(function* speakRungs(caller: UserIdentity) {
                    const resolved = yield* resolveSpeechModel();
                    if (Option.isNone(resolved)) {
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
                    return { speech: resolved.value };
                }),
                args,
                route: route({ feature: "voice_entry" }),
                sessionId: args.threadId,
            });
            const heard = yield* transcribeClip(speech, args.audio, args.language);
            if ("error" in heard) {
                return failure(heard.error === "empty" ? "unclear" : "providerError");
            }

            return yield* parseTurn({
                context: ledgerContext(args),
                model,
                text: heard.text,
                threadId: args.threadId,
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
        const reader = yield* DatabaseReader;
        const writer = yield* DatabaseWriter;
        const now = yield* Clock.currentTimeMillis;
        const credits = yield* reader
            .table("voiceStreamCredits")
            .index("by_threadId", (q) => q.eq("threadId", threadId))
            .take(MAX_STREAM_CREDITS);
        const overflow = credits.length + 1 - MAX_STREAM_CREDITS;
        for (const [at, credit] of credits.entries()) {
            if (at < overflow || now - credit._creationTime >= THREAD_TTL_MS) {
                yield* writer.table("voiceStreamCredits").delete(credit._id);
            }
        }
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
            const { admitted: realtime } = yield* openAiGate(ctx, {
                admit: Effect.fn("VoiceEntry.openStreamRungs")(function* openStreamRungs(caller: UserIdentity) {
                    const speech = yield* resolveSpeechModel();
                    if (Option.isNone(speech)) {
                        return yield* refuse("notConfigured");
                    }
                    const owner = yield* ownsThread(ctx, args.threadId);
                    if (owner === null) {
                        return yield* refuse("invalid");
                    }
                    if (Option.isNone(speech.value.realtime)) {
                        return speech.value.realtime;
                    }
                    const { runMutation } = yield* MutationRunner;
                    yield* withinCaptureAllowance(ctx, caller, {
                        admit: runMutation(refs.internal.voiceEntry.admit),
                        burst: "voiceEntry",
                    });
                    return speech.value.realtime;
                }),
                args,
                route: route({ feature: "voice_entry" }),
                sessionId: args.threadId,
            });
            if (Option.isNone(realtime)) {
                return { session: { kind: "clip" as const }, status: "ok" as const, token: null };
            }
            const { runMutation } = yield* MutationRunner;
            // The capture is already counted, so the credit is granted before the token fetch can fail.
            yield* runMutation(refs.internal.voiceEntry.grantStream, { threadId: args.threadId });
            return yield* realtime.value.pipe(
                Effect.map((session) => ({
                    session,
                    status: "ok" as const,
                    token: session.kind === "elevenlabs" ? session.token : null,
                })),
                Effect.catchTags({
                    ModelCallError: () =>
                        Effect.succeed({ session: null, status: "providerError" as const, token: null }),
                }),
                Effect.provide(outboundHttp)
            );
        },
        Effect.catchTags({ AiRefused: ({ status }) => Effect.succeed({ session: null, status, token: null }) }),
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
            const { model } = yield* openAiGate(ctx, {
                admit: Effect.fn("VoiceEntry.speakTextRungs")(function* speakTextRungs() {
                    if (!isSpeakTextInput(args)) {
                        return yield* refuse("invalid");
                    }
                    const owner = yield* ownsThread(ctx, args.threadId);
                    if (owner === null) {
                        return yield* refuse("invalid");
                    }
                    return owner;
                }),
                args,
                route: route({ feature: "voice_entry" }),
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
            return yield* parseTurn({ context: ledgerContext(args), model, text, threadId: args.threadId });
        },
        Effect.catchTags({ AiRefused: ({ status }) => Effect.succeed(failure(status)) }),
        Effect.orDie
    )
);

const turns = FunctionImpl.make(
    databaseSchema,
    spec,
    "turns",
    Effect.fn("VoiceEntry.turns")(function* turns({ threadId }) {
        return yield* readTurns(yield* QueryCtx, threadId);
    }, Effect.orDie)
);

const threadOwnerQuery = FunctionImpl.make(
    databaseSchema,
    spec,
    "threadOwner",
    Effect.fn("VoiceEntry.threadOwnerQuery")(function* threadOwnerQuery({ threadId }) {
        return yield* threadOwner((yield* QueryCtx).db, threadId);
    }, Effect.orDie)
);

const beginTurnMutation = FunctionImpl.make(
    databaseSchema,
    spec,
    "beginTurn",
    Effect.fn("VoiceEntry.beginTurnMutation")(function* beginTurnMutation(turn) {
        return yield* beginTurn(yield* MutationCtx, turn);
    }, Effect.orDie)
);

const answerTurn = FunctionImpl.make(
    databaseSchema,
    spec,
    "answerTurn",
    Effect.fn("VoiceEntry.answerTurn")(function* answerTurn({ proposed, reply, turnId }) {
        const turn = yield* (yield* DatabaseReader).table("voiceTurns").get(turnId).pipe(Effect.option);
        if (Option.isSome(turn)) {
            yield* (yield* DatabaseWriter).table("voiceTurns").patch(turnId, { proposed, reply });
        }
        return null;
    }, Effect.orDie)
);

const forgetUser = FunctionImpl.make(
    databaseSchema,
    spec,
    "forgetUser",
    Effect.fn("VoiceEntry.forgetUser")(function* forgetUser({ userId }) {
        const ctx = yield* MutationCtx;
        const thread = yield* Effect.promise(() =>
            ctx.db
                .query("voiceThreads")
                .withIndex("by_userId", (q) => q.eq("userId", userId))
                .first()
        );
        if (thread === null) {
            return null;
        }
        yield* deleteThreadBatch(ctx.db, thread._id);
        const scheduler = yield* Scheduler;
        yield* scheduler.runAfter(Duration.zero, refs.internal.voiceEntry.forgetUser, { userId });
        return null;
    }, Effect.orDie)
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
    Layer.provide(turns),
    Layer.provide(threadOwnerQuery),
    Layer.provide(beginTurnMutation),
    Layer.provide(answerTurn),
    Layer.provide(forgetUser),
    GroupImpl.finalize
);
