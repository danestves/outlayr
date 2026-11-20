import type { TranscriptionResult } from "@tanstack/ai";
import type * as Config from "effect/Config";
import type * as Effect from "effect/Effect";
import type * as HttpClient from "effect/http/HttpClient";
import type * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import type { ModelCallError } from "./errors";

export const SpeechProviderName = Schema.Literals(["elevenlabs", "openai", "groq", "grok", "openai-compatible"]);
export type SpeechProviderName = typeof SpeechProviderName.Type;

export interface ClipRequest {
    readonly abortSignal: AbortSignal;
    readonly audio: File;
    readonly language: string | undefined;
}

export type Transcriber = (request: ClipRequest) => Promise<TranscriptionResult>;

export type RealtimeTranscription =
    | { readonly kind: "elevenlabs"; readonly model: string; readonly token: string }
    | { readonly clientSecret: string; readonly expiresAt: number; readonly kind: "openai"; readonly model: string };

type OpenRealtime = (modelId: string) => Effect.Effect<RealtimeTranscription, ModelCallError, HttpClient.HttpClient>;

interface SpeechConnection {
    readonly clip: (modelId: string) => Transcriber;
    readonly realtime: Option.Option<OpenRealtime>;
}

export interface SpeechProvider {
    readonly connect: Config.Config<Option.Option<SpeechConnection>>;
    readonly defaultModel: Option.Option<string>;
    readonly defaultRealtimeModel: Option.Option<string>;
}
