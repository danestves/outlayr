import { APICallError, wrapLanguageModel } from "ai";
import type { LanguageModel, LanguageModelMiddleware } from "ai";
import * as Option from "effect/Option";
import * as Redacted from "effect/Redacted";

import { postHogProjectToken } from "./config";
import { runEdgeSync } from "./runEdge";

const CAPTURE_URL = "https://us.i.posthog.com/i/v0/e/";
const CAPTURE_TIMEOUT_MS = 3000;

interface Generation {
    usage?: {
        inputTokens: {
            total: number | undefined;
            noCache: number | undefined;
            cacheRead: number | undefined;
            cacheWrite: number | undefined;
        };
        outputTokens: { total: number | undefined };
    };
    stopReason?: string;
    webSearches?: number;
    error?: unknown;
}

export type GenerationProperties = Record<string, string | number | boolean | undefined>;

export function tracingMiddleware(
    feature: string,
    send: (properties: GenerationProperties) => Promise<void>
): LanguageModelMiddleware {
    const traceId = crypto.randomUUID();
    const record = (modelId: string, startedAt: number, generation: Generation) => {
        const { error, usage } = generation;
        return send({
            $ai_cache_creation_input_tokens: usage?.inputTokens.cacheWrite,
            $ai_cache_read_input_tokens: usage?.inputTokens.cacheRead,
            $ai_error: error instanceof Error ? error.name : undefined,
            $ai_http_status: error === undefined ? 200 : (APICallError.isInstance(error) && error.statusCode) || 500,
            $ai_input_tokens: usage?.inputTokens.noCache ?? usage?.inputTokens.total,
            $ai_is_error: error !== undefined,
            $ai_latency: (Date.now() - startedAt) / 1000,
            $ai_model: modelId,
            $ai_output_tokens: usage?.outputTokens.total,
            $ai_provider: "anthropic",
            $ai_span_name: feature,
            $ai_stop_reason: generation.stopReason,
            $ai_trace_id: traceId,
            $ai_web_search_count: generation.webSearches || undefined,
            $process_person_profile: false,
        });
    };

    return {
        wrapGenerate: async ({ doGenerate, model }) => {
            const startedAt = Date.now();
            try {
                const result = await doGenerate();
                await record(result.response?.modelId ?? model.modelId, startedAt, {
                    stopReason: result.finishReason.unified,
                    usage: result.usage,
                    webSearches: result.content.filter(
                        (part) =>
                            part.type === "tool-call" &&
                            part.providerExecuted === true &&
                            part.toolName === "web_search"
                    ).length,
                });
                return result;
            } catch (error) {
                await record(model.modelId, startedAt, { error });
                throw error;
            }
        },
        wrapStream: async ({ doStream, model }) => {
            const startedAt = Date.now();
            let result: Awaited<ReturnType<typeof doStream>>;
            try {
                result = await doStream();
            } catch (error) {
                await record(model.modelId, startedAt, { error });
                throw error;
            }
            let { modelId } = model;
            const generation: Generation = {};
            return {
                ...result,
                stream: result.stream.pipeThrough(
                    new TransformStream({
                        flush: () => record(modelId, startedAt, generation),
                        transform(part, controller) {
                            if (part.type === "response-metadata" && part.modelId !== undefined) {
                                ({ modelId } = part);
                            } else if (part.type === "finish") {
                                generation.usage = part.usage;
                                generation.stopReason = part.finishReason.unified;
                            } else if (part.type === "error") {
                                generation.error = part.error;
                            }
                            controller.enqueue(part);
                        },
                    })
                ),
            };
        },
    };
}

export function traced(model: Exclude<LanguageModel, string>, feature: string) {
    return wrapLanguageModel({ middleware: tracingMiddleware(feature, capture), model });
}

async function capture(properties: GenerationProperties): Promise<void> {
    const token = Option.match(runEdgeSync(postHogProjectToken), { onNone: () => "", onSome: Redacted.value });
    if (!token) {
        return;
    }
    await fetch(CAPTURE_URL, {
        body: JSON.stringify({
            api_key: token,
            distinct_id: properties.$ai_trace_id,
            event: "$ai_generation",
            properties,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
        signal: AbortSignal.timeout(CAPTURE_TIMEOUT_MS),
    }).catch(() => undefined);
}
