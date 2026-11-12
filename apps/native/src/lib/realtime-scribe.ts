import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

export const SCRIBE_SAMPLE_RATE = 16_000;
// apps/voice-relay forwards the socket so ElevenLabs never sees the phone, as the privacy policy says.
const SCRIBE_RELAY = "wss://voice.tryoutlayr.com";

export const ScribeFailureReason = Schema.Literals([
    "unauthenticated",
    "rateLimited",
    "quotaExceeded",
    "silent",
    "provider",
    "offline",
]);
export type ScribeFailureReason = typeof ScribeFailureReason.Type;

export class ScribeStreamError extends Schema.TaggedError<ScribeStreamError>()("ScribeStreamError", {
    message: Schema.String,
    reason: ScribeFailureReason,
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
    Schema.Struct({
        message_type: Schema.Literal("committed_transcript_with_timestamps"),
        text: Schema.String,
    }),
    Schema.Struct({ message_type: ServerErrorType, error: Schema.optional(Schema.String) }),
]);
type ServerMessage = typeof ServerMessage.Type;

const decodeServerMessage = Schema.decodeUnknownOption(Schema.fromJsonString(ServerMessage));

const isErrorType = Schema.is(ServerErrorType);

const REASON_BY_ERROR: Record<typeof ServerErrorType.Type, ScribeFailureReason> = {
    auth_error: "unauthenticated",
    chunk_size_exceeded: "provider",
    commit_throttled: "rateLimited",
    error: "provider",
    input_error: "provider",
    insufficient_audio_activity: "silent",
    invalid_request: "provider",
    queue_overflow: "rateLimited",
    quota_exceeded: "quotaExceeded",
    rate_limited: "rateLimited",
    resource_exhausted: "rateLimited",
    session_time_limit_exceeded: "provider",
    transcriber_error: "provider",
    unaccepted_terms: "unauthenticated",
};

const COMMIT_TIMEOUT_MS = 10_000;

export interface ScribeStreamOptions {
    token: string;
    language: string;
    /** Everything heard so far: committed segments plus the one in progress. */
    onPartial: (text: string) => void;
    onCommitted: (text: string) => void;
    onError: (error: ScribeStreamError) => void;
}

export interface ScribeStream {
    /** Little-endian PCM16 mono at 16 kHz. Chunks sent before the socket opens are held, then flushed in order. */
    send: (pcm: Uint8Array) => void;
    /** Commits what was said and resolves with the committed text. Rejects with a `ScribeStreamError`. */
    finish: () => Promise<string>;
    close: () => void;
}

export function scribeUrl({ language, token }: Pick<ScribeStreamOptions, "language" | "token">): string {
    const query = new URLSearchParams({
        audio_format: `pcm_${SCRIBE_SAMPLE_RATE}`,
        commit_strategy: "manual",
        language_code: language,
        model_id: "scribe_v2_realtime",
        token,
    });
    return `${SCRIBE_RELAY}/v1/speech-to-text/realtime?${query.toString()}`;
}

export function pcmToBase64(pcm: Uint8Array): string {
    let binary = "";
    const STEP = 32_768;
    for (let at = 0; at < pcm.length; at += STEP) {
        binary += String.fromCodePoint(...pcm.subarray(at, at + STEP));
    }
    return btoa(binary);
}

function chunkMessage(pcm: Uint8Array, commit: boolean): string {
    return JSON.stringify({
        audio_base_64: pcmToBase64(pcm),
        commit,
        message_type: "input_audio_chunk",
        sample_rate: SCRIBE_SAMPLE_RATE,
    });
}

export function openScribeStream({
    language,
    onCommitted,
    onError,
    onPartial,
    token,
}: ScribeStreamOptions): ScribeStream {
    const socket = new WebSocket(scribeUrl({ language, token }));
    const held: string[] = [];
    const committed: string[] = [];
    let opened = false;
    let failure: ScribeStreamError | null = null;
    let finishing: {
        reject: (error: ScribeStreamError) => void;
        resolve: (text: string) => void;
        timer: ReturnType<typeof setTimeout>;
    } | null = null;
    let closed = false;

    const fail = (error: ScribeStreamError) => {
        if (failure || closed) {
            return;
        }
        failure = error;
        if (finishing) {
            clearTimeout(finishing.timer);
            finishing.reject(error);
            finishing = null;
        } else {
            onError(error);
        }
        socket.close();
    };

    const write = (message: string) => {
        if (opened && socket.readyState === WebSocket.OPEN) {
            socket.send(message);
        } else {
            held.push(message);
        }
    };

    socket.addEventListener("open", () => {
        opened = true;
        for (const message of held.splice(0)) {
            socket.send(message);
        }
    });

    socket.addEventListener("message", (event) => {
        const decoded = decodeServerMessage(event.data);
        if (Option.isNone(decoded)) {
            return;
        }
        const message: ServerMessage = decoded.value;
        if (message.message_type === "partial_transcript") {
            onPartial([...committed, message.text.trim()].join(" ").trim());
        } else if (message.message_type === "committed_transcript") {
            const text = message.text.trim();
            if (text) {
                committed.push(text);
                onCommitted(text);
                onPartial(committed.join(" "));
            }
            if (finishing) {
                clearTimeout(finishing.timer);
                finishing.resolve(committed.join(" "));
                finishing = null;
            }
        } else if (isErrorType(message.message_type)) {
            const type = message.message_type;
            fail(
                new ScribeStreamError({
                    message: "error" in message ? (message.error ?? type) : type,
                    reason: REASON_BY_ERROR[type],
                })
            );
        }
    });

    socket.addEventListener("error", () =>
        fail(new ScribeStreamError({ message: "The transcription socket failed.", reason: "offline" }))
    );
    socket.addEventListener("close", () => {
        if (!closed && !failure) {
            fail(new ScribeStreamError({ message: "The transcription socket closed.", reason: "offline" }));
        }
    });

    return {
        close: () => {
            closed = true;
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
                const timer = setTimeout(() => {
                    finishing = null;
                    reject(new ScribeStreamError({ message: "The commit timed out.", reason: "provider" }));
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
