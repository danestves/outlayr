import type { StreamSession } from "@outlayr/backend/confect/voiceEntry.spec";
import { File } from "expo-file-system";
import { useRef, useState } from "react";
import { AudioManager, AudioRecorder, FileFormat, FilePreset } from "react-native-audio-api";
import { useSharedValue } from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";

import { meterToLevel } from "@/domain/voice-entry";
import { useLatest, useOnUnmount } from "@/lib/lifecycle";
import { openAiProtocol } from "@/lib/realtime-openai";
import { scribeProtocol } from "@/lib/realtime-scribe";
import { openTranscriptStream, TranscriptStreamError } from "@/lib/transcript-stream";
import type { TranscriptProtocol, TranscriptStream } from "@/lib/transcript-stream";

const CHUNK_MS = 100;
const PCM16_MAX = 32_767;
const CLIP_METER_RATE = 16_000;

export type RealtimeStart = "started" | "denied" | "failed";

interface RealtimeTranscriptOptions {
    language: string;
    /** Every chunk, about ten a second, with the same 0..1 scale as `level`: feed `judgeSilence` from here. */
    onLevel?: (level: number, at: number) => void;
    /** A stream failure while recording. Failures during `finish` reject its promise instead. */
    onError?: (error: TranscriptStreamError) => void;
}

export type Take =
    | { readonly kind: "transcript"; readonly text: string }
    | { readonly kind: "clip"; readonly audio: ArrayBuffer };

export interface RealtimeTranscript {
    /** The words heard so far, repainted at most once per animation frame. */
    partial: string;
    level: SharedValue<number>;
    start: (session: StreamSession) => Promise<RealtimeStart>;
    finish: () => Promise<Take>;
    cancel: () => void;
}

interface Session {
    recorder: AudioRecorder;
    stream: TranscriptStream | null;
}

function protocolFor(session: Exclude<StreamSession, { kind: "clip" }>, language: string): TranscriptProtocol {
    return session.kind === "elevenlabs"
        ? scribeProtocol({ language, model: session.model, token: session.token })
        : openAiProtocol(session);
}

function resample(samples: Float32Array, from: number, to: number): Float32Array {
    if (from === to) {
        return samples;
    }
    const ratio = from / to;
    const out = new Float32Array(Math.floor(samples.length / ratio));
    for (let at = 0; at < out.length; at += 1) {
        const position = at * ratio;
        const low = Math.floor(position);
        const high = Math.min(low + 1, samples.length - 1);
        out[at] = (samples[low] ?? 0) + ((samples[high] ?? 0) - (samples[low] ?? 0)) * (position - low);
    }
    return out;
}

function toPcm16(samples: Float32Array) {
    const pcm = new Int16Array(samples.length);
    let energy = 0;
    for (let at = 0; at < samples.length; at += 1) {
        const clamped = Math.max(-1, Math.min(1, samples[at] ?? 0));
        energy += clamped * clamped;
        pcm[at] = Math.round(clamped * PCM16_MAX);
    }
    return { pcm: new Uint8Array(pcm.buffer), rms: Math.sqrt(energy / Math.max(1, samples.length)) };
}

async function openMicrophone(recorder: AudioRecorder, overtaken: () => boolean): Promise<boolean> {
    try {
        await AudioManager.setAudioSessionActivity(true);
        if (overtaken()) {
            return false;
        }
        const started = await recorder.start();
        return !overtaken() && started.status !== "error";
    } catch {
        return false;
    }
}

const fileOf = (path: string) => new File(path.startsWith("file://") ? path : `file://${path}`);

function discard(paths: readonly string[]) {
    for (const path of paths) {
        try {
            fileOf(path).delete();
        } catch {
            continue;
        }
    }
}

async function readClip(paths: readonly string[]): Promise<ArrayBuffer> {
    const [path] = paths;
    if (path === undefined) {
        throw new TranscriptStreamError({ message: "The recording was not saved.", reason: "provider" });
    }
    try {
        const bytes = await fileOf(path).bytes();
        return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    } finally {
        discard(paths);
    }
}

async function drain(session: Session, release: (session: Session) => Promise<readonly string[]>, done: () => void) {
    try {
        const paths = await release(session);
        if (session.stream === null) {
            return { audio: await readClip(paths), kind: "clip" as const };
        }
        return { kind: "transcript" as const, text: await session.stream.finish() };
    } finally {
        session.stream?.close();
        done();
    }
}

export function useRealtimeTranscript({ language, onError, onLevel }: RealtimeTranscriptOptions): RealtimeTranscript {
    const [partial, setPartial] = useState("");
    const level = useSharedValue(0);
    const sessionRef = useRef<Session | null>(null);
    /** Bumped by every start and cancel, so a start that a cancel overtook never opens the microphone. */
    const startsRef = useRef(0);
    const frameRef = useRef<number | null>(null);
    const latestPartial = useRef("");
    const onLevelRef = useLatest(onLevel);
    const onErrorRef = useLatest(onError);

    const paintPartial = (text: string) => {
        latestPartial.current = text;
        if (frameRef.current !== null) {
            return;
        }
        frameRef.current = requestAnimationFrame(() => {
            frameRef.current = null;
            setPartial(latestPartial.current);
        });
    };

    const release = async (session: Session): Promise<readonly string[]> => {
        session.recorder.clearOnAudioReady();
        session.recorder.clearOnError();
        const stopped = session.recorder.isRecording() ? await session.recorder.stop() : null;
        // A newer take may have claimed the audio session while the recorder stopped.
        if (sessionRef.current === null) {
            await AudioManager.setAudioSessionActivity(false);
        }
        return stopped?.status === "success" ? stopped.paths : [];
    };

    const reset = () => {
        if (frameRef.current !== null) {
            cancelAnimationFrame(frameRef.current);
            frameRef.current = null;
        }
        latestPartial.current = "";
        setPartial("");
        level.set(0);
    };

    const cancel = () => {
        startsRef.current += 1;
        const session = sessionRef.current;
        sessionRef.current = null;
        reset();
        if (session) {
            session.stream?.close();
            void release(session).then(discard);
        }
    };

    const start = async (take: StreamSession): Promise<RealtimeStart> => {
        if (sessionRef.current) {
            return "failed";
        }
        startsRef.current += 1;
        const attempt = startsRef.current;
        const permission = await AudioManager.requestRecordingPermissions();
        if (permission !== "Granted") {
            return "denied";
        }
        if (attempt !== startsRef.current) {
            return "failed";
        }
        const recorder = new AudioRecorder();
        let starting = true;
        let failedEarly = false;
        const protocol = take.kind === "clip" ? null : protocolFor(take, language);
        const stream =
            protocol &&
            openTranscriptStream(protocol, {
                onError: (error) => {
                    if (starting) {
                        failedEarly = true;
                    } else {
                        onErrorRef.current?.(error);
                    }
                },
                onPartial: paintPartial,
            });
        const sampleRate = protocol?.sampleRate ?? CLIP_METER_RATE;
        if (take.kind === "clip") {
            try {
                recorder.enableFileOutput({ channelCount: 1, format: FileFormat.M4A, preset: FilePreset.Low });
            } catch {
                return "failed";
            }
        }
        const session: Session = { recorder, stream };
        sessionRef.current = session;
        reset();

        recorder.onAudioReady(
            {
                bufferLength: (sampleRate * CHUNK_MS) / 1000,
                channelCount: 1,
                sampleRate,
            },
            ({ buffer }) => {
                const { pcm, rms } = toPcm16(resample(buffer.getChannelData(0), buffer.sampleRate, sampleRate));
                const sample = meterToLevel(20 * Math.log10(rms));
                level.set(sample);
                stream?.send(pcm);
                onLevelRef.current?.(sample, Date.now());
            }
        );
        recorder.onError(() => {
            if (starting) {
                failedEarly = true;
            } else {
                onErrorRef.current?.(
                    new TranscriptStreamError({ message: "The microphone failed.", reason: "provider" })
                );
            }
        });

        AudioManager.setSystemOptions({
            ios: { category: "playAndRecord", mode: "default", options: ["defaultToSpeaker", "allowBluetoothHFP"] },
        });
        const overtaken = () => attempt !== startsRef.current;
        const opened = await openMicrophone(recorder, overtaken);
        starting = false;
        if (opened && !failedEarly && !overtaken()) {
            return "started";
        }
        if (sessionRef.current === session) {
            cancel();
        } else {
            session.stream?.close();
            discard(await release(session));
        }
        return "failed";
    };

    const finish = async (): Promise<Take> => {
        const session = sessionRef.current;
        if (!session) {
            throw new TranscriptStreamError({ message: "Nothing is being recorded.", reason: "provider" });
        }
        sessionRef.current = null;
        return drain(session, release, reset);
    };

    useOnUnmount(cancel);

    return { cancel, finish, level, partial, start };
}
