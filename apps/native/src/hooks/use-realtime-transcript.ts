import { useEffect, useRef, useState } from "react";
import { AudioManager, AudioRecorder } from "react-native-audio-api";
import { useSharedValue } from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";

import { meterToLevel } from "@/domain/voice-entry";
import { openScribeStream, SCRIBE_SAMPLE_RATE, ScribeStreamError } from "@/lib/realtime-scribe";
import type { ScribeStream } from "@/lib/realtime-scribe";
import { useLatest } from "@/lib/use-latest";

const CHUNK_MS = 100;
const PCM16_MAX = 32_767;

export type RealtimeStart = "started" | "denied" | "failed";

interface RealtimeTranscriptOptions {
    language: string;
    /** Every chunk, about ten a second, with the same 0..1 scale as `level`: feed `judgeSilence` from here. */
    onLevel?: (level: number, at: number) => void;
    /** A stream failure while recording. Failures during `finish` reject its promise instead. */
    onError?: (error: ScribeStreamError) => void;
}

export interface RealtimeTranscript {
    /** The words heard so far, repainted at most once per animation frame. */
    partial: string;
    level: SharedValue<number>;
    start: (token: string) => Promise<RealtimeStart>;
    finish: () => Promise<string>;
    cancel: () => void;
}

interface Session {
    recorder: AudioRecorder;
    stream: ScribeStream;
}

function resample(samples: Float32Array, from: number): Float32Array {
    if (from === SCRIBE_SAMPLE_RATE) {
        return samples;
    }
    const ratio = from / SCRIBE_SAMPLE_RATE;
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

async function drain(session: Session, release: (session: Session) => Promise<void>, done: () => void) {
    try {
        await release(session);
        return await session.stream.finish();
    } finally {
        session.stream.close();
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

    const release = async (session: Session) => {
        session.recorder.clearOnAudioReady();
        session.recorder.clearOnError();
        if (session.recorder.isRecording()) {
            await session.recorder.stop();
        }
        // A newer take may have claimed the audio session while the recorder stopped.
        if (sessionRef.current === null) {
            await AudioManager.setAudioSessionActivity(false);
        }
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
            session.stream.close();
            void release(session);
        }
    };

    const start = async (token: string): Promise<RealtimeStart> => {
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
        const stream = openScribeStream({
            language,
            onCommitted: () => undefined,
            onError: (error) => {
                if (starting) {
                    failedEarly = true;
                } else {
                    onErrorRef.current?.(error);
                }
            },
            onPartial: paintPartial,
            token,
        });
        const session: Session = { recorder, stream };
        sessionRef.current = session;
        reset();

        recorder.onAudioReady(
            {
                bufferLength: (SCRIBE_SAMPLE_RATE * CHUNK_MS) / 1000,
                channelCount: 1,
                sampleRate: SCRIBE_SAMPLE_RATE,
            },
            ({ buffer }) => {
                const { pcm, rms } = toPcm16(resample(buffer.getChannelData(0), buffer.sampleRate));
                const sample = meterToLevel(20 * Math.log10(rms));
                level.set(sample);
                stream.send(pcm);
                onLevelRef.current?.(sample, Date.now());
            }
        );
        recorder.onError(() => {
            if (starting) {
                failedEarly = true;
            } else {
                onErrorRef.current?.(new ScribeStreamError({ message: "The microphone failed.", reason: "provider" }));
            }
        });

        AudioManager.setSystemOptions({
            ios: { category: "playAndRecord", mode: "default", options: ["defaultToSpeaker", "allowBluetoothHFP"] },
        });
        const opened = await openMicrophone(recorder, () => attempt !== startsRef.current);
        starting = false;
        if (opened && !failedEarly) {
            return "started";
        }
        if (sessionRef.current === session) {
            cancel();
        } else {
            session.stream.close();
            await release(session);
        }
        return "failed";
    };

    const finish = async (): Promise<string> => {
        const session = sessionRef.current;
        if (!session) {
            throw new ScribeStreamError({ message: "Nothing is being recorded.", reason: "provider" });
        }
        sessionRef.current = null;
        return drain(session, release, reset);
    };

    const cancelLatest = useLatest(cancel);
    // oxlint-disable-next-line outlayr/react-effect-budget -- the only way to close the microphone and socket when the screen unmounts mid-recording
    useEffect(() => () => cancelLatest.current(), [cancelLatest]);

    return { cancel, finish, level, partial, start };
}
