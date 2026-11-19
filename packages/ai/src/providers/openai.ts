import { createOpenaiChat } from "@tanstack/ai-openai";
import * as Config from "effect/Config";
import * as Option from "effect/Option";
import * as Redacted from "effect/Redacted";

import { secret } from "../provider";
import type { TextProvider } from "../provider";

type Model = Parameters<typeof createOpenaiChat>[0];

export const openai: TextProvider = {
    connect: secret("OPENAI_API_KEY").pipe(
        Config.map(
            Option.map(
                (apiKey) => (modelId: string) =>
                    // SAFETY: env picks the id; one the provider does not serve fails as a provider error.
                    createOpenaiChat(modelId as Model, Redacted.value(apiKey))
            )
        )
    ),
    defaultModels: Option.some({ fast: "gpt-5.4-mini", standard: "gpt-5.5" }),
    outputLimit: (maxTokens) => ({ max_output_tokens: maxTokens }),
    requestOptions: { store: false },
};
