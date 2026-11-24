import type { StreamSession } from "@outlayr/backend/confect/voiceEntry.spec";
import { useQueries } from "convex/react";
import * as Clock from "effect/Clock";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Option from "effect/Option";
import { useRef, useState } from "react";
import type { RefObject } from "react";
import type { SharedValue } from "react-native-reanimated";

import { judgeSilence, localIsoDate, startSilenceWatch, voiceTurnsOf } from "@/domain/voice-entry";
import type { SilenceWatch, VoiceTurn } from "@/domain/voice-entry";
import { useRealtimeTranscript } from "@/hooks/use-realtime-transcript";
import type { RealtimeStart, RealtimeTranscript, Take } from "@/hooks/use-realtime-transcript";
import { trackCapturesWall } from "@/hooks/use-usage-limits";
import { duringHandoff } from "@/lib/app-handoff";
import { VOICE_TURNS_QUERY, voiceThreadTransport } from "@/lib/cloud-ai";
import type {
    SpeakRefusal,
    SpeakRequest,
    ThreadRefusal,
    ThreadTurn,
    VoiceDraft,
    VoiceQuote,
    VoiceThreadTransport,
} from "@/lib/cloud-ai";
import type { CloudError } from "@/lib/cloud-error";
import { useLatest, useOnMount } from "@/lib/lifecycle";
import { voiceKeyterms } from "@/lib/realtime-scribe";
import { TranscriptStreamError } from "@/lib/transcript-stream";
import type { TranscriptFailureReason } from "@/lib/transcript-stream";
import { timedCaptureCommand, VOICE_SPEAK_TIMEOUT } from "@/state/capture-commands";
import { fromCommand, voidFlowCommand } from "@/state/entry-commands";
import { logged } from "@/state/entry-save";
import { useAtomCommand } from "@/state/use-atom-command";

const speakCommand = timedCaptureCommand<Effect.Success<ReturnType<VoiceThreadTransport["speakText"]>>, CloudError>({
    operation: "speak",
    timeout: VOICE_SPEAK_TIMEOUT,
});

const streamCommand = timedCaptureCommand<Effect.Success<ReturnType<VoiceThreadTransport["openStream"]>>, CloudError>({
    operation: "speak",
    timeout: VOICE_SPEAK_TIMEOUT,
});

export type VoiceFailure =
    | "denied"
    | "silent"
    | "unclear"
    | "offline"
    | "timeout"
    | "notConfigured"
    | "unauthenticated"
    | "rateLimited"
    | "notEntitled"
    | "quotaExceeded"
    | "provider";

export type VoicePhase<Context = unknown> =
    | { kind: "starting" }
    | { kind: "listening" }
    | { kind: "sending"; text: string | null }
    | { context: Context; kind: "thinking"; order: number; text: string }
    | { context: Context; draft: VoiceDraft; kind: "review"; order: number; quotes: readonly VoiceQuote[] }
    | { kind: "failed"; reason: VoiceFailure; transcript: string | null };

interface UseVoiceEntryArgs<Context> {
    context: Context;
    /** The subtag Scribe takes as `language_code`, like `es`. */
    language: string;
    request: Omit<SpeakRequest, "audio" | "threadId" | "today">;
    transport?: VoiceThreadTransport;
}

export interface UseVoiceEntryResult<Context> {
    cancel: () => void;
    finish: () => void;
    heard: string | null;
    level: SharedValue<number>;
    listenAgain: () => void;
    /** The words heard so far while listening. */
    partial: string;
    phase: VoicePhase<Context>;
    spoke: boolean;
    turns: VoiceTurn[];
}

const NO_TURNS: readonly ThreadTurn[] = [];

const FAILURE_FOR = {
    invalid: "provider",
    invalidResponse: "provider",
    notConfigured: "notConfigured",
    notEntitled: "notEntitled",
    providerError: "provider",
    quotaExceeded: "quotaExceeded",
    rateLimited: "rateLimited",
    unauthenticated: "unauthenticated",
    unclear: "silent",
} as const satisfies Record<SpeakRefusal, VoiceFailure>;

const THREAD_FAILURE_FOR = {
    invalidResponse: "provider",
    rateLimited: "rateLimited",
    unauthenticated: "unauthenticated",
} as const satisfies Record<ThreadRefusal, VoiceFailure>;

// The transcriber's quota and rate limits are the provider's account, not the user's captures,
// so they read as a provider fault.
const STREAM_FAILURE_FOR = {
    offline: "offline",
    provider: "provider",
    quotaExceeded: "provider",
    rateLimited: "provider",
    silent: "silent",
    unauthenticated: "unauthenticated",
} as const satisfies Record<TranscriptFailureReason, VoiceFailure>;

const streamFailureOf = (error: TranscriptStreamError): VoiceFailure => STREAM_FAILURE_FOR[error.reason];

function settledPhaseOf<Context>(phase: VoicePhase<Context>, turns: readonly ThreadTurn[]): VoicePhase<Context> {
    if (phase.kind !== "thinking") {
        return phase;
    }
    const turn = turns.find(({ order }) => order === phase.order);
    if (turn === undefined || turn.proposed === null) {
        return phase;
    }
    if (turn.proposed.draft === null) {
        return { kind: "failed", reason: "unclear", transcript: turn.said };
    }
    return {
        context: phase.context,
        draft: turn.proposed.draft,
        kind: "review",
        order: phase.order,
        quotes: turn.proposed.quotes ?? [],
    };
}

function heardIn(phase: VoicePhase, turns: readonly ThreadTurn[]): string | null {
    const said = (order: number) => turns.find((turn) => turn.order === order)?.said ?? null;
    switch (phase.kind) {
        case "sending": {
            return phase.text;
        }
        case "thinking": {
            return said(phase.order) ?? phase.text;
        }
        case "review": {
            return said(phase.order);
        }
        case "failed": {
            return phase.transcript;
        }
        default: {
            return null;
        }
    }
}

interface VoicePorts<Context> {
    api: VoiceThreadTransport;
    disposedRef: RefObject<boolean>;
    endingRef: RefObject<number | null>;
    latest: RefObject<{
        context: Context;
        request: UseVoiceEntryArgs<Context>["request"];
    }>;
    resentRef: RefObject<Take | null>;
    setPhase: (phase: VoicePhase<Context>) => void;
    setSpoke: (spoke: boolean) => void;
    setThreadId: (threadId: string | null) => void;
    speakAbortRef: RefObject<AbortController | null>;
    start: (flow: Effect.Effect<void>) => void;
    takeRef: RefObject<number>;
    threadRef: RefObject<string | null>;
    transcriptRef: RefObject<RealtimeTranscript>;
    watchRef: RefObject<SilenceWatch | null>;
}

function supersedeTake({
    speakAbortRef,
    takeRef,
    transcriptRef,
    watchRef,
}: Pick<VoicePorts<unknown>, "speakAbortRef" | "takeRef" | "transcriptRef" | "watchRef">) {
    takeRef.current += 1;
    watchRef.current = null;
    speakAbortRef.current?.abort();
    speakAbortRef.current = null;
    transcriptRef.current.cancel();
}

function dropThread<Context>(ports: VoicePorts<Context>) {
    const { api, setThreadId, start, threadRef } = ports;
    const id = threadRef.current;
    threadRef.current = null;
    setThreadId(null);
    if (id !== null) {
        start(api.end(id).pipe(Effect.catchCause(() => Effect.void)));
    }
}

function fail<Context>(
    ports: VoicePorts<Context>,
    take: number,
    reason: VoiceFailure,
    transcript: string | null = null
) {
    if (take === ports.takeRef.current) {
        ports.setPhase({ kind: "failed", reason, transcript });
    }
}

const openThread = Effect.fn("VoiceEntry.openThread")(function* openThread<Context>(
    ports: VoicePorts<Context>,
    take: number
) {
    const { api, disposedRef, setThreadId, threadRef } = ports;
    const started = yield* api.start().pipe(Effect.exit);
    if (Exit.isFailure(started)) {
        if (!disposedRef.current) {
            fail(ports, take, "offline");
        }
        return null;
    }
    const opened = started.value;
    if (disposedRef.current) {
        if (opened.ok) {
            yield* api.end(opened.threadId).pipe(Effect.catchCause(() => Effect.void));
        }
        return null;
    }
    if (!opened.ok) {
        fail(ports, take, THREAD_FAILURE_FOR[opened.reason]);
        return null;
    }
    threadRef.current = opened.threadId;
    setThreadId(opened.threadId);
    return opened.threadId;
});

const openTakeStream: <Context>(
    ports: VoicePorts<Context>,
    take: number,
    retried?: boolean
) => Effect.Effect<StreamSession | null> = Effect.fn("VoiceEntry.openTakeStream")(function* openTakeStreamFor<Context>(
    ports: VoicePorts<Context>,
    take: number,
    retried = false
) {
    const { api, speakAbortRef, takeRef, threadRef } = ports;
    const id = threadRef.current ?? (yield* openThread(ports, take));
    if (id === null || take !== takeRef.current) {
        return null;
    }
    const controller = new AbortController();
    speakAbortRef.current = controller;
    const result = yield* fromCommand(streamCommand, {
        call: api.openStream({ threadId: id }),
        signal: controller.signal,
    }).pipe(Effect.exit);
    if (take !== takeRef.current) {
        return null;
    }
    if (Exit.isFailure(result)) {
        fail(ports, take, "offline");
        return null;
    }
    const settled = Option.getOrNull(result.value);
    if (settled === null) {
        fail(ports, take, "timeout");
        return null;
    }
    if (settled.ok) {
        return settled.session;
    }
    if (settled.reason === "invalid" && !retried) {
        // The server sweeps threads idle for an hour: reopen once on a fresh thread.
        dropThread(ports);
        return yield* openTakeStream(ports, take, true);
    }
    const reason = FAILURE_FOR[settled.reason];
    trackCapturesWall(reason);
    fail(ports, take, reason);
    return null;
});

const sendTake: <Context>(ports: VoicePorts<Context>, take: number, said: Take, id: string) => Effect.Effect<void> =
    Effect.fn("VoiceEntry.sendTake")(function* sendTakeTo<Context>(
        ports: VoicePorts<Context>,
        take: number,
        said: Take,
        id: string
    ) {
        const { api, latest, resentRef, setPhase, speakAbortRef, takeRef } = ports;
        const { context: sentContext, request: sentRequest } = latest.current;
        const controller = new AbortController();
        speakAbortRef.current = controller;
        const request = { ...sentRequest, threadId: id, today: localIsoDate(yield* DateTime.nowAsDate) };
        const result = yield* fromCommand(speakCommand, {
            call:
                said.kind === "transcript"
                    ? api.speakText({ ...request, transcript: said.text })
                    : api.speak({ ...request, audio: said.audio }),
            signal: controller.signal,
        }).pipe(Effect.exit);
        if (take !== takeRef.current) {
            return;
        }
        if (Exit.isFailure(result)) {
            fail(ports, take, "offline");
            return;
        }
        const settled = Option.getOrNull(result.value);
        if (settled === null) {
            // The request may still land a draft on this thread, so a retry must not speak into it.
            dropThread(ports);
            fail(ports, take, "timeout");
            return;
        }
        if (settled.ok) {
            const text = said.kind === "transcript" ? said.text : (settled.transcript ?? "");
            setPhase({ context: sentContext, kind: "thinking", order: settled.order, text });
            return;
        }
        if (settled.reason === "invalid" && resentRef.current !== said) {
            resentRef.current = said;
            dropThread(ports);
            const reopened = yield* openThread(ports, take);
            if (reopened !== null && take === takeRef.current) {
                yield* sendTake(ports, take, said, reopened);
            }
            return;
        }
        const reason = FAILURE_FOR[settled.reason];
        trackCapturesWall(reason);
        fail(ports, take, reason, settled.transcript);
    });

const trimmedTake = (said: Take): Take => (said.kind === "transcript" ? { ...said, text: said.text.trim() } : said);

const finishTake = Effect.fn("VoiceEntry.finishTake")(function* finishTake<Context>(
    ports: VoicePorts<Context>,
    take: number,
    outcome: "send" | "silent" | "discard"
) {
    const { endingRef, setPhase, takeRef, threadRef, transcriptRef, watchRef } = ports;
    // Claimed before the first yield: a second tap or the silence judge would race this for one stream.
    if (endingRef.current === take) {
        return;
    }
    endingRef.current = take;
    watchRef.current = null;
    if (outcome !== "send") {
        transcriptRef.current.cancel();
        if (outcome === "silent") {
            fail(ports, take, "silent");
        }
        return;
    }
    setPhase({ kind: "sending", text: null });
    const finished = yield* Effect.tryPromise({
        catch: (error): VoiceFailure => (error instanceof TranscriptStreamError ? streamFailureOf(error) : "provider"),
        try: () => transcriptRef.current.finish(),
    }).pipe(
        Effect.map((said) => ({ ok: true as const, said: trimmedTake(said) })),
        Effect.catch((reason) => Effect.succeed({ ok: false as const, reason }))
    );
    if (take !== takeRef.current) {
        return;
    }
    if (!finished.ok) {
        fail(ports, take, finished.reason);
        return;
    }
    const { said } = finished;
    if (said.kind === "transcript" && said.text === "") {
        fail(ports, take, "silent");
        return;
    }
    setPhase({ kind: "sending", text: said.kind === "transcript" ? said.text : null });
    const id = threadRef.current ?? (yield* openThread(ports, take));
    if (id !== null && take === takeRef.current) {
        yield* sendTake(ports, take, said, id);
    }
});

function hearLevel<Context>(ports: VoicePorts<Context>, sample: number, at: number) {
    const { setSpoke, start, takeRef, watchRef } = ports;
    const watch = watchRef.current;
    if (watch === null) {
        return;
    }
    const judged = judgeSilence(watch, sample, at);
    if (watch.lastSpeechAt === null && judged.watch.lastSpeechAt !== null) {
        setSpoke(true);
    }
    watchRef.current = judged.watch;
    if (judged.verdict !== "keep") {
        start(finishTake(ports, takeRef.current, judged.verdict === "nothingSaid" ? "silent" : "send"));
    }
}

function streamFailed<Context>(ports: VoicePorts<Context>, error: TranscriptStreamError) {
    const { endingRef, takeRef, transcriptRef, watchRef } = ports;
    // Past `finish` the stream's own promise carries the failure.
    if (watchRef.current === null) {
        return;
    }
    const take = takeRef.current;
    endingRef.current = take;
    watchRef.current = null;
    transcriptRef.current.cancel();
    fail(ports, take, streamFailureOf(error));
}

const startTake = Effect.fn("VoiceEntry.startTake")(function* startTake<Context>(ports: VoicePorts<Context>) {
    const { setPhase, setSpoke, takeRef, transcriptRef, watchRef } = ports;
    supersedeTake(ports);
    const take = takeRef.current;
    setPhase({ kind: "starting" });
    const session = yield* openTakeStream(ports, take);
    if (session === null || take !== takeRef.current) {
        return;
    }
    const began = yield* duringHandoff(
        Effect.promise(() => transcriptRef.current.start(session).catch((): RealtimeStart => "failed"))
    );
    if (take !== takeRef.current) {
        transcriptRef.current.cancel();
        return;
    }
    if (began !== "started") {
        fail(ports, take, began === "denied" ? "denied" : "provider");
        return;
    }
    watchRef.current = startSilenceWatch(yield* Clock.currentTimeMillis);
    setSpoke(false);
    setPhase({ kind: "listening" });
});

// Must render inside the Convex provider.
export function useVoiceEntry<Context>({
    context,
    language,
    request,
    transport,
}: UseVoiceEntryArgs<Context>): UseVoiceEntryResult<Context> {
    const [phase, setPhase] = useState<VoicePhase<Context>>({ kind: "starting" });
    const [threadId, setThreadId] = useState<string | null>(null);
    const [spoke, setSpoke] = useState(false);
    /** Bumped by every cancel/listenAgain so a stop racing a start cannot land on the wrong take. */
    const takeRef = useRef(0);
    const watchRef = useRef<SilenceWatch | null>(null);
    const endingRef = useRef<number | null>(null);
    const threadRef = useRef<string | null>(null);
    const resentRef = useRef<Take | null>(null);
    const disposedRef = useRef(false);
    const speakAbortRef = useRef<AbortController | null>(null);
    const runFlow = useAtomCommand(voidFlowCommand);
    const start = <E>(flow: Effect.Effect<void, E>) => {
        void runFlow(logged("Voice entry failed")(flow));
    };
    const [api] = useState(() => transport ?? voiceThreadTransport());

    const transcript = useRealtimeTranscript({
        keyterms: voiceKeyterms(request),
        language,
        onError: (error) => streamFailed(portsRef.current, error),
        onLevel: (sample, at) => hearLevel(portsRef.current, sample, at),
    });
    const transcriptRef = useLatest(transcript);

    const threadTurns: readonly ThreadTurn[] | Error | undefined = useQueries(
        threadId === null ? {} : { turns: { args: { threadId }, query: VOICE_TURNS_QUERY } }
    ).turns;
    const thread = Array.isArray(threadTurns) ? threadTurns : NO_TURNS;

    const latest = useLatest({ context, request });

    const ports: VoicePorts<Context> = {
        api,
        disposedRef,
        endingRef,
        latest,
        resentRef,
        setPhase,
        setSpoke,
        setThreadId,
        speakAbortRef,
        start,
        takeRef,
        threadRef,
        transcriptRef,
        watchRef,
    };
    const portsRef = useLatest(ports);

    useOnMount(() => {
        let disposed = false;
        disposedRef.current = false;
        queueMicrotask(() => {
            if (!disposed) {
                start(startTake(ports));
            }
        });
        return () => {
            disposedRef.current = true;
            const id = threadRef.current;
            if (id !== null) {
                start(api.end(id).pipe(Effect.catchCause(() => Effect.void)));
            }
            disposed = true;
            supersedeTake(ports);
        };
    });

    const settledPhase = settledPhaseOf(phase, thread);
    if (settledPhase !== phase) {
        setPhase(settledPhase);
    }

    const turns = voiceTurnsOf(thread);

    const heard = heardIn(settledPhase, thread);

    const finish = () => {
        if (phase.kind === "listening") {
            start(finishTake(ports, takeRef.current, "send"));
        }
    };

    const cancel = () => {
        supersedeTake(ports);
    };

    const listenAgain = () => {
        start(startTake(ports));
    };

    return {
        cancel,
        finish,
        heard,
        level: transcript.level,
        listenAgain,
        partial: transcript.partial,
        phase: settledPhase,
        spoke,
        turns,
    };
}
