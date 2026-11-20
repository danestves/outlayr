import { generateTranscription } from "@tanstack/ai";
import { createGroqTranscription } from "@tanstack/ai-groq";
import * as Config from "effect/Config";
import * as Option from "effect/Option";
import * as Redacted from "effect/Redacted";

import { secret } from "../provider";
import type { SpeechProvider } from "../speech-provider";

type Model = Parameters<typeof createGroqTranscription>[0];

export const groqSpeech: SpeechProvider = {
    connect: secret("GROQ_API_KEY").pipe(
        Config.map(
            Option.map((key) => ({
                clip: (modelId) => (request) =>
                    generateTranscription({
                        abortSignal: request.abortSignal,
                        // SAFETY: env picks the id; one the provider does not serve fails as a provider error.
                        adapter: createGroqTranscription(modelId as Model, Redacted.value(key)),
                        audio: request.audio,
                        language: request.language,
                        threadId: crypto.randomUUID(),
                    }),
                realtime: Option.none(),
            }))
        )
    ),
    defaultRealtimeModel: Option.none(),
    defaultModel: Option.some("whisper-large-v3-turbo"),
};
