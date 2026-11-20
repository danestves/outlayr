import * as Effect from "effect/Effect";
import * as HttpClient from "effect/http/HttpClient";
import * as Layer from "effect/Layer";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { stubHttp } from "../test.helpers";
import { captureGeneration } from "./aiTracing";
import { runEdge } from "./runEdge";

afterEach(() => {
    vi.unstubAllEnvs();
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

    it("swallows a failed request so tracing never breaks a model call", async () => {
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
