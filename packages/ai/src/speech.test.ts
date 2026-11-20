import type { TranscriptionResult } from "@tanstack/ai";
import * as ConfigProvider from "effect/ConfigProvider";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as HttpClient from "effect/http/HttpClient";
import * as HttpClientRequest from "effect/http/HttpClientRequest";
import * as HttpClientResponse from "effect/http/HttpClientResponse";
import * as Option from "effect/Option";
import { describe, expect, it } from "vite-plus/test";

import type { ModelCallError } from "./errors";
import { resolveSpeechModel, transcribe } from "./speech";
import type { SpeechModel } from "./speech";
import type { Transcriber } from "./speech-provider";

const withEnv = (env: Record<string, string>) =>
    Effect.provideService(ConfigProvider.ConfigProvider, ConfigProvider.fromEnv({ env }));

const resolveModel = (env: Record<string, string>) =>
    Effect.runSync(resolveSpeechModel().pipe(withEnv(env), Effect.map(Option.getOrNull)));

const describeModel = (env: Record<string, string>) => {
    const model = resolveModel(env);
    return model && { model: `${model.provider}:${model.modelId}`, realtime: Option.isSome(model.realtime) };
};

const failureReason = <A>(exit: Exit.Exit<A, ModelCallError>) => {
    if (Exit.isSuccess(exit)) {
        throw new Error("Expected a failure");
    }
    return exit.cause.reasons.find((reason) => reason._tag === "Fail")?.error.reason;
};

interface Sent {
    readonly body: string;
    readonly headers: Headers;
    readonly url: string;
}

const mint = async (env: Record<string, string>, reply: Response) => {
    const sent: Sent[] = [];
    const client = HttpClient.make((request) =>
        Effect.gen(function* recordRequest() {
            const web = yield* HttpClientRequest.toWeb(request).pipe(Effect.orDie);
            sent.push({ body: yield* Effect.promise(() => web.text()), headers: web.headers, url: web.url });
            return HttpClientResponse.fromWeb(request, reply);
        })
    );
    const model = resolveModel(env);
    if (model === null || Option.isNone(model.realtime)) {
        throw new Error("Expected a realtime speech model");
    }
    const exit = await Effect.runPromiseExit(
        model.realtime.value.pipe(Effect.provideService(HttpClient.HttpClient, client))
    );
    return { exit, sent };
};

describe("resolveSpeechModel", () => {
    it("keeps ElevenLabs Scribe with realtime when only the ElevenLabs key is set", () => {
        expect(describeModel({ ELEVENLABS_API_KEY: "k" })).toStrictEqual({
            model: "elevenlabs:scribe_v2",
            realtime: true,
        });
    });

    it("answers nothing when the chosen provider has no key", () => {
        expect(describeModel({})).toBeNull();
        expect(describeModel({ ELEVENLABS_API_KEY: "k", STT_PROVIDER: "groq" })).toBeNull();
        expect(describeModel({ ELEVENLABS_API_KEY: "" })).toBeNull();
    });

    it("offers realtime only where the provider streams", () => {
        expect(describeModel({ OPENAI_API_KEY: "k", STT_PROVIDER: "openai" })).toStrictEqual({
            model: "openai:gpt-4o-transcribe",
            realtime: true,
        });
        expect(describeModel({ GROQ_API_KEY: "k", STT_PROVIDER: "groq" })).toStrictEqual({
            model: "groq:whisper-large-v3-turbo",
            realtime: false,
        });
        expect(describeModel({ STT_PROVIDER: "grok", XAI_API_KEY: "k" })).toStrictEqual({
            model: "grok:grok-stt",
            realtime: false,
        });
    });

    it("lets STT_MODEL_ID pick the clip model", () => {
        expect(
            describeModel({ GROQ_API_KEY: "k", STT_MODEL_ID: "whisper-large-v3", STT_PROVIDER: "groq" })
        ).toStrictEqual({
            model: "groq:whisper-large-v3",
            realtime: false,
        });
    });

    it("needs a base URL and a model id for an OpenAI-compatible server", () => {
        const env = { STT_BASE_URL: "http://localhost:8000/v1", STT_PROVIDER: "openai-compatible" };
        expect(describeModel(env)).toBeNull();
        expect(describeModel({ STT_MODEL_ID: "whisper", STT_PROVIDER: "openai-compatible" })).toBeNull();
        expect(describeModel({ ...env, STT_MODEL_ID: "whisper" })).toStrictEqual({
            model: "openai-compatible:whisper",
            realtime: false,
        });
    });
});

describe("realtime sessions", () => {
    it("mints a single-use Scribe token with the ElevenLabs key", async () => {
        const { exit, sent } = await mint({ ELEVENLABS_API_KEY: "xi" }, Response.json({ token: "single-use" }));
        expect(exit).toStrictEqual(Exit.succeed({ kind: "elevenlabs", model: "scribe_v3_live", token: "single-use" }));
        expect(sent[0]?.headers.get("xi-api-key")).toBe("xi");
    });

    it("mints an OpenAI transcription session secret for the realtime model", async () => {
        const { exit, sent } = await mint(
            { OPENAI_API_KEY: "sk", STT_PROVIDER: "openai", STT_REALTIME_MODEL_ID: "gpt-4o-mini-transcribe" },
            Response.json({ expires_at: 1_900_000_000, session: {}, value: "ek_123" })
        );
        expect(exit).toStrictEqual(
            Exit.succeed({
                clientSecret: "ek_123",
                expiresAt: 1_900_000_000,
                kind: "openai",
                model: "gpt-4o-mini-transcribe",
            })
        );
        expect(sent[0]?.headers.get("authorization")).toBe("Bearer sk");
        expect(JSON.parse(sent[0]?.body ?? "{}")).toMatchObject({
            session: {
                audio: { input: { transcription: { model: "gpt-4o-mini-transcribe" } } },
                type: "transcription",
            },
        });
    });

    it("fails as a provider error when the token request is refused", async () => {
        const { exit } = await mint({ ELEVENLABS_API_KEY: "xi" }, new Response("nope", { status: 401 }));
        expect(failureReason(exit)).toBe("providerError");
    });
});

const AUDIO = new File([new Uint8Array([1, 2, 3])], "clip.m4a", { type: "audio/mp4" });

const modelFrom = (transcriber: Transcriber): SpeechModel => ({
    modelId: "test",
    provider: "groq",
    realtime: Option.none(),
    transcriber,
});

const heard = (text: string): TranscriptionResult => ({ id: "t", model: "test", text });

const failure = async (transcriber: Transcriber) =>
    failureReason(await Effect.runPromiseExit(transcribe(modelFrom(transcriber), AUDIO, { timeout: "50 millis" })));

describe("transcribe", () => {
    it("returns the trimmed transcript and sends only the base language", async () => {
        const languages: (string | undefined)[] = [];
        const text = await Effect.runPromise(
            transcribe(
                modelFrom(async ({ language }) => {
                    languages.push(language);
                    return heard("  dos cafés  ");
                }),
                AUDIO,
                { language: "es-VE", timeout: "1 second" }
            )
        );
        expect(text).toBe("dos cafés");
        expect(languages).toStrictEqual(["es"]);
    });

    it("fails with noTranscript when the provider hears nothing", async () => {
        await expect(failure(async () => heard("   "))).resolves.toBe("noTranscript");
    });

    it("fails with providerError when the provider rejects", async () => {
        await expect(
            failure(async () => {
                throw new Error("boom");
            })
        ).resolves.toBe("providerError");
    });

    it("fails with providerError when an aborted call resolves anyway", async () => {
        await expect(
            failure(
                ({ abortSignal }) =>
                    new Promise((resolve) => {
                        abortSignal.addEventListener("abort", () => resolve(heard("partial")));
                    })
            )
        ).resolves.toBe("providerError");
    });
});
