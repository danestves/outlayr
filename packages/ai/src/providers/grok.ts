import { createGrokText } from "@tanstack/ai-grok";
import * as Config from "effect/Config";
import * as Option from "effect/Option";
import * as Redacted from "effect/Redacted";

import { secret } from "../provider";
import type { TextProvider } from "../provider";

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
};
