import { generateTranscription } from "@tanstack/ai";
import { createOpenaiTranscription } from "@tanstack/ai-openai";
import { openaiCompatibleText } from "@tanstack/ai-openai/compatible";
import * as Config from "effect/Config";
import * as Option from "effect/Option";
import * as Redacted from "effect/Redacted";

import { secret, setting } from "../provider";
import type { TextProvider } from "../provider";
import type { ClipRequest, SpeechProvider } from "../speech-provider";

const KEYLESS = "unused";

export const openaiCompatible: TextProvider = {
    connect: Config.all({
        apiKey: secret("OPENAI_COMPATIBLE_API_KEY"),
        baseURL: setting("OPENAI_COMPATIBLE_BASE_URL"),
    }).pipe(
        Config.map(({ apiKey, baseURL }) =>
            baseURL.pipe(
                Option.map(
                    (url) => (modelId: string) =>
                        openaiCompatibleText(modelId, {
                            api: "chat-completions",
                            apiKey: Option.match(apiKey, { onNone: () => KEYLESS, onSome: Redacted.value }),
                            baseURL: url,
                            maxRetries: 0,
                            name: "openai-compatible",
                        })
                )
            )
        )
    ),
    defaultModels: Option.none(),
    outputLimit: (maxTokens) => ({ max_tokens: maxTokens }),
};

type TranscriptionModel = Parameters<typeof createOpenaiTranscription>[0];

export const openaiCompatibleSpeech: SpeechProvider = {
    connect: Config.all({ apiKey: secret("STT_API_KEY"), baseURL: setting("STT_BASE_URL") }).pipe(
        Config.map(({ apiKey, baseURL }) =>
            baseURL.pipe(
                Option.map((url) => ({
                    clip: (modelId: string) => (request: ClipRequest) =>
                        generateTranscription({
                            abortSignal: request.abortSignal,
                            adapter: createOpenaiTranscription(
                                // SAFETY: env picks the id; one the server does not serve fails as a provider error.
                                modelId as TranscriptionModel,
                                Option.match(apiKey, { onNone: () => KEYLESS, onSome: Redacted.value }),
                                { baseURL: url }
                            ),
                            audio: request.audio,
                            language: request.language,
                            threadId: crypto.randomUUID(),
                        }),
                    realtime: Option.none(),
                }))
            )
        )
    ),
    defaultRealtimeModel: Option.none(),
    defaultModel: Option.none(),
};
