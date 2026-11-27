import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import { meterToLevel } from "./voice-entry";

export const SCRIBE_SAMPLE_RATE = 16_000;
// apps/voice-relay forwards the socket so ElevenLabs never sees the browser, as the privacy policy says of the phone.
const SCRIBE_RELAY = "wss://voice.tryoutlayr.com";
const SCRIBE_LANGUAGES = ["en", "de", "es", "fr", "pt"];
const CURRENCY_KEYTERMS = [
    "dollars",
    "dólares",
    "bucks",
    "euros",
    "pounds",
    "Pfund",
    "reais",
    "reales",
    "bolívares",
    "bolivars",
    "pesos",
];
const CHUNKS_PER_SECOND = 10;
const PCM16_MAX = 32_767;
const COMMIT_TIMEOUT_MS = 10_000;
const OPEN_TIMEOUT_MS = 5000;

export type MicFailure = "denied" | "insecure" | "noMicrophone" | "failed";
export type ScribeFailure = "offline" | "provider" | "silent" | "unauthenticated";

export class ScribeError extends Schema.TaggedError<ScribeError>()("ScribeError", {
    message: Schema.String,
    reason: Schema.Literals(["offline", "provider", "silent", "unauthenticated"]),
}) {}

const ServerErrorType = Schema.Literals([
    "error",
    "auth_error",
    "quota_exceeded",
    "commit_throttled",
    "unaccepted_terms",
    "rate_limited",
    "queue_overflow",
    "resource_exhausted",
    "session_time_limit_exceeded",
    "input_error",
    "invalid_request",
    "chunk_size_exceeded",
    "insufficient_audio_activity",
    "transcriber_error",
]);

const ServerMessage = Schema.Union([
    Schema.Struct({ message_type: Schema.Literal("session_started") }),
    Schema.Struct({ message_type: Schema.Literal("partial_transcript"), text: Schema.String }),
    Schema.Struct({ message_type: Schema.Literal("committed_transcript"), text: Schema.String }),
    Schema.Struct({ message_type: Schema.Literal("committed_transcript_with_timestamps"), text: Schema.String }),
    Schema.Struct({ error: Schema.optional(Schema.String), message_type: ServerErrorType }),
]);

const decodeServerMessage = Schema.decodeUnknownOption(Schema.fromJsonString(ServerMessage));
const isErrorType = Schema.is(ServerErrorType);

// Scribe's quota and rate limits are the provider's account, not the user's captures, so they read as a provider fault.
const REASON_BY_ERROR: Record<typeof ServerErrorType.Type, ScribeFailure> = {
    auth_error: "unauthenticated",
    chunk_size_exceeded: "provider",
    commit_throttled: "provider",
    error: "provider",
    input_error: "provider",
    insufficient_audio_activity: "silent",
    invalid_request: "provider",
    queue_overflow: "provider",
    quota_exceeded: "provider",
    rate_limited: "provider",
    resource_exhausted: "provider",
    session_time_limit_exceeded: "provider",
    transcriber_error: "provider",
    unaccepted_terms: "unauthenticated",
};

export function scribeUrl(token: string, language: string): string {
    const [primary = language] = language.split("-");
    const query = new URLSearchParams({
        audio_format: `pcm_${SCRIBE_SAMPLE_RATE}`,
        commit_strategy: "manual",
        language_code: primary,
        model_id: "scribe_v3_live",
        token,
    });
    for (const other of SCRIBE_LANGUAGES) {
        if (other !== primary) {
            query.append("secondary_languages", other);
        }
    }
    for (const keyterm of CURRENCY_KEYTERMS) {
        query.append("keyterms", keyterm);
    }
    return `${SCRIBE_RELAY}/v1/speech-to-text/realtime?${query.toString()}`;
}

function pcmToBase64(pcm: Uint8Array): string {
    let binary = "";
    const STEP = 32_768;
    for (let at = 0; at < pcm.length; at += STEP) {
        binary += String.fromCodePoint(...pcm.subarray(at, at + STEP));
    }
    return btoa(binary);
}

const chunkMessage = (pcm: Uint8Array, commit: boolean) =>
    JSON.stringify({
        audio_base_64: pcmToBase64(pcm),
        commit,
        message_type: "input_audio_chunk",
        sample_rate: SCRIBE_SAMPLE_RATE,
    });

export interface ScribeStream {
    /** Little-endian PCM16 mono at 16 kHz. Chunks sent before the socket opens are held, then flushed in order. */
    send: (pcm: Uint8Array) => void;
    /** Commits what was said and resolves with the whole text. Rejects with a `ScribeError`. */
    finish: () => Promise<string>;
    close: () => void;
}

/** The phone's socket (apps/native/src/lib/realtime-scribe.ts) on the browser's WebSocket. */
export function openScribeStream(options: {
    language: string;
    onError: (error: ScribeError) => void;
    /** Everything heard so far: committed segments plus the one in progress. */
    onPartial: (text: string) => void;
    token: string;
}): ScribeStream {
    const socket = new WebSocket(scribeUrl(options.token, options.language));
    const held: string[] = [];
    const committed: string[] = [];
    let failure: ScribeError | null = null;
    let closed = false;
    let finishing: { reject: (error: ScribeError) => void; resolve: (text: string) => void; timer: number } | null =
        null;

    const fail = (error: ScribeError) => {
        if (failure || closed) {
            return;
        }
        failure = error;
        if (finishing) {
            clearTimeout(finishing.timer);
            finishing.reject(error);
            finishing = null;
        } else {
            options.onError(error);
        }
        socket.close();
    };
    const write = (message: string) => {
        if (socket.readyState === WebSocket.OPEN) {
            socket.send(message);
        } else {
            held.push(message);
        }
    };
    const openTimer = setTimeout(
        () => fail(new ScribeError({ message: "The transcription socket never opened.", reason: "offline" })),
        OPEN_TIMEOUT_MS
    );

    socket.addEventListener("open", () => {
        clearTimeout(openTimer);
        for (const message of held.splice(0)) {
            socket.send(message);
        }
    });
    socket.addEventListener("message", (event) => {
        const decoded = closed ? Option.none() : decodeServerMessage(event.data);
        if (Option.isNone(decoded)) {
            return;
        }
        const message = decoded.value;
        if (message.message_type === "partial_transcript") {
            options.onPartial([...committed, message.text.trim()].join(" ").trim());
        } else if (message.message_type === "committed_transcript") {
            const text = message.text.trim();
            if (text) {
                committed.push(text);
                options.onPartial(committed.join(" "));
            }
            if (finishing) {
                clearTimeout(finishing.timer);
                finishing.resolve(committed.join(" "));
                finishing = null;
            }
        } else if (isErrorType(message.message_type)) {
            const type = message.message_type;
            fail(
                new ScribeError({
                    message: "error" in message ? (message.error ?? type) : type,
                    reason: REASON_BY_ERROR[type],
                })
            );
        }
    });
    socket.addEventListener("error", () =>
        fail(new ScribeError({ message: "The transcription socket failed.", reason: "offline" }))
    );
    socket.addEventListener("close", () =>
        fail(new ScribeError({ message: "The transcription socket closed.", reason: "offline" }))
    );

    return {
        close: () => {
            closed = true;
            clearTimeout(openTimer);
            if (finishing) {
                clearTimeout(finishing.timer);
                finishing = null;
            }
            socket.close();
        },
        finish: () => {
            if (failure) {
                return Promise.reject(failure);
            }
            return new Promise<string>((resolve, reject) => {
                const timer = window.setTimeout(() => {
                    finishing = null;
                    reject(new ScribeError({ message: "The commit timed out.", reason: "provider" }));
                }, COMMIT_TIMEOUT_MS);
                finishing = { reject, resolve, timer };
                write(chunkMessage(new Uint8Array(0), true));
            });
        },
        send: (pcm) => {
            if (!failure && !closed) {
                write(chunkMessage(pcm, false));
            }
        },
    };
}

// Posts each render quantum to the page; the page batches them into chunks, so the audio thread does no work.
const TAP_WORKLET = `registerProcessor("outlayr-tap", class extends AudioWorkletProcessor {
  process(inputs) { const channel = inputs[0] && inputs[0][0]; if (channel) this.port.postMessage(channel.slice(0)); return true; }
});`;

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
    for (const [at, sample] of samples.entries()) {
        const clamped = Math.max(-1, Math.min(1, sample));
        energy += clamped * clamped;
        pcm[at] = Math.round(clamped * PCM16_MAX);
    }
    return { pcm: new Uint8Array(pcm.buffer), rms: Math.sqrt(energy / Math.max(1, samples.length)) };
}

export interface Microphone {
    /** Starts handing out 100 ms PCM16 chunks at 16 kHz with their 0..1 level. */
    listen: (onChunk: (pcm: Uint8Array, level: number) => void) => void;
    stop: () => void;
}

const DENIED = new Set(["NotAllowedError", "SecurityError"]);
const MISSING = new Set(["NotFoundError", "OverconstrainedError"]);

function micFailureNamed(name: string): MicFailure {
    if (DENIED.has(name)) {
        return "denied";
    }
    return MISSING.has(name) ? "noMicrophone" : "failed";
}

/**
 * Asks for the microphone before anything is spent: a refusal must not cost a capture. getUserMedia exists only on
 * HTTPS and localhost, so a plain-HTTP address answers `insecure` instead of a permission prompt.
 */
export async function openMicrophone(): Promise<{ mic: Microphone; ok: true } | { ok: false; reason: MicFailure }> {
    if (!globalThis.isSecureContext || globalThis.navigator?.mediaDevices?.getUserMedia === undefined) {
        return { ok: false, reason: "insecure" };
    }
    let stream: MediaStream;
    try {
        stream = await navigator.mediaDevices.getUserMedia({
            audio: { autoGainControl: true, channelCount: 1, echoCancellation: true, noiseSuppression: true },
        });
    } catch (error) {
        return { ok: false, reason: error instanceof DOMException ? micFailureNamed(error.name) : "failed" };
    }
    const stopTracks = () => {
        for (const track of stream.getTracks()) {
            track.stop();
        }
    };
    const context = new AudioContext();
    const moduleUrl = URL.createObjectURL(new Blob([TAP_WORKLET], { type: "text/javascript" }));
    try {
        await context.audioWorklet.addModule(moduleUrl);
        await context.resume();
    } catch {
        stopTracks();
        void context.close();
        return { ok: false, reason: "failed" };
    } finally {
        URL.revokeObjectURL(moduleUrl);
    }
    const source = context.createMediaStreamSource(stream);
    const tap = new AudioWorkletNode(context, "outlayr-tap");
    let stopped = false;
    return {
        mic: {
            listen: (onChunk) => {
                // Resampled per 100 ms block, not per 128-sample quantum, whose fractional tail would be dropped.
                const chunkLength = Math.round(context.sampleRate / CHUNKS_PER_SECOND);
                let pending: Float32Array[] = [];
                let pendingLength = 0;
                tap.port.addEventListener("message", (event: MessageEvent<Float32Array>) => {
                    if (stopped) {
                        return;
                    }
                    pending.push(event.data);
                    pendingLength += event.data.length;
                    if (pendingLength < chunkLength) {
                        return;
                    }
                    const joined = new Float32Array(pendingLength);
                    let offset = 0;
                    for (const part of pending) {
                        joined.set(part, offset);
                        offset += part.length;
                    }
                    pending = [];
                    pendingLength = 0;
                    const { pcm, rms } = toPcm16(resample(joined, context.sampleRate));
                    onChunk(pcm, meterToLevel(rms));
                });
                tap.port.start();
                source.connect(tap);
            },
            stop: () => {
                if (stopped) {
                    return;
                }
                stopped = true;
                source.disconnect();
                tap.port.close();
                stopTracks();
                void context.close();
            },
        },
        ok: true,
    };
}
