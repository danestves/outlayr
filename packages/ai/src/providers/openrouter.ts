import { createOpenRouterText } from "@tanstack/ai-openrouter";
import * as Config from "effect/Config";
import * as Option from "effect/Option";
import * as Redacted from "effect/Redacted";

import { secret } from "../provider";
import type { TextProvider } from "../provider";

type Model = Parameters<typeof createOpenRouterText>[0];

export const openrouter: TextProvider = {
    connect: secret("OPENROUTER_API_KEY").pipe(
        Config.map(
            Option.map(
                (apiKey) => (modelId: string) =>
                    // SAFETY: env picks the id; one the provider does not serve fails as a provider error.
                    createOpenRouterText(modelId as Model, Redacted.value(apiKey), {
                        retryConfig: { strategy: "none" },
                    })
            )
        )
    ),
    defaultModels: Option.some({ fast: "anthropic/claude-haiku-5.5", standard: "anthropic/claude-sonnet-5.5" }),
    outputLimit: (maxTokens) => ({ maxTokens }),
};
