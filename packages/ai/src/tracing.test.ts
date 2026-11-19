import type { ChatMiddlewareContext } from "@tanstack/ai";
import * as Effect from "effect/Effect";
import { describe, expect, it } from "vite-plus/test";

import { generateText } from "./generate";
import { fails, fakeModel } from "./testing";
import { tracingMiddleware, withTracing } from "./tracing";
import type { GenerationProperties, TraceScope } from "./tracing";

const prompt = { messages: [{ content: "receipt", role: "user" as const }], system: "s", timeout: "1 second" as const };

function recorder() {
    const sent: GenerationProperties[] = [];
    const distinctIds: string[] = [];
    const send = async (distinctId: string, properties: GenerationProperties) => {
        distinctIds.push(distinctId);
        sent.push(properties);
    };
    return { distinctIds, send, sent };
}

const traced = (responses: Parameters<typeof fakeModel>[0], scope?: TraceScope, tokensPerSecond?: number) => {
    const { distinctIds, send, sent } = recorder();
    const { model } = fakeModel(responses, { feature: "receipt_scan", tokensPerSecond });
    return { distinctIds, model: withTracing(model, send, scope), sent };
};

describe("tracingMiddleware", () => {
    it("bills uncached input apart from cache reads and writes, counts web searches, and stays anonymous", async () => {
        const { distinctIds, send, sent } = recorder();
        const middleware = tracingMiddleware(fakeModel([], { feature: "receipt_scan" }).model, send);
        // SAFETY: the tracing hooks never read the context.
        const ctx = {} as ChatMiddlewareContext;

        await middleware.onChunk?.(ctx, {
            timestamp: 0,
            toolCallId: "1",
            toolCallName: "web_search",
            type: "TOOL_CALL_START",
        });
        await middleware.onFinish?.(ctx, {
            content: "ok",
            duration: 1200,
            finishReason: "stop",
            usage: {
                completionTokens: 50,
                promptTokens: 1000,
                promptTokensDetails: { cacheWriteTokens: 100, cachedTokens: 800 },
                providerUsageDetails: { serverToolUse: { webSearchRequests: 1 } },
                totalTokens: 1050,
            },
        });

        expect(sent).toStrictEqual([
            expect.objectContaining({
                $ai_cache_creation_input_tokens: 100,
                $ai_cache_read_input_tokens: 800,
                $ai_input_tokens: 100,
                $ai_is_error: false,
                $ai_latency: 1.2,
                $ai_output_tokens: 50,
                $ai_session_id: null,
                $ai_span_name: "receipt_scan",
                $ai_tool_call_count: 1,
                $ai_tools_called: "web_search",
                $ai_web_search_count: 1,
                $process_person_profile: false,
            }),
        ]);
        expect(distinctIds).toStrictEqual([sent[0]?.$ai_trace_id]);
    });

    it("traces each call under its own id, and under the account and session when shared", async () => {
        const { distinctIds, model, sent } = traced([{ text: "a" }, { text: "b" }], {
            distinctId: "user-1",
            sessionId: "thread-1",
        });

        await Effect.runPromise(generateText(model, prompt));
        await Effect.runPromise(generateText(model, prompt));

        expect(sent).toStrictEqual([
            expect.objectContaining({ $ai_session_id: "thread-1", $process_person_profile: true }),
            expect.objectContaining({ $ai_session_id: "thread-1", $process_person_profile: true }),
        ]);
        expect(sent[0]?.$ai_trace_id).not.toBe(sent[1]?.$ai_trace_id);
        expect(distinctIds).toStrictEqual(["user-1", "user-1"]);
    });

    it("records a provider error once, though a non-streaming call throws before the error hook", async () => {
        const { model, sent } = traced([fails("overloaded")]);

        await Effect.runPromise(Effect.ignore(generateText(model, prompt)));

        expect(sent).toStrictEqual([expect.objectContaining({ $ai_http_status: 500, $ai_is_error: true })]);
    });

    it("records a call that ran out of time as an abort", async () => {
        const { model, sent } = traced([{ text: "a slow answer" }], {}, 10);

        await Effect.runPromise(Effect.ignore(generateText(model, { ...prompt, timeout: "20 millis" })));

        expect(sent).toStrictEqual([expect.objectContaining({ $ai_error: "AbortError", $ai_is_error: true })]);
    });
});
