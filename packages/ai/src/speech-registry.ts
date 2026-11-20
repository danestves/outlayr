import { elevenlabsSpeech } from "./providers/elevenlabs";
import { grokSpeech } from "./providers/grok";
import { groqSpeech } from "./providers/groq";
import { openaiSpeech } from "./providers/openai";
import { openaiCompatibleSpeech } from "./providers/openai-compatible";
import type { SpeechProvider, SpeechProviderName } from "./speech-provider";

export const speechProviders = {
    elevenlabs: elevenlabsSpeech,
    grok: grokSpeech,
    groq: groqSpeech,
    openai: openaiSpeech,
    "openai-compatible": openaiCompatibleSpeech,
} satisfies Record<SpeechProviderName, SpeechProvider>;
