import { VOICE_KEYTERMS_AT_MS } from "@outlayr/backend/confect/legal";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import { ENV } from "@/env";
import { languageSubtag, SUPPORTED_LANGUAGES } from "@/i18n/languages";

import { pcmToBase64, TranscriptStreamError } from "./transcript-stream";
import type { TranscriptEvent, TranscriptFailureReason, TranscriptProtocol } from "./transcript-stream";

const SCRIBE_SAMPLE_RATE = 16_000;
// apps/voice-relay forwards the socket so ElevenLabs never sees the phone, as the privacy policy says.
const SCRIBE_RELAY = ENV.EXPO_PUBLIC_VOICE_RELAY_URL;
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
// ElevenLabs documents at most 50 keyterms and 1,000 characters in all for realtime Scribe.
const MAX_KEYTERMS = 50;
const MAX_KEYTERM_CHARS = 1000;
const MAX_KEYTERM_LENGTH = 50;

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

export interface VoiceKeyterms {
    readonly accounts: readonly string[];
    readonly categories: readonly string[];
}

export interface ScribeSession {
    /** Names from the ledger, so a spoken "Bancamiga" is spelled like the account. */
    readonly keyterms: VoiceKeyterms;
    readonly language: string;
    readonly model: string;
    readonly token: string;
}

export function voiceKeyterms({
    accounts,
    categoryTree,
}: {
    readonly accounts: readonly string[];
    readonly categoryTree: readonly { readonly children: readonly string[]; readonly name: string }[];
}): VoiceKeyterms {
    // The notice that announces ledger names takes effect in January; until then only currency words go out.
    if (Date.now() < VOICE_KEYTERMS_AT_MS) {
        return { accounts: [], categories: [] };
    }
    return {
        accounts,
        categories: categoryTree.flatMap(({ children, name }) => [name, ...children]),
    };
}

// Order is priority: a huge ledger must not crowd out the accounts or the currency words.
function withinBudget(terms: readonly string[]): string[] {
    const seen = new Set<string>();
    const kept: string[] = [];
    let chars = 0;
    for (const term of terms) {
        const trimmed = term.trim();
        if (trimmed.length === 0 || trimmed.length > MAX_KEYTERM_LENGTH || seen.has(trimmed)) {
            continue;
        }
        seen.add(trimmed);
        if (kept.length >= MAX_KEYTERMS || chars + trimmed.length > MAX_KEYTERM_CHARS) {
            continue;
        }
        kept.push(trimmed);
        chars += trimmed.length;
    }
    return kept;
}

export function scribeUrl({ keyterms, language, model, token }: ScribeSession): string {
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
    const terms = withinBudget([...keyterms.accounts, ...CURRENCY_KEYTERMS, ...keyterms.categories]);
    for (const keyterm of terms) {
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
