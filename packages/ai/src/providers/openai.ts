import { generateTranscription } from "@tanstack/ai";
import { createOpenaiChat, createOpenaiTranscription } from "@tanstack/ai-openai";
import { webSearchTool } from "@tanstack/ai-openai/tools";
import * as Config from "effect/Config";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as HttpClientRequest from "effect/http/HttpClientRequest";
import * as Option from "effect/Option";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";

import { secret } from "../provider";
import type { TextProvider } from "../provider";
import { realtimeTokenRequest } from "../realtime-token";
import type { SpeechProvider } from "../speech-provider";

type Model = Parameters<typeof createOpenaiChat>[0];

export const openai: TextProvider = {
    connect: secret("OPENAI_API_KEY").pipe(
        Config.map(
            Option.map(
                (apiKey) => (modelId: string) =>
                    // SAFETY: env picks the id; one the provider does not serve fails as a provider error.
                    createOpenaiChat(modelId as Model, Redacted.value(apiKey), { maxRetries: 0 })
            )
        )
    ),
    defaultModels: Option.some({ fast: "gpt-5.4-mini", standard: "gpt-5.5" }),
    outputLimit: (maxTokens) => ({ max_output_tokens: maxTokens }),
    requestOptions: { store: false },
    webSearch: () => webSearchTool({ type: "web_search" }),
};

type TranscriptionModel = Parameters<typeof createOpenaiTranscription>[0];

const CLIENT_SECRETS_URL = "https://api.openai.com/v1/realtime/client_secrets";
const CLIENT_SECRET_TIMEOUT = Duration.seconds(5);
const CLIENT_SECRET_TTL_SECONDS = 120;
const REALTIME_SAMPLE_RATE = 24_000;
const ClientSecret = Schema.Struct({ expires_at: Schema.Finite, value: Schema.String });

const clientSecretRequest = (apiKey: string, model: string) =>
    HttpClientRequest.post(CLIENT_SECRETS_URL).pipe(
        HttpClientRequest.bearerToken(apiKey),
        HttpClientRequest.bodyJsonUnsafe({
            expires_after: { anchor: "created_at", seconds: CLIENT_SECRET_TTL_SECONDS },
            session: {
                audio: {
                    input: {
                        format: { rate: REALTIME_SAMPLE_RATE, type: "audio/pcm" },
                        transcription: { model },
                        turn_detection: null,
                    },
                },
                type: "transcription",
            },
        })
    );

export const openaiSpeech: SpeechProvider = {
    connect: secret("OPENAI_API_KEY").pipe(
        Config.map(
            Option.map((key) => {
                const apiKey = Redacted.value(key);
                return {
                    clip: (modelId) => (request) =>
                        generateTranscription({
                            abortSignal: request.abortSignal,
                            // SAFETY: env picks the id; one the provider does not serve fails as a provider error.
                            adapter: createOpenaiTranscription(modelId as TranscriptionModel, apiKey),
                            audio: request.audio,
                            language: request.language,
                            threadId: crypto.randomUUID(),
                        }),
                    realtime: Option.some((model: string) =>
                        realtimeTokenRequest(
                            clientSecretRequest(apiKey, model),
                            ClientSecret,
                            CLIENT_SECRET_TIMEOUT
                        ).pipe(
                            Effect.map(({ expires_at, value }) => ({
                                clientSecret: value,
                                expiresAt: expires_at,
                                kind: "openai" as const,
                                model,
                            }))
                        )
                    ),
                };
            })
        )
    ),
    defaultRealtimeModel: Option.some("gpt-live-transcribe"),
    defaultModel: Option.some("gpt-4o-transcribe"),
};
