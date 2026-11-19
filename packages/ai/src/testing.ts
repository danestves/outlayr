import { route } from "@outlayr/model-router/route";
import type { Feature, Route } from "@outlayr/model-router/route";
import { EventType } from "@tanstack/ai";
import type { AdapterYieldChunk, TextOptions, Tool } from "@tanstack/ai";
import { FakeTextAdapter } from "@tanstack/ai/testing";
import type { FakeResponse, FakeResponseStep } from "@tanstack/ai/testing";
import * as Config from "effect/Config";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Predicate from "effect/Predicate";
import * as Schema from "effect/Schema";

import { resolveTextModel } from "./model";
import type { TextModel } from "./model";
import type { TextProviderName } from "./provider";

export type { FakeResponseStep } from "@tanstack/ai/testing";

type RespondTo = Exclude<FakeResponseStep, FakeResponse>;

const HOSTED_SEARCH = "web_search";

const decodeSearch = Schema.decodeUnknownSync(
    Schema.fromJsonString(Schema.Struct({ sources: Schema.Array(Schema.Struct({ url: Schema.String })) }))
);

class HostedSearchFake extends FakeTextAdapter<"fake-model"> {
    override async *chatStream(options: TextOptions): AsyncGenerator<AdapterYieldChunk> {
        let search: string | undefined;
        for await (const chunk of super.chatStream(options)) {
            if (chunk.type === "TOOL_CALL_START" && chunk.toolCallName === HOSTED_SEARCH) {
                search = chunk.toolCallId;
                continue;
            }
            if (chunk.type === "TOOL_CALL_ARGS" && chunk.toolCallId === search) {
                const { sources } = decodeSearch(chunk.delta);
                yield {
                    metadata: { providerExecuted: true, sources },
                    model: this.model,
                    timestamp: Date.now(),
                    toolCallId: chunk.toolCallId,
                    toolCallName: HOSTED_SEARCH,
                    type: EventType.TOOL_CALL_START,
                };
            }
            yield chunk;
        }
    }
}

const hostedSearch = (): Tool => ({ description: "Searches the web on the provider's side", name: HOSTED_SEARCH });

interface FakeModelOptions {
    readonly feature?: Feature;
    readonly modelId?: string;
    readonly provider?: TextProviderName;
    readonly repeat?: boolean;
    readonly route?: Route;
    readonly webSearch?: boolean;
}

export function fakeModel(responses: readonly FakeResponseStep[], options: FakeModelOptions = {}) {
    const adapter = new HostedSearchFake("fake-model", {});
    const requests: TextOptions[] = [];
    const steps = responses.map((step): RespondTo => (call) => {
        requests.push(call.request);
        return Predicate.isFunction(step) ? step(call) : step;
    });
    const last = steps.at(-1);
    if (options.repeat === true && last !== undefined) {
        const again: RespondTo = (call) => {
            adapter.appendResponses([again]);
            return last(call);
        };
        steps[steps.length - 1] = again;
    }
    adapter.setResponses(steps);
    const model: TextModel = {
        adapter,
        modelId: options.modelId ?? "fake-model",
        modelOptions: {},
        provider: options.provider ?? "openai-compatible",
        route: options.route ?? route({ feature: options.feature ?? "category_suggest" }),
        webSearch: options.webSearch === true ? hostedSearch : undefined,
    };
    return { adapter, model, requests };
}

export const answers = <Answer>(value: Answer): FakeResponse => ({ text: JSON.stringify(value) });

export const searched = (text: string, urls: readonly string[]): FakeResponse => ({
    finishReason: "stop",
    text,
    toolCalls: [{ input: { sources: urls.map((url) => ({ url })) }, name: HOSTED_SEARCH }],
});

export const fails = (message = "provider unavailable"): FakeResponse => ({ error: message });

const liveTests = Config.String("RUN_LIVE_MODEL_TESTS").pipe(Config.withDefault(""));

const resolveLiveModel = Effect.fn("AiTesting.liveModel")(function* resolveLiveModel(chosen: Route) {
    if ((yield* liveTests) !== "1") {
        return undefined;
    }
    return Option.getOrUndefined(yield* resolveTextModel(chosen));
});

export const liveModel = (chosen: Route) => Effect.runPromise(resolveLiveModel(chosen));
