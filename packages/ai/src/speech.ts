import * as Config from "effect/Config";
import type * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import type * as HttpClient from "effect/http/HttpClient";
import * as Option from "effect/Option";

import { deadline } from "./deadline";
import { failedCall } from "./errors";
import type { ModelCallError } from "./errors";
import { setting } from "./provider";
import { SpeechProviderName } from "./speech-provider";
import type { RealtimeTranscription, Transcriber } from "./speech-provider";
import { speechProviders } from "./speech-registry";

const defaultSpeechProvider = Config.schema(SpeechProviderName, "STT_PROVIDER").pipe(Config.withDefault("elevenlabs"));

export interface SpeechModel {
    readonly modelId: string;
    readonly provider: SpeechProviderName;
    readonly realtime: Option.Option<Effect.Effect<RealtimeTranscription, ModelCallError, HttpClient.HttpClient>>;
    readonly transcriber: Transcriber;
}

export const resolveSpeechModel = Effect.fn("Ai.resolveSpeechModel")(function* resolveSpeechModel() {
    const providerName = yield* defaultSpeechProvider;
    const provider = speechProviders[providerName];
    const modelId = (yield* setting("STT_MODEL_ID")).pipe(Option.orElse(() => provider.defaultModel));
    const realtimeModelId = (yield* setting("STT_REALTIME_MODEL_ID")).pipe(
        Option.orElse(() => provider.defaultRealtimeModel)
    );
    const connected = yield* provider.connect;
    return Option.all({ connection: connected, modelId }).pipe(
        Option.map(({ connection, modelId: id }): SpeechModel => ({
            modelId: id,
            provider: providerName,
            realtime: Option.all({ model: realtimeModelId, open: connection.realtime }).pipe(
                Option.map(({ model, open }) => open(model))
            ),
            transcriber: connection.clip(id),
        }))
    );
});

interface TranscribeOptions {
    readonly language?: string | undefined;
    readonly timeout: Duration.Input;
}

export const transcribe = Effect.fn("Ai.transcribe")(function* transcribe(
    model: SpeechModel,
    audio: File,
    { language, timeout }: TranscribeOptions
) {
    const result = yield* Effect.tryPromise({
        catch: (cause) => failedCall("providerError", cause),
        try: async (signal) => {
            const { controller, release } = deadline(signal, timeout);
            try {
                const heard = await model.transcriber({
                    abortSignal: controller.signal,
                    audio,
                    language: language?.split("-")[0],
                });
                if (controller.signal.aborted) {
                    throw new Error("Transcription aborted before it finished");
                }
                return heard;
            } finally {
                release();
            }
        },
    });
    const text = result.text.trim();
    if (text.length === 0) {
        return yield* failedCall("noTranscript", result);
    }
    return text;
});
