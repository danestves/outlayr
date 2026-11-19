import * as Schema from "effect/Schema";

export const TranscriptFailureReason = Schema.Literals([
    "unauthenticated",
    "rateLimited",
    "quotaExceeded",
    "silent",
    "provider",
    "offline",
]);
export type TranscriptFailureReason = typeof TranscriptFailureReason.Type;

export class TranscriptStreamError extends Schema.TaggedError<TranscriptStreamError>()("TranscriptStreamError", {
    message: Schema.String,
    reason: TranscriptFailureReason,
}) {}

export type TranscriptEvent =
    | { readonly kind: "partial"; readonly text: string }
    | { readonly kind: "delta"; readonly text: string }
    | { readonly kind: "committed"; readonly text: string }
    | { readonly kind: "failed"; readonly error: TranscriptStreamError };

export interface TranscriptProtocol {
    readonly sampleRate: number;
    readonly connect: () => WebSocket;
    readonly chunk: (pcm: Uint8Array) => string;
    readonly commit: () => string;
    readonly read: (data: string) => TranscriptEvent | null;
}

export interface Heard {
    readonly committed: readonly string[];
    readonly inProgress: string;
}

export const NOTHING_HEARD: Heard = { committed: [], inProgress: "" };

export function hear(heard: Heard, event: Exclude<TranscriptEvent, { kind: "failed" }>): Heard {
    if (event.kind === "partial") {
        return { ...heard, inProgress: event.text };
    }
    if (event.kind === "delta") {
        return { ...heard, inProgress: heard.inProgress + event.text };
    }
    const text = event.text.trim();
    return { committed: text ? [...heard.committed, text] : heard.committed, inProgress: "" };
}

export const heardText = ({ committed, inProgress }: Heard) => [...committed, inProgress.trim()].join(" ").trim();

export function pcmToBase64(pcm: Uint8Array): string {
    let binary = "";
    const STEP = 32_768;
    for (let at = 0; at < pcm.length; at += STEP) {
        binary += String.fromCodePoint(...pcm.subarray(at, at + STEP));
    }
    return btoa(binary);
}

const isTextFrame = Schema.is(Schema.String);

const COMMIT_TIMEOUT_MS = 10_000;
const OPEN_TIMEOUT_MS = 5000;

export interface TranscriptStreamOptions {
    /** Everything heard so far: committed segments plus the one in progress. */
    onPartial: (text: string) => void;
    onError: (error: TranscriptStreamError) => void;
}

export interface TranscriptStream {
    /** Little-endian PCM16 mono at the protocol's `sampleRate`. Chunks sent before the socket opens are held. */
    send: (pcm: Uint8Array) => void;
    /** Commits what was said and resolves with the committed text. Rejects with a `TranscriptStreamError`. */
    finish: () => Promise<string>;
    close: () => void;
}

export function openTranscriptStream(
    protocol: TranscriptProtocol,
    { onError, onPartial }: TranscriptStreamOptions
): TranscriptStream {
    const socket = protocol.connect();
    const held: string[] = [];
    let heard = NOTHING_HEARD;
    let opened = false;
    let failure: TranscriptStreamError | null = null;
    let finishing: {
        reject: (error: TranscriptStreamError) => void;
        resolve: (text: string) => void;
        timer: ReturnType<typeof setTimeout>;
    } | null = null;
    let closed = false;

    const fail = (error: TranscriptStreamError) => {
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

    const openTimer = setTimeout(
        () => fail(new TranscriptStreamError({ message: "The transcription socket never opened.", reason: "offline" })),
        OPEN_TIMEOUT_MS
    );

    socket.addEventListener("open", () => {
        clearTimeout(openTimer);
        opened = true;
        for (const message of held.splice(0)) {
            socket.send(message);
        }
    });

    socket.addEventListener("message", (message) => {
        if (closed) {
            return;
        }
        const event = isTextFrame(message.data) ? protocol.read(message.data) : null;
        if (event === null) {
            return;
        }
        if (event.kind === "failed") {
            fail(event.error);
            return;
        }
        heard = hear(heard, event);
        onPartial(heardText(heard));
        if (event.kind === "committed" && finishing) {
            clearTimeout(finishing.timer);
            finishing.resolve(heard.committed.join(" "));
            finishing = null;
        }
    });

    socket.addEventListener("error", () =>
        fail(new TranscriptStreamError({ message: "The transcription socket failed.", reason: "offline" }))
    );
    socket.addEventListener("close", () => {
        if (!closed && !failure) {
            fail(new TranscriptStreamError({ message: "The transcription socket closed.", reason: "offline" }));
        }
    });

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
                const timer = setTimeout(() => {
                    finishing = null;
                    reject(new TranscriptStreamError({ message: "The commit timed out.", reason: "provider" }));
                }, COMMIT_TIMEOUT_MS);
                finishing = { reject, resolve, timer };
                write(protocol.commit());
            });
        },
        send: (pcm) => {
            if (!failure && !closed) {
                write(protocol.chunk(pcm));
            }
        },
    };
}
