import { useUIMessages } from "@convex-dev/agent/react";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Option from "effect/Option";
import {
    AudioQuality,
    getRecordingPermissionsAsync,
    IOSOutputFormat,
    requestRecordingPermissionsAsync,
    setAudioModeAsync,
    useAudioRecorder,
} from "expo-audio";
import type { RecordingOptions } from "expo-audio";
import { File } from "expo-file-system";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { RefObject } from "react";
import { useSharedValue } from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";

import {
    judgeSilence,
    localIsoDate,
    meterToLevel,
    proposedDraftOf,
    startSilenceWatch,
    voiceTurnsOf,
} from "@/domain/voice-entry";
import type { VoiceTurn, VoiceTurnMessage } from "@/domain/voice-entry";
import { trackCapturesWall } from "@/hooks/use-usage-limits";
import { duringHandoff } from "@/lib/app-handoff";
import { VOICE_TURNS_QUERY, voiceThreadTransport } from "@/lib/convex";
import type { SpeakRequest, StartThreadResult, VoiceDraft, VoiceQuote, VoiceThreadTransport } from "@/lib/convex";
import { useLatest } from "@/lib/use-latest";
import { timedCaptureCommand, VOICE_SPEAK_TIMEOUT } from "@/state/capture-commands";
import { fromCommand, voidFlowCommand } from "@/state/entry-commands";
import { logged } from "@/state/entry-save";
import { useAtomCommand } from "@/state/use-atom-command";

// ~6KB/s against the server's 900KB cap and 45s recording cap.
// `isMeteringEnabled` is what makes `getStatus().metering` exist at all.
const RECORDING_OPTIONS: RecordingOptions = {
    android: { audioEncoder: "aac", extension: ".m4a", outputFormat: "mpeg4" },
    bitRate: 48_000,
    extension: ".m4a",
    ios: {
        audioQuality: AudioQuality.MEDIUM,
        linearPCMBitDepth: 16,
        linearPCMIsBigEndian: false,
        linearPCMIsFloat: false,
        outputFormat: IOSOutputFormat.MPEG4AAC,
    },
    isMeteringEnabled: true,
    numberOfChannels: 1,
    sampleRate: 44_100,
    web: { bitsPerSecond: 48_000, mimeType: "audio/webm" },
};

const METER_INTERVAL_MS = 50;
const TURNS_PAGE = 40;

const speakCommand = timedCaptureCommand<Effect.Success<ReturnType<VoiceThreadTransport["speak"]>>>({
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
    | { after: number; clip: ArrayBuffer; kind: "sending" }
    | { context: Context; kind: "thinking"; order: number }
    | { context: Context; draft: VoiceDraft; kind: "review"; order: number; quotes: readonly VoiceQuote[] }
    | { kind: "failed"; reason: VoiceFailure; transcript: string | null };

interface UseVoiceEntryArgs<Context> {
    context: Context;
    request: Omit<SpeakRequest, "audio" | "threadId" | "today">;
    transport?: VoiceThreadTransport;
}

export interface UseVoiceEntryResult<Context> {
    cancel: () => void;
    finish: () => void;
    heard: string | null;
    level: SharedValue<number>;
    listenAgain: () => void;
    phase: VoicePhase<Context>;
    spoke: boolean;
    turns: VoiceTurn[];
}

function failureFor(status: string): VoiceFailure {
    switch (status) {
        case "unclear": {
            return "silent";
        }
        case "notConfigured": {
            return "notConfigured";
        }
        case "unauthenticated": {
            return "unauthenticated";
        }
        case "rateLimited": {
            return "rateLimited";
        }
        case "notEntitled": {
            return "notEntitled";
        }
        case "quotaExceeded": {
            return "quotaExceeded";
        }
        default: {
            return "provider";
        }
    }
}

const readAndDiscard = Effect.fn("VoiceEntry.readAndDiscard")(function* readAndDiscard(uri: string) {
    const file = new File(uri);
    const bytes = yield* Effect.tryPromise(() => file.arrayBuffer());
    try {
        file.delete();
    } catch {
        // The OS sweeps the cache; a leftover clip costs only bytes.
    }
    return bytes;
});

const discardClip = (uri: string) => readAndDiscard(uri).pipe(Effect.catchCause(() => Effect.void));

function settledPhaseOf<Context>(
    phase: VoicePhase<Context>,
    messages: readonly VoiceTurnMessage[]
): VoicePhase<Context> {
    if (phase.kind !== "thinking") {
        return phase;
    }
    const answer = messages.find((message) => message.role === "assistant" && message.order === phase.order);
    if (answer === undefined) {
        return phase;
    }
    const proposed = proposedDraftOf(answer);
    if (proposed !== null) {
        if (proposed.draft === null) {
            const said = messages.find((message) => message.role === "user" && message.order === phase.order);
            return { kind: "failed", reason: "unclear", transcript: said?.text ?? null };
        }
        return {
            context: phase.context,
            draft: proposed.draft,
            kind: "review",
            order: phase.order,
            quotes: proposed.quotes ?? [],
        };
    }
    return answer.status === "failed" ? { kind: "failed", reason: "provider", transcript: null } : phase;
}

function lastOrderOf(messages: readonly VoiceTurnMessage[]): number {
    return messages.reduce((last, message) => Math.max(last, message.order), -1);
}

function heardIn(phase: VoicePhase, messages: readonly VoiceTurnMessage[]): string | null {
    const said = (matches: (order: number) => boolean) =>
        messages.find((message) => message.role === "user" && matches(message.order))?.text ?? null;
    switch (phase.kind) {
        case "sending": {
            return said((order) => order > phase.after);
        }
        case "thinking":
        case "review": {
            return said((order) => order === phase.order);
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
        messages: readonly VoiceTurnMessage[];
        request: UseVoiceEntryArgs<Context>["request"];
    }>;
    level: SharedValue<number>;
    meterRef: RefObject<ReturnType<typeof setInterval> | null>;
    queuedClipRef: RefObject<ArrayBuffer | null>;
    recorder: ReturnType<typeof useAudioRecorder>;
    resentRef: RefObject<ArrayBuffer | null>;
    setPhase: (phase: VoicePhase<Context>) => void;
    setSpoke: (spoke: boolean) => void;
    setThreadId: (threadId: string | null) => void;
    speakAbortRef: RefObject<AbortController | null>;
    start: (flow: Effect.Effect<void, unknown>) => void;
    takeRef: RefObject<number>;
    threadRef: RefObject<string | null>;
}

function supersedeTake({
    queuedClipRef,
    speakAbortRef,
    takeRef,
}: Pick<VoicePorts<unknown>, "queuedClipRef" | "speakAbortRef" | "takeRef">) {
    takeRef.current += 1;
    queuedClipRef.current = null;
    speakAbortRef.current?.abort();
    speakAbortRef.current = null;
}

function stopMeter({ level, meterRef }: Pick<VoicePorts<unknown>, "level" | "meterRef">) {
    if (meterRef.current !== null) {
        clearInterval(meterRef.current);
        meterRef.current = null;
    }
    level.set(0);
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

function abandonTake<Context>(ports: VoicePorts<Context>) {
    const take = ports.takeRef.current;
    supersedeTake(ports);
    ports.start(endTake(ports, take, "discard"));
}

function dispatchClip<Context>(ports: VoicePorts<Context>, clip: ArrayBuffer) {
    const id = ports.threadRef.current;
    if (id === null) {
        ports.queuedClipRef.current = clip;
        return;
    }
    ports.start(sendClip(ports, clip, id));
}

const endTake = Effect.fn("VoiceEntry.endTake")(function* endTake<Context>(
    ports: VoicePorts<Context>,
    take: number,
    outcome: "send" | "silent" | "discard",
    onClip?: (clip: ArrayBuffer) => void
) {
    const { endingRef, latest, recorder, setPhase, takeRef } = ports;
    // Claimed before the first yield: a second tap or the silence timer would race this for one recorder.
    if (endingRef.current === take) {
        return;
    }
    endingRef.current = take;
    stopMeter(ports);
    // Never started, or already released by unmount: no clip either way.
    const uri = yield* Effect.tryPromise(() => recorder.stop()).pipe(
        Effect.map(() => recorder.uri),
        Effect.catchCause(() => Effect.succeed(null))
    );
    if (outcome === "discard" || take !== takeRef.current) {
        if (uri) {
            yield* discardClip(uri);
        }
        return;
    }
    if (outcome === "silent" || !uri) {
        if (uri) {
            yield* discardClip(uri);
        }
        setPhase({ kind: "failed", reason: "silent", transcript: null });
        return;
    }
    const clip = yield* readAndDiscard(uri).pipe(Effect.exit);
    if (take !== takeRef.current) {
        return;
    }
    if (Exit.isFailure(clip)) {
        setPhase({ kind: "failed", reason: "provider", transcript: null });
        return;
    }
    setPhase({ after: lastOrderOf(latest.current.messages), clip: clip.value, kind: "sending" });
    if (onClip !== undefined) {
        onClip(clip.value);
    }
});

const openThread = Effect.fn("VoiceEntry.openThread")(function* openThread<Context>(ports: VoicePorts<Context>) {
    const { api, disposedRef, setPhase, setThreadId, threadRef } = ports;
    const started = yield* api.start().pipe(Effect.exit);
    if (Exit.isFailure(started)) {
        if (!disposedRef.current) {
            abandonTake(ports);
            setPhase({ kind: "failed", reason: "offline", transcript: null });
        }
        return null;
    }
    const opened: StartThreadResult = started.value;
    if (disposedRef.current) {
        if (opened.threadId !== null) {
            yield* api.end(opened.threadId).pipe(Effect.catchCause(() => Effect.void));
        }
        return null;
    }
    threadRef.current = opened.threadId;
    setThreadId(opened.threadId);
    if (opened.threadId === null) {
        abandonTake(ports);
        setPhase({
            kind: "failed",
            reason: opened.status === "rateLimited" ? "rateLimited" : "unauthenticated",
            transcript: null,
        });
    }
    return opened.threadId;
});

const sendClip: <Context>(ports: VoicePorts<Context>, clip: ArrayBuffer, id: string) => Effect.Effect<void> = Effect.fn(
    "VoiceEntry.sendClip"
)(function* sendClipTo<Context>(ports: VoicePorts<Context>, clip: ArrayBuffer, id: string) {
    const { api, latest, resentRef, setPhase, speakAbortRef, takeRef } = ports;
    const take = takeRef.current;
    const { context: sentContext, request: sentRequest } = latest.current;
    const controller = new AbortController();
    speakAbortRef.current = controller;
    const result = yield* fromCommand(speakCommand, {
        call: api.speak({ ...sentRequest, audio: clip, threadId: id, today: localIsoDate(new Date()) }),
        signal: controller.signal,
    }).pipe(Effect.exit);
    if (take !== takeRef.current) {
        return;
    }
    if (Exit.isFailure(result)) {
        setPhase({ kind: "failed", reason: "offline", transcript: null });
        return;
    }
    const settled = Option.getOrNull(result.value);
    if (settled === null) {
        // The request may still land a draft on this thread, so a retry must not speak into it.
        dropThread(ports);
        setPhase({ kind: "failed", reason: "timeout", transcript: null });
        return;
    }
    if (settled.status === "ok") {
        const { order } = settled;
        if (order !== null) {
            setPhase({ context: sentContext, kind: "thinking", order });
            return;
        }
    }
    if (settled.status === "invalid") {
        const resent = resentRef.current === clip;
        if (!resent) {
            // The server sweeps threads idle for an hour: resend this clip once on a fresh thread.
            resentRef.current = clip;
            setPhase({ after: -1, clip, kind: "sending" });
            dropThread(ports);
            const reopened = yield* openThread(ports);
            if (reopened !== null && take === takeRef.current) {
                yield* sendClip(ports, clip, reopened);
            }
            return;
        }
    }
    const reason = failureFor(settled.status);
    trackCapturesWall(reason);
    setPhase({ kind: "failed", reason, transcript: settled.transcript });
});

const openAndSend = Effect.fn("VoiceEntry.openAndSend")(function* openAndSend<Context>(ports: VoicePorts<Context>) {
    const id = yield* openThread(ports);
    const queued = ports.queuedClipRef.current;
    if (id !== null && queued !== null) {
        ports.queuedClipRef.current = null;
        ports.start(sendClip(ports, queued, id));
    }
});

const startTake = Effect.fn("VoiceEntry.startTake")(function* startTake<Context>(ports: VoicePorts<Context>) {
    const { level, meterRef, recorder, setPhase, setSpoke, start, takeRef } = ports;
    supersedeTake(ports);
    const take = takeRef.current;
    const current = yield* Effect.tryPromise(() => getRecordingPermissionsAsync());
    const permission = current.granted
        ? current
        : yield* duringHandoff(Effect.tryPromise(() => requestRecordingPermissionsAsync()));
    if (take !== takeRef.current) {
        return;
    }
    setPhase({ kind: "starting" });
    if (!permission.granted) {
        setPhase({ kind: "failed", reason: "denied", transcript: null });
        return;
    }
    const began = yield* Effect.tryPromise(() =>
        setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true })
    ).pipe(
        Effect.andThen(Effect.tryPromise(() => recorder.prepareToRecordAsync())),
        Effect.andThen(
            Effect.try(() => {
                if (take !== takeRef.current) {
                    return false;
                }
                recorder.record();
                return true;
            })
        ),
        Effect.exit
    );
    if (Exit.isFailure(began)) {
        if (take === takeRef.current) {
            setPhase({ kind: "failed", reason: "provider", transcript: null });
        }
        return;
    }
    if (!began.value) {
        return;
    }
    setPhase({ kind: "listening" });
    setSpoke(false);

    let watch = startSilenceWatch(Date.now());
    meterRef.current = setInterval(() => {
        const status = recorder.getStatus();
        const sample = meterToLevel(status.metering);
        level.set(sample);
        const judged = judgeSilence(watch, sample, Date.now());
        if (watch.lastSpeechAt === null && judged.watch.lastSpeechAt !== null) {
            setSpoke(true);
        }
        ({ watch } = judged);
        if (judged.verdict === "keep") {
            return;
        }
        start(
            endTake(ports, take, judged.verdict === "nothingSaid" ? "silent" : "send", (clip) =>
                dispatchClip(ports, clip)
            )
        );
    }, METER_INTERVAL_MS);
});

// Must render inside the Convex provider. The meter polls into a shared value because `useAudioRecorderState` would
// re-render the screen twenty times a second.
export function useVoiceEntry<Context>({
    context,
    request,
    transport,
}: UseVoiceEntryArgs<Context>): UseVoiceEntryResult<Context> {
    const recorder = useAudioRecorder(RECORDING_OPTIONS);
    const level = useSharedValue(0);
    const [phase, setPhase] = useState<VoicePhase<Context>>({ kind: "starting" });
    const [threadId, setThreadId] = useState<string | null>(null);
    const [spoke, setSpoke] = useState(false);
    /** Bumped by every cancel/listenAgain so a stop racing a start cannot land on the wrong take. */
    const takeRef = useRef(0);
    const meterRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const endingRef = useRef<number | null>(null);
    const queuedClipRef = useRef<ArrayBuffer | null>(null);
    const threadRef = useRef<string | null>(null);
    const resentRef = useRef<ArrayBuffer | null>(null);
    const disposedRef = useRef(false);
    const speakAbortRef = useRef<AbortController | null>(null);
    const runFlow = useAtomCommand(voidFlowCommand);
    const start = (flow: Effect.Effect<void, unknown>) => {
        void runFlow(logged("Voice entry failed")(flow));
    };
    const [api] = useState(() => transport ?? voiceThreadTransport());

    const { results: messages } = useUIMessages(VOICE_TURNS_QUERY, threadId === null ? "skip" : { threadId }, {
        initialNumItems: TURNS_PAGE,
        stream: true,
    });

    const latest = useLatest({ context, messages, request });

    const ports: VoicePorts<Context> = {
        api,
        disposedRef,
        endingRef,
        latest,
        level,
        meterRef,
        queuedClipRef,
        recorder,
        resentRef,
        setPhase,
        setSpoke,
        setThreadId,
        speakAbortRef,
        start,
        takeRef,
        threadRef,
    };

    const openFirstThread = useEffectEvent(() => start(openAndSend(ports)));
    const endThreadOnUnmount = useEffectEvent(() => {
        const id = threadRef.current;
        if (id !== null) {
            start(api.end(id).pipe(Effect.catchCause(() => Effect.void)));
        }
    });
    const startFirstTake = useEffectEvent(() => start(startTake(ports)));
    const endFirstTake = useEffectEvent(() => {
        supersedeTake(ports);
        stopMeter(ports);
    });
    // oxlint-disable-next-line outlayr/react-effect-budget -- opens the Convex voice thread and starts the recorder while the screen is mounted; the cleanup ends the thread and stops the meter
    useEffect(() => {
        let disposed = false;
        disposedRef.current = false;
        queueMicrotask(() => {
            if (!disposedRef.current) {
                openFirstThread();
            }
        });
        queueMicrotask(() => {
            if (!disposed) {
                startFirstTake();
            }
        });
        return () => {
            disposedRef.current = true;
            endThreadOnUnmount();
            disposed = true;
            endFirstTake();
            // Never touch the recorder here: `useAudioRecorder` already released it, and reading `isRecording` throws.
        };
    }, []);

    const settledPhase = settledPhaseOf(phase, messages);
    if (settledPhase !== phase) {
        setPhase(settledPhase);
    }

    const turns = voiceTurnsOf(messages);

    const heard = heardIn(settledPhase, messages);

    const finish = () => {
        if (phase.kind === "listening") {
            start(endTake(ports, takeRef.current, "send", (clip) => dispatchClip(ports, clip)));
        }
    };

    const cancel = () => {
        const take = takeRef.current;
        supersedeTake(ports);
        if (phase.kind === "listening" || phase.kind === "starting") {
            start(endTake(ports, take, "discard"));
        }
    };

    const listenAgain = () => {
        if (threadRef.current === null) {
            start(openAndSend(ports));
        }
        start(startTake(ports));
    };

    return { cancel, finish, heard, level, listenAgain, phase: settledPhase, spoke, turns };
}
