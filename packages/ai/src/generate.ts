import { chat, fromSpecTokenUsage, getProviderExecutedMetadata, maxIterations } from "@tanstack/ai";
import type { JSONSchema, ModelMessage, StreamChunk } from "@tanstack/ai";
import type * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import { deadline } from "./deadline";
import { failedCall, modelCallError } from "./errors";
import type { TextModel } from "./model";
import type { WebSearch } from "./provider";
import { webSearchCount } from "./tracing";

interface Prompt {
    readonly messages: readonly ModelMessage[];
    readonly system?: string | undefined;
    readonly timeout: Duration.Input;
}

const callOptions = (model: TextModel, prompt: Prompt, abortController: AbortController) => ({
    abortController,
    adapter: model.adapter,
    messages: [...prompt.messages],
    middleware: model.middleware === undefined ? undefined : [...model.middleware()],
    modelOptions: model.modelOptions,
    reasoning: model.route.effort ?? undefined,
    systemPrompts: prompt.system === undefined ? [] : [prompt.system],
    threadId: crypto.randomUUID(),
});

const call = <A>(prompt: Prompt, run: (abortController: AbortController) => Promise<A>) =>
    Effect.tryPromise({
        catch: modelCallError,
        try: async (signal) => {
            const { controller, release } = deadline(signal, prompt.timeout);
            try {
                const result = await run(controller);
                if (controller.signal.aborted) {
                    throw new Error("Model call aborted before it finished");
                }
                return result;
            } finally {
                release();
            }
        },
    });

export function closedJsonSchema(schema: Schema.Decoder<unknown>): JSONSchema {
    const { definitions, schema: root } = Schema.toJsonSchemaDocument(schema, { onExcessProperty: "error" });
    return Object.keys(definitions).length === 0 ? root : { ...root, $defs: definitions };
}

export const generateObject = Effect.fn("Ai.generateObject")(function* generateObject<
    S extends Schema.Decoder<unknown>,
>(model: TextModel, schema: S, prompt: Prompt) {
    const outputSchema = closedJsonSchema(schema);
    const answer = yield* call(prompt, (abortController) =>
        chat({ ...callOptions(model, prompt, abortController), outputSchema, stream: false })
    );
    return yield* Schema.decodeUnknownEffect(schema)(answer).pipe(
        Effect.mapError((cause) => failedCall("invalidResponse", cause))
    );
});

interface GroundedPrompt extends Prompt {
    readonly maxSearches: number;
    readonly maxTurns: number;
}

export interface Source {
    readonly url: string;
}

export interface Grounded {
    readonly inputTokens: number;
    readonly outputTokens: number;
    readonly searches: number;
    readonly sources: readonly Source[];
    readonly text: string;
}

const SearchResults = Schema.Array(Schema.Struct({ url: Schema.String }));

const SearchMetadata = Schema.Union([
    Schema.Struct({ sources: SearchResults }),
    Schema.Struct({ anthropic: Schema.Struct({ result: SearchResults }) }),
]);

const decodeSearch = Schema.decodeUnknownOption(SearchMetadata);

const GROUNDING_REDIRECT_HOST = "vertexaisearch.cloud.google.com";
const isGroundingRedirect = (url: string) => URL.canParse(url) && new URL(url).hostname === GROUNDING_REDIRECT_HOST;

class GroundedRun {
    private text = "";
    private searchCalls = 0;
    private reportedSearches = 0;
    private inputTokens = 0;
    private outputTokens = 0;
    private readonly sources = new Map<string, Source>();

    read(chunk: StreamChunk) {
        if (chunk.type === "TEXT_MESSAGE_CONTENT") {
            this.text += chunk.delta;
        }
        if (chunk.type === "TOOL_CALL_START" && getProviderExecutedMetadata(chunk) !== null) {
            this.searchCalls += 1;
            const found = decodeSearch(chunk.metadata).pipe(
                Option.map((search) => ("sources" in search ? search.sources : search.anthropic.result)),
                Option.getOrElse((): readonly Source[] => [])
            );
            for (const source of found.filter(({ url }) => !isGroundingRedirect(url))) {
                this.sources.set(source.url, { url: source.url });
            }
        }
        if (chunk.type === "RUN_FINISHED") {
            const usage = Array.isArray(chunk.usage) ? fromSpecTokenUsage(chunk.usage) : chunk.usage;
            this.inputTokens += usage?.promptTokens ?? 0;
            this.outputTokens += usage?.completionTokens ?? 0;
            this.reportedSearches += webSearchCount(usage) ?? 0;
        }
        if (chunk.type === "RUN_ERROR") {
            throw new Error(chunk.message);
        }
    }

    result(): Grounded {
        return {
            inputTokens: this.inputTokens,
            outputTokens: this.outputTokens,
            searches: this.reportedSearches || this.searchCalls,
            sources: [...this.sources.values()],
            text: this.text,
        };
    }
}

const runGrounded = async (model: TextModel, webSearch: WebSearch, prompt: GroundedPrompt, abort: AbortController) => {
    const run = new GroundedRun();
    const chunks = chat({
        ...callOptions(model, prompt, abort),
        agentLoopStrategy: maxIterations(prompt.maxTurns),
        stream: true,
        tools: [webSearch(prompt.maxSearches)],
    });
    for await (const chunk of chunks) {
        run.read(chunk);
    }
    return run.result();
};

export const generateGrounded = Effect.fn("Ai.generateGrounded")(function* generateGrounded(
    model: TextModel,
    prompt: GroundedPrompt
) {
    const { webSearch } = model;
    if (webSearch === undefined) {
        return Option.none<Grounded>();
    }
    const grounded = yield* call(prompt, (abortController) => runGrounded(model, webSearch, prompt, abortController));
    return Option.some(grounded);
});
