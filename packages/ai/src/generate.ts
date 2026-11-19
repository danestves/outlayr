import { chat } from "@tanstack/ai";
import type { JSONSchema, ModelMessage } from "@tanstack/ai";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import { failedCall, modelCallError } from "./errors";
import type { TextModel } from "./model";

interface Prompt {
    readonly messages: readonly ModelMessage[];
    readonly system?: string | undefined;
    readonly timeout: Duration.Input;
}

const deadline = (interrupt: AbortSignal, timeout: Duration.Input) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Duration.toMillis(Duration.fromInputUnsafe(timeout)));
    interrupt.addEventListener("abort", () => controller.abort(), { once: true });
    return { controller, release: () => clearTimeout(timer) };
};

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

export const generateObject = Effect.fn("Ai.generateObject")(function* generateObject<
    S extends Schema.Decoder<unknown>,
>(model: TextModel, schema: S, prompt: Prompt) {
    const outputSchema: JSONSchema = Schema.toStandardJSONSchemaV1(schema)["~standard"].jsonSchema.input({
        target: "draft-07",
    });
    const answer = yield* call(prompt, (abortController) =>
        chat({ ...callOptions(model, prompt, abortController), outputSchema, stream: false })
    );
    return yield* Schema.decodeUnknownEffect(schema)(answer).pipe(
        Effect.mapError((cause) => failedCall("invalidResponse", cause))
    );
});

export const generateText = Effect.fn("Ai.generateText")(function* generateText(model: TextModel, prompt: Prompt) {
    const { text } = yield* call(prompt, (abortController) =>
        chat({ ...callOptions(model, prompt, abortController), stream: false })
    );
    return text;
});
