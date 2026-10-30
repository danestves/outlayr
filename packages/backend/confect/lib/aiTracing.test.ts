import { generateText, streamText, wrapLanguageModel } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import * as Effect from "effect/Effect";
import * as HttpClient from "effect/http/HttpClient";
import * as Layer from "effect/Layer";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { stubHttp } from "../test.helpers";
import { captureGeneration, tracingMiddleware } from "./aiTracing";
import type { GenerationProperties, TraceScope } from "./aiTracing";
import { runEdge } from "./runEdge";

afterEach(() => {
    vi.unstubAllEnvs();
});

const usage = {
    inputTokens: { cacheRead: 800, cacheWrite: 100, noCache: 100, total: 1000 },
    outputTokens: { reasoning: undefined, text: 50, total: 50 },
};

function tracedMock(model: MockLanguageModelV4, scope?: TraceScope) {
    const sent: GenerationProperties[] = [];
    const distinctIds: string[] = [];
    const traced = wrapLanguageModel({
        middleware: tracingMiddleware(
            "receipt_scan",
            async (distinctId, properties) => {
                distinctIds.push(distinctId);
                sent.push(properties);
            },
            scope
        ),
        model,
    });
    return { distinctIds, sent, traced };
}

describe("tracingMiddleware", () => {
    it("bills uncached input apart from cache reads and writes, counts web searches, and stays anonymous", async () => {
        const { distinctIds, sent, traced } = tracedMock(
            new MockLanguageModelV4({
                doGenerate: async () => ({
                    content: [
                        {
                            input: "{}",
                            providerExecuted: true,
                            toolCallId: "1",
                            toolName: "web_search",
                            type: "tool-call",
                        },
                        { text: "ok", type: "text" },
                    ],
                    finishReason: { raw: "end_turn", unified: "stop" },
                    usage,
                    warnings: [],
                }),
            })
        );

        await generateText({ model: traced, prompt: "receipt" });

        expect(sent).toStrictEqual([
            expect.objectContaining({
                $ai_cache_creation_input_tokens: 100,
                $ai_cache_read_input_tokens: 800,
                $ai_input_tokens: 100,
                $ai_is_error: false,
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
        expect(sent[0]).not.toHaveProperty("$ai_input");
    });

    it("captures a stream's usage and tool calls under its session and account once the stream finishes", async () => {
        const { distinctIds, sent, traced } = tracedMock(
            new MockLanguageModelV4({
                doStream: async () => ({
                    stream: new ReadableStream({
                        start(controller) {
                            controller.enqueue({ id: "t", type: "text-start" });
                            controller.enqueue({ delta: "ok", id: "t", type: "text-delta" });
                            controller.enqueue({ id: "t", type: "text-end" });
                            controller.enqueue({
                                input: "{}",
                                toolCallId: "1",
                                toolName: "proposeDraft",
                                type: "tool-call",
                            });
                            controller.enqueue({
                                finishReason: { raw: "end_turn", unified: "stop" },
                                type: "finish",
                                usage,
                            });
                            controller.close();
                        },
                    }),
                }),
            }),
            { distinctId: "user-1", sessionId: "thread-1" }
        );

        await streamText({ model: traced, prompt: "voice" }).consumeStream();

        expect(sent).toStrictEqual([
            expect.objectContaining({
                $ai_input_tokens: 100,
                $ai_output_tokens: 50,
                $ai_session_id: "thread-1",
                $ai_stop_reason: "stop",
                $ai_tools_called: "proposeDraft",
                $process_person_profile: true,
            }),
        ]);
        expect(distinctIds).toStrictEqual(["user-1"]);
    });

    it("records a failed call and rethrows its error", async () => {
        const { sent, traced } = tracedMock(
            new MockLanguageModelV4({
                doGenerate: async () => {
                    throw new TypeError("boom");
                },
            })
        );

        await expect(generateText({ maxRetries: 0, model: traced, prompt: "receipt" })).rejects.toThrow("boom");
        expect(sent).toStrictEqual([
            expect.objectContaining({ $ai_error: "TypeError", $ai_http_status: 500, $ai_is_error: true }),
        ]);
    });
});

describe(captureGeneration, () => {
    const properties = { $ai_span_name: "receipt_scan", $ai_trace_id: "trace-1" };

    it("posts the generation to PostHog with the project token", async () => {
        vi.stubEnv("POSTHOG_PROJECT_TOKEN", "phc_test");
        const http = stubHttp(() => Response.json({ status: 1 }));

        await runEdge(captureGeneration("trace-1", properties).pipe(Effect.provide(http.layer)));

        expect(http.requests).toHaveLength(1);
        const [request] = http.requests;
        expect(request?.url).toBe("https://us.i.posthog.com/i/v0/e/");
        expect(JSON.parse(request?.body ?? "")).toStrictEqual({
            api_key: "phc_test",
            distinct_id: "trace-1",
            event: "$ai_generation",
            properties,
        });
    });

    it("sends nothing without a project token", async () => {
        vi.stubEnv("POSTHOG_PROJECT_TOKEN", "");
        const http = stubHttp(() => Response.json({}));

        await runEdge(captureGeneration("trace-1", properties).pipe(Effect.provide(http.layer)));

        expect(http.requests).toHaveLength(0);
    });

    it("swallows a failed request so tracing never breaks a Claude call", async () => {
        vi.stubEnv("POSTHOG_PROJECT_TOKEN", "phc_test");
        const failing = Layer.succeed(
            HttpClient.HttpClient,
            HttpClient.make(() => Effect.fail(new Error("offline") as never))
        );

        await expect(
            runEdge(captureGeneration("trace-1", properties).pipe(Effect.provide(failing)))
        ).resolves.toBeUndefined();
    });
});
