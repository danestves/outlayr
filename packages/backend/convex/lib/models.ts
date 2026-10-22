import { createAnthropic } from "@ai-sdk/anthropic";
import { createXai } from "@ai-sdk/xai";
import type { LanguageModel, ToolSet } from "ai";

export const CLAUDE_MODEL_ID = "claude-sonnet-5-5";
export const CLAUDE_FAST_MODEL_ID = "claude-haiku-5-5";
export const GROK_MODEL_ID = "grok-4.3";
export const GROK_FAST_MODEL_ID = "grok-4.20-0309-non-reasoning";
export const ELEVENLABS_TRANSCRIPTION_MODEL_ID = "scribe_v2";

// Bump whenever the providers above change, so a build that asked about the old ones cannot send data to new ones.
// Mirrored in apps/native/src/domain/ai-consent.ts.
export const AI_CONSENT_VERSION = 2;

export type AiProvider = "anthropic" | "xai";

/** `smart` parses voice and installment plans, `grounded` runs the web lookup, `fast` does the rest. */
export type ModelTier = "fast" | "grounded" | "smart";

// Narrowed to a provider instance because the voice agent rejects a bare gateway id string.
export type ProviderModel = Extract<LanguageModel, { specificationVersion: "v4" }>;

export interface ResolvedGrounding {
    grounding: ProviderModel;
    groundingTools: ToolSet;
}

// `AI_PROVIDER=xai` is the stopgap for when Anthropic credits run out.
// Read per call, so `convex env set` flips it without a deploy.
export function aiProvider(): AiProvider {
    return process.env.AI_PROVIDER === "xai" ? "xai" : "anthropic";
}

export function modelIdFor(tier: ModelTier): string {
    if (aiProvider() === "xai") {
        return tier === "smart"
            ? process.env.XAI_MODEL_ID || GROK_MODEL_ID
            : process.env.XAI_FAST_MODEL_ID || GROK_FAST_MODEL_ID;
    }
    if (tier === "smart") {
        return process.env.CLAUDE_MODEL_ID || CLAUDE_MODEL_ID;
    }
    const fast = process.env.CLAUDE_FAST_MODEL_ID || CLAUDE_FAST_MODEL_ID;
    return tier === "grounded" ? process.env.CLAUDE_GROUNDED_MODEL_ID || fast : fast;
}

/** Null when the active provider has no API key, so every caller degrades the way it did for a missing key. */
export function resolveModel(tier: ModelTier): ProviderModel | null {
    const modelId = modelIdFor(tier);
    if (aiProvider() === "xai") {
        const apiKey = process.env.XAI_API_KEY;
        return apiKey ? createXai({ apiKey })(modelId) : null;
    }
    const apiKey = process.env.ANTHROPIC_API_KEY;
    return apiKey ? createAnthropic({ apiKey })(modelId) : null;
}

/** xAI's web search takes no per-request cap, so there the caller's step limit is the only bound. */
export function resolveGrounding(maxSearches: number): ResolvedGrounding | null {
    const modelId = modelIdFor("grounded");
    if (aiProvider() === "xai") {
        const apiKey = process.env.XAI_API_KEY;
        if (!apiKey) {
            return null;
        }
        const xai = createXai({ apiKey });
        return { grounding: xai(modelId), groundingTools: { web_search: xai.tools.webSearch() } };
    }
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        return null;
    }
    const anthropic = createAnthropic({ apiKey });
    return {
        grounding: anthropic(modelId),
        groundingTools: { web_search: anthropic.tools.webSearch_20250305({ maxUses: maxSearches }) },
    };
}
