import type { TextProvider, TextProviderName } from "./provider";
import { anthropic } from "./providers/anthropic";
import { gemini } from "./providers/gemini";
import { grok } from "./providers/grok";
import { openai } from "./providers/openai";
import { openaiCompatible } from "./providers/openai-compatible";
import { openrouter } from "./providers/openrouter";

export const textProviders = {
    anthropic,
    gemini,
    grok,
    openai,
    "openai-compatible": openaiCompatible,
    openrouter,
} satisfies Record<TextProviderName, TextProvider>;
