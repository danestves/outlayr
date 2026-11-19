import type { ModelTier } from "@outlayr/model-router/route";
import type { AnyTextAdapter, Tool } from "@tanstack/ai";
import * as Config from "effect/Config";
import * as Option from "effect/Option";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";

export const TextProviderName = Schema.Literals([
    "anthropic",
    "openai",
    "gemini",
    "grok",
    "openrouter",
    "openai-compatible",
]);
export type TextProviderName = typeof TextProviderName.Type;

export type ProviderOptions = Readonly<Record<string, number | boolean>>;

export type Connect = (modelId: string) => AnyTextAdapter;

export type WebSearch = (maxSearches: number) => Tool;

export interface TextProvider {
    readonly connect: Config.Config<Option.Option<Connect>>;
    readonly defaultModels: Option.Option<Record<typeof ModelTier.Type, string>>;
    readonly outputLimit: (maxTokens: number) => ProviderOptions;
    readonly requestOptions?: ProviderOptions;
    readonly webSearch?: WebSearch;
}

export const secret = (name: string) =>
    Config.Redacted(name).pipe(Config.option, Config.map(Option.filter((value) => Redacted.value(value) !== "")));

export const setting = (name: string) =>
    Config.String(name).pipe(Config.option, Config.map(Option.filter((value) => value !== "")));

interface ModelRef {
    readonly modelId: string;
    readonly provider: TextProviderName;
}

const isProviderName = Schema.is(TextProviderName);

export function parseModelRef(value: string, fallback: TextProviderName): ModelRef {
    const separator = value.indexOf(":");
    const prefix = value.slice(0, separator);
    if (separator > 0 && isProviderName(prefix)) {
        return { modelId: value.slice(separator + 1), provider: prefix };
    }
    return { modelId: value, provider: fallback };
}
