import { useUIMessages } from "@convex-dev/agent/react";
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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import type { VoiceTurn } from "@/domain/voice-entry";
import { duringHandoff } from "@/lib/app-handoff";
import { VOICE_TURNS_QUERY, voiceThreadTransport } from "@/lib/convex";
import type { SpeakRequest, StartThreadResult, VoiceDraft, VoiceQuote, VoiceThreadTransport } from "@/lib/convex";
import { withTimeout } from "@/lib/with-timeout";

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
const REQUEST_TIMEOUT_MS = 25_000;
const TURNS_PAGE = 40;

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
    const sentRef = useRef<ArrayBuffer | null>(null);
    const threadRef = useRef<string | null>(null);
    const resentRef = useRef<ArrayBuffer | null>(null);
    const disposedRef = useRef(false);
    const lastOrderRef = useRef(-1);
    const [api] = useState(() => transport ?? voiceThreadTransport());

    const { results: messages } = useUIMessages(VOICE_TURNS_QUERY, threadId === null ? "skip" : { threadId }, {
        initialNumItems: TURNS_PAGE,
        stream: true,
    });

    useEffect(() => {
        lastOrderRef.current = messages.reduce((last, message) => Math.max(last, message.order), -1);
    }, [messages]);

    const stopMeter = useCallback(() => {
        if (meterRef.current !== null) {
            clearInterval(meterRef.current);
            meterRef.current = null;
        }
        level.set(0);
    }, [level]);

    const endTake = useCallback(
        async (take: number, outcome: "send" | "silent" | "discard") => {
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
                    setPhase({ after: lastOrderRef.current, clip, kind: "sending" });
                }
            } catch {
                if (take === takeRef.current) {
                    setPhase({ kind: "failed", reason: "provider", transcript: null });
                }
            }
        },
        [recorder, stopMeter]
    );

    const abandonTake = useCallback(() => {
        const take = takeRef.current;
        takeRef.current += 1;
        void endTake(take, "discard");
    }, [endTake]);

    const openThread = useCallback(async () => {
        let opened: StartThreadResult;
        try {
            opened = await api.start();
        } catch {
            if (!disposedRef.current) {
                abandonTake();
                setPhase({ kind: "failed", reason: "offline", transcript: null });
            }
            return;
        }
        if (disposedRef.current) {
            if (opened.threadId !== null) {
                await api.end(opened.threadId).catch(() => null);
            }
            return;
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
    }, [abandonTake, api]);

    const dropThread = useCallback(() => {
        const id = threadRef.current;
        threadRef.current = null;
        setThreadId(null);
        if (id !== null) {
            api.end(id).catch(() => null);
        }
    }, [api]);

    useEffect(() => {
        disposedRef.current = false;
        void Promise.resolve().then(() => (disposedRef.current ? undefined : openThread()));
        return () => {
            disposedRef.current = true;
            const id = threadRef.current;
            if (id !== null) {
                api.end(id).catch(() => null);
            }
        };
    }, [api, openThread]);

    const startTake = useCallback(async () => {
        takeRef.current += 1;
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
            void endTake(take, judged.verdict === "nothingSaid" ? "silent" : "send");
        }, METER_INTERVAL_MS);
    }, [endTake, level, recorder]);

    useEffect(() => {
        let disposed = false;
        void Promise.resolve().then(() => (disposed ? undefined : startTake()));
        return () => {
            disposed = true;
            takeRef.current += 1;
            stopMeter();
            // Never touch the recorder here: `useAudioRecorder` already released it, and reading `isRecording` throws.
        };
    }, [startTake, stopMeter]);

    useEffect(() => {
        if (phase.kind !== "sending" || threadId === null || sentRef.current === phase.clip) {
            return;
        }
        sentRef.current = phase.clip;
        const take = takeRef.current;
        const { clip } = phase;
        void (async () => {
            try {
                const settled = await withTimeout(
                    api.speak({ ...request, audio: clip, threadId, today: localIsoDate(new Date()) }),
                    REQUEST_TIMEOUT_MS,
                    "timeout" as const
                );
                if (take !== takeRef.current) {
                    return;
                }
                if (settled === "timeout") {
                    // The request may still land a draft on this thread, so a retry must not speak into it.
                    dropThread();
                    setPhase({ kind: "failed", reason: "timeout", transcript: null });
                    return;
                }
                if (settled.status === "ok") {
                    const { order } = settled;
                    if (order !== null) {
                        setPhase({ context, kind: "thinking", order });
                        return;
                    }
                }
                if (settled.status === "invalid") {
                    const resent = resentRef.current === clip;
                    if (!resent) {
                        // The server sweeps threads idle for an hour: resend this clip once on a fresh thread.
                        resentRef.current = clip;
                        sentRef.current = null;
                        setPhase({ after: -1, clip, kind: "sending" });
                        dropThread();
                        void openThread();
                        return;
                    }
                }
                setPhase({ kind: "failed", reason: failureFor(settled.status), transcript: settled.transcript });
            } catch {
                if (take === takeRef.current) {
                    setPhase({ kind: "failed", reason: "offline", transcript: null });
                }
            }
        })();
    }, [api, context, dropThread, openThread, phase, request, threadId]);

    const settledPhase = useMemo<VoicePhase<Context>>(() => {
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
    }, [messages, phase]);

    const turns = useMemo(() => voiceTurnsOf(messages), [messages]);

    const heard = useMemo(() => {
        const said = (matches: (order: number) => boolean) =>
            messages.find((message) => message.role === "user" && matches(message.order))?.text ?? null;
        switch (settledPhase.kind) {
            case "sending": {
                return said((order) => order > settledPhase.after);
            }
            case "thinking":
            case "review": {
                return said((order) => order === settledPhase.order);
            }
            case "failed": {
                return settledPhase.transcript;
            }
            default: {
                return null;
            }
        }
    }, [messages, settledPhase]);

    const finish = useCallback(() => {
        if (phase.kind === "listening") {
            void endTake(takeRef.current, "send");
        }
    }, [endTake, phase.kind]);

    const cancel = useCallback(() => {
        const take = takeRef.current;
        takeRef.current += 1;
        if (phase.kind === "listening" || phase.kind === "starting") {
            void endTake(take, "discard");
        }
    }, [endTake, phase.kind]);

    const listenAgain = useCallback(() => {
        if (threadRef.current === null) {
            void openThread();
        }
        void startTake();
    }, [openThread, startTake]);

    return { cancel, finish, heard, level, listenAgain, phase: settledPhase, spoke, turns };
}
