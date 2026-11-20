import { generateTranscription } from "@tanstack/ai";
import { createGrokText, createGrokTranscription } from "@tanstack/ai-grok";
import { grokWebSearchTool } from "@tanstack/ai-grok/tools";
import * as Config from "effect/Config";
import * as Option from "effect/Option";
import * as Redacted from "effect/Redacted";

import { secret } from "../provider";
import type { TextProvider } from "../provider";
import type { SpeechProvider } from "../speech-provider";

type Model = Parameters<typeof createGrokText>[0];

export const grok: TextProvider = {
    connect: secret("XAI_API_KEY").pipe(
        Config.map(
            Option.map(
                (apiKey) => (modelId: string) =>
                    // SAFETY: env picks the id; one the provider does not serve fails as a provider error.
                    createGrokText(modelId as Model, Redacted.value(apiKey), { maxRetries: 0 })
            )
        )
    ),
    defaultModels: Option.some({ fast: "grok-4.20-non-reasoning", standard: "grok-4.7" }),
    outputLimit: (maxTokens) => ({ max_output_tokens: maxTokens }),
    webSearch: () => grokWebSearchTool(),
};

type TranscriptionModel = Parameters<typeof createGrokTranscription>[0];

export const grokSpeech: SpeechProvider = {
    connect: secret("XAI_API_KEY").pipe(
        Config.map(
            Option.map((key) => ({
                clip: (modelId) => (request) =>
                    generateTranscription({
                        abortSignal: request.abortSignal,
                        // SAFETY: env picks the id; one the provider does not serve fails as a provider error.
                        adapter: createGrokTranscription(modelId as TranscriptionModel, Redacted.value(key)),
                        audio: request.audio,
                        language: request.language,
                        threadId: crypto.randomUUID(),
                    }),
                realtime: Option.none(),
            }))
        )
    ),
    defaultRealtimeModel: Option.none(),
    defaultModel: Option.some("grok-stt"),
};
