import { createAnthropic } from "@ai-sdk/anthropic";
import { createElevenLabs } from "@ai-sdk/elevenlabs";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel, Tool, ToolSet, TranscriptionModel } from "ai";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Redacted from "effect/Redacted";

import type { AiProvider, SttProvider } from "./config";
import { aiApiKey, aiBaseUrl, aiProvider, sttApiKey, sttBaseUrl, sttModelId, sttProvider } from "./config";
import { ELEVENLABS_TRANSCRIPTION_MODEL_ID, OPENAI_TRANSCRIPTION_MODEL_ID } from "./models";

export interface AiCredentials {
    readonly apiKey: string;
    readonly baseUrl: string | undefined;
    readonly provider: typeof AiProvider.Type;
}

export interface SttCredentials {
    readonly apiKey: string;
    readonly baseUrl: string | undefined;
    readonly modelId: string | undefined;
    readonly provider: typeof SttProvider.Type;
}

export const aiCredentials = Effect.map(
    Effect.all([aiProvider, aiApiKey, aiBaseUrl] as const),
    ([provider, apiKey, baseUrl]) =>
        Option.map((key: Redacted.Redacted<string>) => ({
            apiKey: Redacted.value(key),
            baseUrl: Option.getOrUndefined(baseUrl),
            provider,
        }))(apiKey)
);

export const sttCredentials = Effect.map(
    Effect.all([sttProvider, sttApiKey, sttBaseUrl, sttModelId] as const),
    ([provider, apiKey, baseUrl, modelId]) =>
        Option.map((key: Redacted.Redacted<string>) => ({
            apiKey: Redacted.value(key),
            baseUrl: Option.getOrUndefined(baseUrl),
            modelId: Option.getOrUndefined(modelId),
            provider,
        }))(apiKey)
);

const clientOptions = ({ apiKey, baseUrl }: { apiKey: string; baseUrl: string | undefined }) =>
    baseUrl === undefined ? { apiKey } : { apiKey, baseURL: baseUrl };

export const languageModel = (credentials: AiCredentials, modelId: string): Exclude<LanguageModel, string> => {
    const options = clientOptions(credentials);
    switch (credentials.provider) {
        case "google": {
            return createGoogleGenerativeAI(options)(modelId);
        }
        case "openai":
        case "openai-compatible": {
            return createOpenAI(options)(modelId);
        }
        default: {
            return createAnthropic(options)(modelId);
        }
    }
};

// Hosted search is a vendor tool, so only vendors that ship one get grounding; an
// openai-compatible endpoint still answers, just without web results.
export const groundingTools = (credentials: AiCredentials, maxUses: number): ToolSet => {
    const options = clientOptions(credentials);
    switch (credentials.provider) {
        case "google": {
            // SAFETY: ProviderExecutedTool is a valid generateText tool; ToolSet's member union
            // does not cover it even though the runtime accepts it like the Anthropic tool below.
            return { web_search: createGoogleGenerativeAI(options).tools.googleSearch({}) as Tool };
        }
        case "openai": {
            // SAFETY: same ToolSet union gap as the Google branch above.
            return { web_search: createOpenAI(options).tools.webSearch({}) as Tool };
        }
        case "openai-compatible": {
            return {};
        }
        default: {
            return { web_search: createAnthropic(options).tools.webSearch_20250305({ maxUses }) };
        }
    }
};

const DEFAULT_STT_MODEL: Record<typeof SttProvider.Type, string> = {
    elevenlabs: ELEVENLABS_TRANSCRIPTION_MODEL_ID,
    openai: OPENAI_TRANSCRIPTION_MODEL_ID,
    "openai-compatible": OPENAI_TRANSCRIPTION_MODEL_ID,
};

export const transcriptionModel = (credentials: SttCredentials): TranscriptionModel => {
    const options = clientOptions(credentials);
    const modelId = credentials.modelId ?? DEFAULT_STT_MODEL[credentials.provider];
    switch (credentials.provider) {
        case "openai":
        case "openai-compatible": {
            return createOpenAI(options).transcription(modelId);
        }
        default: {
            return createElevenLabs(options).transcription(modelId);
        }
    }
};
