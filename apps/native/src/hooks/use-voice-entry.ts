import { useUIMessages } from "@convex-dev/agent/react";
import type * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as AsyncResult from "effect/reactivity/AsyncResult";
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
import { duringHandoff } from "@/lib/app-handoff";
import { VOICE_TURNS_QUERY, voiceThreadTransport } from "@/lib/convex";
import type { SpeakRequest, StartThreadResult, VoiceDraft, VoiceQuote, VoiceThreadTransport } from "@/lib/convex";
import { useLatest } from "@/lib/use-latest";
import { createCommand, SILENT } from "@/state/atom-command";
import { timedCaptureCommand, VOICE_SPEAK_TIMEOUT } from "@/state/capture-commands";
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

const startThreadCommand = createCommand({
    execute: (api: VoiceThreadTransport) => api.start(),
    label: "capture:voice-start-thread",
});

const endThreadCommand = createCommand({
    execute: (input: { api: VoiceThreadTransport; threadId: string }) => input.api.end(input.threadId),
    label: "capture:voice-end-thread",
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

async function readAndDiscard(uri: string): Promise<ArrayBuffer> {
    const file = new File(uri);
    const bytes = await file.arrayBuffer();
    try {
        file.delete();
    } catch {
        // The OS sweeps the cache; a leftover clip costs only bytes.
    }
    return bytes;
}

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
    const speak = useAtomCommand(speakCommand, SILENT);
    const startThread = useAtomCommand(startThreadCommand, SILENT);
    const endThread = useAtomCommand(endThreadCommand, SILENT);
    const [api] = useState(() => transport ?? voiceThreadTransport());

    const { results: messages } = useUIMessages(VOICE_TURNS_QUERY, threadId === null ? "skip" : { threadId }, {
        initialNumItems: TURNS_PAGE,
        stream: true,
    });

    const latest = useLatest({ context, messages, request });

    const supersedeTake = () => {
        takeRef.current += 1;
        queuedClipRef.current = null;
        speakAbortRef.current?.abort();
        speakAbortRef.current = null;
    };

    const stopMeter = () => {
        if (meterRef.current !== null) {
            clearInterval(meterRef.current);
            meterRef.current = null;
        }
        level.set(0);
    };

    const endTake = async (
        take: number,
        outcome: "send" | "silent" | "discard",
        onClip?: (clip: ArrayBuffer) => void
    ) => {
        // Claimed before the first await: a second tap or the silence timer would race this for one recorder.
        if (endingRef.current === take) {
            return;
        }
        endingRef.current = take;
        stopMeter();
        let uri: string | null = null;
        try {
            await recorder.stop();
            ({ uri } = recorder);
        } catch {
            // Never started, or already released by unmount: no clip either way.
        }
        if (outcome === "discard" || take !== takeRef.current) {
            if (uri) {
                await readAndDiscard(uri).catch(() => null);
            }
            return;
        }
        if (outcome === "silent" || !uri) {
            if (uri) {
                await readAndDiscard(uri).catch(() => null);
            }
            setPhase({ kind: "failed", reason: "silent", transcript: null });
            return;
        }
        try {
            const clip = await readAndDiscard(uri);
            if (take === takeRef.current) {
                setPhase({ after: lastOrderOf(latest.current.messages), clip, kind: "sending" });
                if (onClip !== undefined) {
                    onClip(clip);
                }
            }
        } catch {
            if (take === takeRef.current) {
                setPhase({ kind: "failed", reason: "provider", transcript: null });
            }
        }
    };

    const abandonTake = () => {
        const take = takeRef.current;
        supersedeTake();
        void endTake(take, "discard");
    };

    const dropThread = () => {
        const id = threadRef.current;
        threadRef.current = null;
        setThreadId(null);
        if (id !== null) {
            void endThread({ api, threadId: id });
        }
    };

    const openThread = async (): Promise<string | null> => {
        const started = await startThread(api);
        if (AsyncResult.isFailure(started)) {
            if (!disposedRef.current) {
                abandonTake();
                setPhase({ kind: "failed", reason: "offline", transcript: null });
            }
            return null;
        }
        const opened: StartThreadResult = started.value;
        if (disposedRef.current) {
            if (opened.threadId !== null) {
                await endThread({ api, threadId: opened.threadId });
            }
            return null;
        }
        threadRef.current = opened.threadId;
        setThreadId(opened.threadId);
        if (opened.threadId === null) {
            abandonTake();
            setPhase({
                kind: "failed",
                reason: opened.status === "rateLimited" ? "rateLimited" : "unauthenticated",
                transcript: null,
            });
        }
        return opened.threadId;
    };

    const sendClip = async (clip: ArrayBuffer, id: string) => {
        const take = takeRef.current;
        const { context: sentContext, request: sentRequest } = latest.current;
        const controller = new AbortController();
        speakAbortRef.current = controller;
        const result = await speak({
            call: api.speak({ ...sentRequest, audio: clip, threadId: id, today: localIsoDate(new Date()) }),
            signal: controller.signal,
        });
        if (take !== takeRef.current) {
            return;
        }
        if (AsyncResult.isFailure(result)) {
            setPhase({ kind: "failed", reason: "offline", transcript: null });
            return;
        }
        const settled = Option.getOrNull(result.value);
        if (settled === null) {
            // The request may still land a draft on this thread, so a retry must not speak into it.
            dropThread();
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
                dropThread();
                const reopened = await openThread();
                if (reopened !== null && take === takeRef.current) {
                    await sendClip(clip, reopened);
                }
                return;
            }
        }
        setPhase({ kind: "failed", reason: failureFor(settled.status), transcript: settled.transcript });
    };

    const dispatchClip = (clip: ArrayBuffer) => {
        const id = threadRef.current;
        if (id === null) {
            queuedClipRef.current = clip;
            return;
        }
        void sendClip(clip, id);
    };

    const openAndSend = async () => {
        const id = await openThread();
        const queued = queuedClipRef.current;
        if (id !== null && queued !== null) {
            queuedClipRef.current = null;
            void sendClip(queued, id);
        }
    };

    const startTake = async () => {
        supersedeTake();
        const take = takeRef.current;
        const current = await getRecordingPermissionsAsync();
        const permission = current.granted ? current : await duringHandoff(requestRecordingPermissionsAsync);
        if (take !== takeRef.current) {
            return;
        }
        setPhase({ kind: "starting" });
        if (!permission.granted) {
            setPhase({ kind: "failed", reason: "denied", transcript: null });
            return;
        }
        try {
            await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
            await recorder.prepareToRecordAsync();
            if (take !== takeRef.current) {
                return;
            }
            recorder.record();
        } catch {
            if (take === takeRef.current) {
                setPhase({ kind: "failed", reason: "provider", transcript: null });
            }
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
            void endTake(take, judged.verdict === "nothingSaid" ? "silent" : "send", dispatchClip);
        }, METER_INTERVAL_MS);
    };

    const openFirstThread = useEffectEvent(() => openAndSend());
    const endThreadOnUnmount = useEffectEvent((id: string) => {
        void endThread({ api, threadId: id });
    });
    const startFirstTake = useEffectEvent(() => startTake());
    const endFirstTake = useEffectEvent(() => {
        supersedeTake();
        stopMeter();
    });
    // oxlint-disable-next-line outlayr/react-effect-budget -- opens the Convex voice thread and starts the recorder while the screen is mounted; the cleanup ends the thread and stops the meter
    useEffect(() => {
        let disposed = false;
        disposedRef.current = false;
        void Promise.resolve().then(() => (disposedRef.current ? undefined : openFirstThread()));
        void Promise.resolve().then(() => (disposed ? undefined : startFirstTake()));
        return () => {
            disposedRef.current = true;
            const id = threadRef.current;
            if (id !== null) {
                endThreadOnUnmount(id);
            }
            disposed = true;
            endFirstTake();
            // Never touch the recorder here: `useAudioRecorder` already released it, and reading `isRecording` throws.
        };
    }, []);

    const settledPhase = settledPhaseOf(phase, messages);

    const turns = voiceTurnsOf(messages);

    const heard = heardIn(settledPhase, messages);

    const finish = () => {
        if (phase.kind === "listening") {
            void endTake(takeRef.current, "send", dispatchClip);
        }
    };

    const cancel = () => {
        const take = takeRef.current;
        supersedeTake();
        if (phase.kind === "listening" || phase.kind === "starting") {
            void endTake(take, "discard");
        }
    };

    const listenAgain = () => {
        if (threadRef.current === null) {
            void openAndSend();
        }
        void startTake();
    };

    return { cancel, finish, heard, level, listenAgain, phase: settledPhase, spoke, turns };
}
