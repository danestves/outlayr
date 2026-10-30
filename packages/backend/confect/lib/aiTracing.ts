import { APICallError, wrapLanguageModel } from "ai";
import type { LanguageModel, LanguageModelMiddleware } from "ai";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";

import { outboundHttp } from "./http";
import { capturePostHogEvent } from "./posthog";
import { runEdge } from "./runEdge";

const CAPTURE_TIMEOUT = Duration.seconds(3);

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
    toolCalls?: { toolName: string; providerExecuted?: boolean }[];
    error?: unknown;
}

export type GenerationProperties = Record<string, string | number | boolean | null | undefined>;

export interface TraceScope {
    distinctId?: string;
    sessionId?: string;
}

export function tracingMiddleware(
    feature: string,
    send: (distinctId: string, properties: GenerationProperties) => Promise<void>,
    { distinctId, sessionId }: TraceScope = {}
): LanguageModelMiddleware {
    const traceId = crypto.randomUUID();
    const record = (modelId: string, startedAt: number, generation: Generation) => {
        const { error, toolCalls = [], usage } = generation;
        return send(distinctId ?? traceId, {
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
            $ai_session_id: sessionId ?? null,
            $ai_span_name: feature,
            $ai_stop_reason: generation.stopReason,
            $ai_tool_call_count: toolCalls.length || undefined,
            $ai_tools_called: toolCalls.map((call) => call.toolName).join(",") || undefined,
            $ai_trace_id: traceId,
            $ai_web_search_count:
                toolCalls.filter((call) => call.providerExecuted === true && call.toolName === "web_search").length ||
                undefined,
            $process_person_profile: distinctId !== undefined,
        });
    };

    return {
        wrapGenerate: async ({ doGenerate, model }) => {
            const startedAt = Date.now();
            try {
                const result = await doGenerate();
                await record(result.response?.modelId ?? model.modelId, startedAt, {
                    stopReason: result.finishReason.unified,
                    toolCalls: result.content.filter((part) => part.type === "tool-call"),
                    usage: result.usage,
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
                            } else if (part.type === "tool-call") {
                                (generation.toolCalls ??= []).push(part);
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

export function traced(model: Exclude<LanguageModel, string>, feature: string, scope?: TraceScope) {
    return wrapLanguageModel({ middleware: tracingMiddleware(feature, capture, scope), model });
}

export const captureGeneration = Effect.fn("AiTracing.capture")(function* captureGeneration(
    distinctId: string,
    properties: GenerationProperties
) {
    yield* capturePostHogEvent({ distinct_id: distinctId, event: "$ai_generation", properties }, CAPTURE_TIMEOUT);
}, Effect.ignore());

function capture(distinctId: string, properties: GenerationProperties): Promise<void> {
    return runEdge(captureGeneration(distinctId, properties).pipe(Effect.provide(outboundHttp)));
}
