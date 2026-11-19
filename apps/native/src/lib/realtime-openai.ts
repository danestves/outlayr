import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import { pcmToBase64, TranscriptStreamError } from "./transcript-stream";
import type { TranscriptEvent, TranscriptFailureReason, TranscriptProtocol } from "./transcript-stream";

const OPENAI_SAMPLE_RATE = 24_000;
const OPENAI_REALTIME_URL = "wss://api.openai.com/v1/realtime?intent=transcription";

const ProviderError = Schema.Struct({
    code: Schema.optional(Schema.NullOr(Schema.String)),
    message: Schema.optional(Schema.NullOr(Schema.String)),
    type: Schema.optional(Schema.NullOr(Schema.String)),
});

const ServerEvent = Schema.Union([
    Schema.Struct({ delta: Schema.String, type: Schema.Literal("conversation.item.input_audio_transcription.delta") }),
    Schema.Struct({
        transcript: Schema.String,
        type: Schema.Literal("conversation.item.input_audio_transcription.completed"),
    }),
    Schema.Struct({
        error: Schema.optional(ProviderError),
        type: Schema.Literal("conversation.item.input_audio_transcription.failed"),
    }),
    Schema.Struct({ error: ProviderError, type: Schema.Literal("error") }),
]);

const decodeServerEvent = Schema.decodeUnknownOption(Schema.fromJsonString(ServerEvent));

const REASON_BY_CODE = new Map<string, TranscriptFailureReason>([
    ["input_audio_buffer_commit_empty", "silent"],
    ["insufficient_quota", "quotaExceeded"],
    ["invalid_api_key", "unauthenticated"],
    ["rate_limit_exceeded", "rateLimited"],
]);

const REASON_BY_TYPE = new Map<string, TranscriptFailureReason>([
    ["authentication_error", "unauthenticated"],
    ["rate_limit_error", "rateLimited"],
]);

function failed(error: typeof ProviderError.Type | undefined): TranscriptEvent {
    const reason = REASON_BY_CODE.get(error?.code ?? "") ?? REASON_BY_TYPE.get(error?.type ?? "") ?? "provider";
    const message = error?.message ?? error?.code ?? "The transcription failed.";
    return { error: new TranscriptStreamError({ message, reason }), kind: "failed" };
}

export function readOpenAiEvent(data: string): TranscriptEvent | null {
    const decoded = decodeServerEvent(data);
    if (Option.isNone(decoded)) {
        return null;
    }
    const event = decoded.value;
    switch (event.type) {
        case "conversation.item.input_audio_transcription.delta": {
            return { kind: "delta", text: event.delta };
        }
        case "conversation.item.input_audio_transcription.completed": {
            return { kind: "committed", text: event.transcript };
        }
        default: {
            return failed(event.error);
        }
    }
}

export interface OpenAiSession {
    readonly clientSecret: string;
}

export const openAiProtocol = ({ clientSecret }: OpenAiSession): TranscriptProtocol => ({
    chunk: (pcm) => JSON.stringify({ audio: pcmToBase64(pcm), type: "input_audio_buffer.append" }),
    commit: () => JSON.stringify({ type: "input_audio_buffer.commit" }),
    connect: () => new WebSocket(OPENAI_REALTIME_URL, ["realtime", `openai-insecure-api-key.${clientSecret}`]),
    read: readOpenAiEvent,
    sampleRate: OPENAI_SAMPLE_RATE,
});
