import { route } from "@outlayr/model-router/route";
import type { Feature, Route } from "@outlayr/model-router/route";
import type { TextOptions } from "@tanstack/ai";
import { fakeText } from "@tanstack/ai/testing";
import type { FakeResponse, FakeResponseStep } from "@tanstack/ai/testing";
import * as Config from "effect/Config";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Predicate from "effect/Predicate";

import { resolveTextModel } from "./model";
import type { TextModel } from "./model";
import type { TextProviderName } from "./provider";

export type { FakeResponseStep } from "@tanstack/ai/testing";

type RespondTo = Exclude<FakeResponseStep, FakeResponse>;

export interface FakeModelOptions {
    readonly feature?: Feature;
    readonly modelId?: string;
    readonly provider?: TextProviderName;
    readonly repeat?: boolean;
    readonly route?: Route;
    readonly tokensPerSecond?: number;
}

export function fakeModel(responses: readonly FakeResponseStep[], options: FakeModelOptions = {}) {
    const adapter = fakeText({ tokensPerSecond: options.tokensPerSecond });
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
    };
    return { adapter, model, requests };
}

export const answers = <Answer>(value: Answer): FakeResponse => ({ text: JSON.stringify(value) });

export const fails = (message = "provider unavailable"): FakeResponse => ({ error: message });

const liveTests = Config.String("RUN_LIVE_MODEL_TESTS").pipe(Config.withDefault(""));

const resolveLiveModel = Effect.fn("AiTesting.liveModel")(function* resolveLiveModel(chosen: Route) {
    if ((yield* liveTests) !== "1") {
        return undefined;
    }
    return Option.getOrUndefined(yield* resolveTextModel(chosen));
});

export const liveModel = (chosen: Route) => Effect.runPromise(resolveLiveModel(chosen));
