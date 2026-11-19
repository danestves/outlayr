import { route } from "@outlayr/model-router/route";
import type { Feature } from "@outlayr/model-router/route";
import * as ConfigProvider from "effect/ConfigProvider";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import { describe, expect, it } from "vite-plus/test";

import { resolveTextModel } from "./model";

const resolve = (env: Record<string, string>, feature: Feature = "receipt_scan") =>
    Effect.runSync(
        resolveTextModel(route({ feature })).pipe(
            Effect.provideService(ConfigProvider.ConfigProvider, ConfigProvider.fromEnv({ env })),
            Effect.map(Option.map(({ modelId, provider }) => `${provider}:${modelId}`)),
            Effect.map(Option.getOrNull)
        )
    );

describe("resolveTextModel", () => {
    it("keeps today's Anthropic models when only the Anthropic key is set", () => {
        expect(resolve({ ANTHROPIC_API_KEY: "k" })).toBe("anthropic:claude-sonnet-5-5");
        expect(resolve({ ANTHROPIC_API_KEY: "k" }, "csv_import")).toBe("anthropic:claude-haiku-5-5");
    });

    it("answers nothing when the chosen provider has no key", () => {
        expect(resolve({})).toBeNull();
        expect(resolve({ AI_PROVIDER: "openai", ANTHROPIC_API_KEY: "k" })).toBeNull();
        expect(resolve({ ANTHROPIC_API_KEY: "" })).toBeNull();
    });

    it("uses the chosen provider's own models", () => {
        expect(resolve({ AI_PROVIDER: "openai", OPENAI_API_KEY: "k" }, "csv_import")).toBe("openai:gpt-5.4-mini");
    });

    it("lets one tier run on another provider", () => {
        const env = { AI_FAST_MODEL_ID: "openai:gpt-5.4-mini", ANTHROPIC_API_KEY: "k", OPENAI_API_KEY: "k" };
        expect(resolve(env, "csv_import")).toBe("openai:gpt-5.4-mini");
        expect(resolve(env)).toBe("anthropic:claude-sonnet-5-5");
    });

    it("keeps slashes and colons that belong to the model id", () => {
        expect(resolve({ AI_MODEL_ID: "openrouter:anthropic/claude-sonnet-5.5:online", OPENROUTER_API_KEY: "k" })).toBe(
            "openrouter:anthropic/claude-sonnet-5.5:online"
        );
        expect(
            resolve({
                AI_MODEL_ID: "llama3.3:70b",
                AI_PROVIDER: "openai-compatible",
                OPENAI_COMPATIBLE_BASE_URL: "http://localhost:11434/v1",
            })
        ).toBe("openai-compatible:llama3.3:70b");
    });

    it("needs a model id for an OpenAI-compatible server, which has no default", () => {
        const env = { AI_PROVIDER: "openai-compatible", OPENAI_COMPATIBLE_BASE_URL: "http://localhost:11434/v1" };
        expect(resolve(env)).toBeNull();
    });

    it("runs grounded lookups on the fast model unless a grounded model is set", () => {
        expect(resolve({ AI_FAST_MODEL_ID: "claude-x", ANTHROPIC_API_KEY: "k" }, "grounded_lookup")).toBe(
            "anthropic:claude-x"
        );
        expect(
            resolve(
                { AI_FAST_MODEL_ID: "claude-x", AI_GROUNDED_MODEL_ID: "claude-y", ANTHROPIC_API_KEY: "k" },
                "grounded_lookup"
            )
        ).toBe("anthropic:claude-y");
    });

    it("asks OpenAI not to keep requests, alongside a feature's output limit", () => {
        const options = Effect.runSync(
            resolveTextModel(route({ feature: "pdf_import" })).pipe(
                Effect.provideService(
                    ConfigProvider.ConfigProvider,
                    ConfigProvider.fromEnv({ env: { AI_PROVIDER: "openai", OPENAI_API_KEY: "k" } })
                ),
                Effect.map(Option.map(({ modelOptions }) => modelOptions)),
                Effect.map(Option.getOrNull)
            )
        );
        expect(options).toStrictEqual({ max_output_tokens: 16_000, store: false });
    });
});
