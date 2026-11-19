import type { TextProvider, TextProviderName } from "./provider";
import { anthropic } from "./providers/anthropic";
import { elevenlabsSpeech } from "./providers/elevenlabs";
import { gemini } from "./providers/gemini";
import { grok, grokSpeech } from "./providers/grok";
import { groqSpeech } from "./providers/groq";
import { openai, openaiSpeech } from "./providers/openai";
import { openaiCompatible, openaiCompatibleSpeech } from "./providers/openai-compatible";
import { openrouter } from "./providers/openrouter";
import type { SpeechProvider, SpeechProviderName } from "./speech-provider";

export const textProviders = {
    anthropic,
    gemini,
    grok,
    openai,
    "openai-compatible": openaiCompatible,
    openrouter,
} satisfies Record<TextProviderName, TextProvider>;

export const speechProviders = {
    elevenlabs: elevenlabsSpeech,
    grok: grokSpeech,
    groq: groqSpeech,
    openai: openaiSpeech,
    "openai-compatible": openaiCompatibleSpeech,
} satisfies Record<SpeechProviderName, SpeechProvider>;
