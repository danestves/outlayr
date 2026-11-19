import type { ChatMiddleware, TokenUsage } from "@tanstack/ai";
import * as Predicate from "effect/Predicate";

import type { TextModel } from "./model";

export type GenerationProperties = Record<string, string | number | boolean | null | undefined>;

type SendGeneration = (distinctId: string, properties: GenerationProperties) => Promise<void>;

export interface TraceScope {
    readonly distinctId?: string | undefined;
    readonly sessionId?: string | undefined;
}

interface Generation {
    readonly duration: number;
    readonly error?: unknown;
    readonly stopReason?: string | null | undefined;
    readonly usage?: TokenUsage | undefined;
}

export const webSearchCount = (usage: TokenUsage | undefined) => {
    const details = usage?.providerUsageDetails;
    const anthropic = Predicate.hasProperty(details, "serverToolUse") ? details.serverToolUse : undefined;
    const serverToolUse =
        anthropic ??
        (Predicate.hasProperty(details, "serverToolUseDetails") ? details.serverToolUseDetails : undefined);
    const count = Predicate.hasProperty(serverToolUse, "webSearchRequests")
        ? serverToolUse.webSearchRequests
        : undefined;
    return Predicate.isNumber(count) && count > 0 ? count : undefined;
};

export function tracingMiddleware(model: TextModel, send: SendGeneration, scope: TraceScope = {}): ChatMiddleware {
    const traceId = crypto.randomUUID();
    const toolsCalled: string[] = [];
    const record = ({ duration, error, stopReason, usage }: Generation) => {
        const cacheRead = usage?.promptTokensDetails?.cachedTokens;
        const cacheWrite = usage?.promptTokensDetails?.cacheWriteTokens;
        return send(scope.distinctId ?? traceId, {
            $ai_cache_creation_input_tokens: cacheWrite,
            $ai_cache_read_input_tokens: cacheRead,
            $ai_error: error instanceof Error || error instanceof DOMException ? error.name : undefined,
            $ai_http_status: error === undefined ? 200 : 500,
            $ai_input_tokens:
                usage === undefined ? undefined : usage.promptTokens - (cacheRead ?? 0) - (cacheWrite ?? 0),
            $ai_is_error: error !== undefined,
            $ai_latency: duration / 1000,
            $ai_model: model.modelId,
            $ai_output_tokens: usage?.completionTokens,
            $ai_provider: model.provider,
            $ai_session_id: scope.sessionId ?? null,
            $ai_span_name: model.route.feature,
            $ai_stop_reason: stopReason ?? undefined,
            $ai_tool_call_count: toolsCalled.length || undefined,
            $ai_tools_called: toolsCalled.join(",") || undefined,
            $ai_trace_id: traceId,
            $ai_web_search_count: webSearchCount(usage),
            $process_person_profile: scope.distinctId !== undefined,
            route_effort: model.route.effort,
            route_model: model.route.model,
            route_reason: model.route.reason,
        });
    };
    let startedAt = Date.now();
    let recorded = false;
    const recordOnce = (generation: Generation) => {
        if (recorded) {
            return;
        }
        recorded = true;
        return record(generation);
    };
    return {
        name: "posthog-tracing",
        onAbort: (_ctx, { duration, reason }) =>
            recordOnce({ duration, error: new DOMException(reason ?? "Model call aborted", "AbortError") }),
        onChunk: (_ctx, chunk) => {
            if (chunk.type === "TOOL_CALL_START") {
                toolsCalled.push(chunk.toolCallName);
            }
            if (chunk.type === "RUN_ERROR") {
                return recordOnce({ duration: Date.now() - startedAt, error: new Error(chunk.message) });
            }
        },
        onError: (_ctx, { duration, error }) => recordOnce({ duration, error }),
        onFinish: (_ctx, { duration, finishReason, usage }) =>
            recordOnce({ duration, stopReason: finishReason, usage }),
        onStart: () => {
            startedAt = Date.now();
        },
    };
}

export const withTracing = (model: TextModel, send: SendGeneration, scope?: TraceScope): TextModel => ({
    ...model,
    middleware: () => [...(model.middleware?.() ?? []), tracingMiddleware(model, send, scope)],
});
