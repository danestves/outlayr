import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import { languageSubtag, SUPPORTED_LANGUAGES } from "@/i18n/languages";

import { pcmToBase64, TranscriptStreamError } from "./transcript-stream";
import type { TranscriptEvent, TranscriptFailureReason, TranscriptProtocol } from "./transcript-stream";

const SCRIBE_SAMPLE_RATE = 16_000;
// apps/voice-relay forwards the socket so ElevenLabs never sees the phone, as the privacy policy says.
const SCRIBE_RELAY = "wss://voice.tryoutlayr.com";
const SCRIBE_LANGUAGES = [...new Set(SUPPORTED_LANGUAGES.map(languageSubtag))];
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
const decodeServerMessage = Schema.decodeUnknownOption(Schema.fromJsonString(ServerMessage));

const REASON_BY_ERROR: Record<typeof ServerErrorType.Type, TranscriptFailureReason> = {
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

export interface ScribeSession {
    readonly language: string;
    readonly model: string;
    readonly token: string;
}

export function scribeUrl({ language, model, token }: ScribeSession): string {
    const query = new URLSearchParams({
        audio_format: `pcm_${SCRIBE_SAMPLE_RATE}`,
        commit_strategy: "manual",
        language_code: language,
        model_id: model,
        token,
    });
    for (const other of SCRIBE_LANGUAGES) {
        if (other !== language) {
            query.append("secondary_languages", other);
        }
    }
    for (const keyterm of CURRENCY_KEYTERMS) {
        query.append("keyterms", keyterm);
    }
    return `${SCRIBE_RELAY}/v1/speech-to-text/realtime?${query.toString()}`;
}

export function readScribeMessage(data: string): TranscriptEvent | null {
    const decoded = decodeServerMessage(data);
    if (Option.isNone(decoded)) {
        return null;
    }
    const message = decoded.value;
    switch (message.message_type) {
        case "session_started": {
            return null;
        }
        case "partial_transcript": {
            return { kind: "partial", text: message.text };
        }
        case "committed_transcript": {
            return { kind: "committed", text: message.text };
        }
        case "committed_transcript_with_timestamps": {
            return null;
        }
        default: {
            const type = message.message_type;
            return {
                error: new TranscriptStreamError({ message: message.error ?? type, reason: REASON_BY_ERROR[type] }),
                kind: "failed",
            };
        }
    }
}

const chunkMessage = (pcm: Uint8Array, commit: boolean) =>
    JSON.stringify({
        audio_base_64: pcmToBase64(pcm),
        commit,
        message_type: "input_audio_chunk",
        sample_rate: SCRIBE_SAMPLE_RATE,
    });

export const scribeProtocol = (session: ScribeSession): TranscriptProtocol => ({
    chunk: (pcm) => chunkMessage(pcm, false),
    commit: () => chunkMessage(new Uint8Array(0), true),
    connect: () => new WebSocket(scribeUrl(session)),
    read: readScribeMessage,
    sampleRate: SCRIBE_SAMPLE_RATE,
});
