import { createGeminiChat } from "@tanstack/ai-gemini";
import * as Config from "effect/Config";
import * as Option from "effect/Option";
import * as Redacted from "effect/Redacted";

import { secret } from "../provider";
import type { TextProvider } from "../provider";

type Model = Parameters<typeof createGeminiChat>[0];

export const gemini: TextProvider = {
    connect: secret("GEMINI_API_KEY").pipe(
        Config.map(
            Option.map(
                (apiKey) => (modelId: string) =>
                    // SAFETY: env picks the id; one the provider does not serve fails as a provider error.
                    createGeminiChat(modelId as Model, Redacted.value(apiKey))
            )
        )
    ),
    defaultModels: Option.some({ fast: "gemini-3.5-flash-lite", standard: "gemini-3.5-flash" }),
    outputLimit: (maxTokens) => ({ maxOutputTokens: maxTokens }),
};
