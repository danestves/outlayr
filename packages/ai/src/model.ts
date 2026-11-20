import type { Route } from "@outlayr/model-router/route";
import type { AnyTextAdapter, ChatMiddleware } from "@tanstack/ai";
import * as Config from "effect/Config";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";

import { parseModelRef, setting, TextProviderName } from "./provider";
import type { ProviderOptions, TextProvider, WebSearch } from "./provider";
import { textProviders } from "./registry";

const defaultProvider = Config.schema(TextProviderName, "AI_PROVIDER").pipe(Config.withDefault("anthropic"));

const tierModel = {
    fast: setting("AI_FAST_MODEL_ID"),
    grounded: setting("AI_GROUNDED_MODEL_ID"),
    standard: setting("AI_MODEL_ID"),
};

export interface TextModel {
    readonly adapter: AnyTextAdapter;
    readonly middleware?: () => readonly ChatMiddleware[];
    readonly modelId: string;
    readonly provider: TextProviderName;
    readonly modelOptions: ProviderOptions;
    readonly route: Route;
    readonly webSearch?: WebSearch | undefined;
}

const configuredModelId = Effect.fn("Ai.configuredModelId")(function* configuredModelId({
    grounded,
    model,
}: Pick<Route, "grounded" | "model">) {
    const own = yield* tierModel[model];
    if (!grounded) {
        return own;
    }
    return (yield* tierModel.grounded).pipe(Option.orElse(() => own));
});

const defaultModelId = (provider: TextProvider, { model }: Pick<Route, "model">) =>
    provider.defaultModels.pipe(Option.map((models) => models[model]));

const modelOptions = (provider: TextProvider, { maxTokens }: Pick<Route, "maxTokens">): ProviderOptions =>
    maxTokens === null
        ? { ...provider.requestOptions }
        : { ...provider.requestOptions, ...provider.outputLimit(maxTokens) };

export const resolveTextModel = Effect.fn("Ai.resolveTextModel")(function* resolveTextModel(route: Route) {
    const fallback = yield* defaultProvider;
    const ref = (yield* configuredModelId(route)).pipe(Option.map((value) => parseModelRef(value, fallback)));
    const providerName = Option.match(ref, { onNone: () => fallback, onSome: ({ provider }) => provider });
    const provider = textProviders[providerName];
    const chosenModelId = ref.pipe(
        Option.map(({ modelId }) => modelId),
        Option.orElse(() => defaultModelId(provider, route))
    );
    const connected = yield* provider.connect;
    return Option.all({ connect: connected, modelId: chosenModelId }).pipe(
        Option.map(({ connect, modelId }): TextModel => ({
            adapter: connect(modelId),
            modelId,
            modelOptions: modelOptions(provider, route),
            provider: providerName,
            route,
            webSearch: provider.webSearch,
        }))
    );
});
