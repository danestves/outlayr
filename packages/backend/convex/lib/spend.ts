import type { RateLimitConfig } from "@convex-dev/rate-limiter";
import { DAY } from "@convex-dev/rate-limiter";

import { aiProvider } from "./models";
import type { AiProvider } from "./models";

/**
 * Anthropic: $10 per 1,000 web searches, `claude-haiku-5-5` at $0.10/$0.50 per 1M tokens up to 100k-token prompts.
 * xAI: $5 per 1,000 web searches, `grok-4.20-0309-non-reasoning` at $1.25/$2.50 per 1M tokens up to 200k-token prompts.
 */
const DEFAULT_PRICES = {
    anthropic: { input: 0.1, output: 0.5, search: 10_000 },
    xai: { input: 1.25, output: 2.5, search: 5000 },
} as const satisfies Record<AiProvider, { input: number; output: number; search: number }>;
export const DEFAULT_BUDGET_CEILING_MICROS = 200_000_000;
const BUDGET_PERIOD_MS = 30 * DAY;
export const WORST_CASE_SEARCH_CALLS = 3;
/** Backs the pessimistic pre-charge. Search results bill as input: one-search lookups measured 14k to 17.5k tokens. */
const ESTIMATED_INPUT_TOKENS = 18_000;
const ESTIMATED_OUTPUT_TOKENS = 420;

function envNumber(name: string, fallback: number): number {
    const raw = process.env[name];
    if (!raw) {
        return fallback;
    }
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
}

export function searchPriceMicros(): number {
    return envNumber("GROUNDED_SEARCH_PRICE_MICROS", DEFAULT_PRICES[aiProvider()].search);
}

export function inputPriceMicrosPerToken(): number {
    return envNumber("GROUNDED_INPUT_PRICE_MICROS_PER_TOKEN", DEFAULT_PRICES[aiProvider()].input);
}

export function outputPriceMicrosPerToken(): number {
    return envNumber("GROUNDED_OUTPUT_PRICE_MICROS_PER_TOKEN", DEFAULT_PRICES[aiProvider()].output);
}

/** Read live so `npx convex env set GROUNDED_BUDGET_MICROS=0` closes the gate without a deploy. */
export function budgetCeilingMicros(): number {
    return envNumber("GROUNDED_BUDGET_MICROS", DEFAULT_BUDGET_CEILING_MICROS);
}

// Passed inline, never registered: a registered config cannot change per call, so the env var could not move it.
export function budgetConfig(): RateLimitConfig {
    return {
        kind: "fixed window",
        period: BUDGET_PERIOD_MS,
        rate: budgetCeilingMicros(),
        shards: 10,
    };
}

export function estimateMicros(): number {
    return (
        WORST_CASE_SEARCH_CALLS * searchPriceMicros() +
        ESTIMATED_INPUT_TOKENS * inputPriceMicrosPerToken() +
        ESTIMATED_OUTPUT_TOKENS * outputPriceMicrosPerToken()
    );
}

export interface UsageLike {
    inputTokens?: number | null;
    outputTokens?: number | null;
}

export function measureMicros(usage: UsageLike, searchCalls: number): number {
    return (
        searchCalls * searchPriceMicros() +
        (usage.inputTokens ?? 0) * inputPriceMicrosPerToken() +
        (usage.outputTokens ?? 0) * outputPriceMicrosPerToken()
    );
}
