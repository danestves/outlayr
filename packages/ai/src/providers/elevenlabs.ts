import { generateTranscription } from "@tanstack/ai";
import { createElevenLabsTranscription } from "@tanstack/ai-elevenlabs";
import * as Config from "effect/Config";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as HttpClientRequest from "effect/http/HttpClientRequest";
import * as Option from "effect/Option";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";

import { secret } from "../provider";
import { realtimeTokenRequest } from "../realtime-token";
import type { SpeechProvider } from "../speech-provider";

type Model = Parameters<typeof createElevenLabsTranscription>[0];

const TOKEN_URL = "https://api.elevenlabs.io/v1/single-use-token/realtime_scribe";
const TOKEN_TIMEOUT = Duration.seconds(5);
const ScribeToken = Schema.Struct({ token: Schema.String });

export const elevenlabsSpeech: SpeechProvider = {
    connect: secret("ELEVENLABS_API_KEY").pipe(
        Config.map(
            Option.map((key) => {
                const apiKey = Redacted.value(key);
                return {
                    clip: (modelId) => (request) =>
                        generateTranscription({
                            abortSignal: request.abortSignal,
                            // SAFETY: env picks the id; one the provider does not serve fails as a provider error.
                            adapter: createElevenLabsTranscription(modelId as Model, apiKey),
                            audio: request.audio,
                            language: request.language,
                            modelOptions: { diarize: false, tagAudioEvents: false, timestampsGranularity: "none" },
                            threadId: crypto.randomUUID(),
                        }),
                    realtime: Option.some((model: string) =>
                        realtimeTokenRequest(
                            HttpClientRequest.post(TOKEN_URL).pipe(HttpClientRequest.setHeader("xi-api-key", apiKey)),
                            ScribeToken,
                            TOKEN_TIMEOUT
                        ).pipe(Effect.map(({ token }) => ({ kind: "elevenlabs" as const, model, token })))
                    ),
                };
            })
        )
    ),
    defaultRealtimeModel: Option.some("scribe_v3_live"),
    defaultModel: Option.some("scribe_v2"),
};
