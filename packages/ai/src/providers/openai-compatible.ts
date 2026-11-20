import { openaiCompatibleText } from "@tanstack/ai-openai/compatible";
import * as Config from "effect/Config";
import * as Option from "effect/Option";
import * as Redacted from "effect/Redacted";

import { secret, setting } from "../provider";
import type { TextProvider } from "../provider";

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
