import { createAnthropicChat } from "@tanstack/ai-anthropic";
import * as Config from "effect/Config";
import * as Option from "effect/Option";
import * as Redacted from "effect/Redacted";

import { secret } from "../provider";
import type { TextProvider } from "../provider";

type Model = Parameters<typeof createAnthropicChat>[0];

export const anthropic: TextProvider = {
    connect: secret("ANTHROPIC_API_KEY").pipe(
        Config.map(
            Option.map(
                (apiKey) => (modelId: string) =>
                    // SAFETY: env picks the id; one the provider does not serve fails as a provider error.
                    createAnthropicChat(modelId as Model, Redacted.value(apiKey), { maxRetries: 0 })
            )
        )
    ),
    defaultModels: Option.some({ fast: "claude-haiku-5-5", standard: "claude-sonnet-5-5" }),
    outputLimit: (maxTokens) => ({ max_tokens: maxTokens }),
};
