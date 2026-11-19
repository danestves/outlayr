# AI providers

Every model call goes through `@outlayr/ai` (`packages/ai`), which wraps TanStack AI. The harness (prompts, schemas, routing, consent, quotas, tracing) is ours and stays the same whatever model answers. A deployment picks providers with env vars; the code never names one outside `packages/ai/src/providers/`.

## How a call finds its model

- A provider is on when its credentials are set: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `XAI_API_KEY`, `OPENROUTER_API_KEY`, or `OPENAI_COMPATIBLE_BASE_URL` (with an optional `OPENAI_COMPATIBLE_API_KEY`).
- `AI_PROVIDER` names the default provider (`anthropic` when unset).
- `AI_MODEL_ID` (standard tier), `AI_FAST_MODEL_ID` (fast tier) and `AI_GROUNDED_MODEL_ID` (grounded lookups, falling back to the fast model) override the default provider's models.
- A model id may name its provider: `openai:gpt-5.5`, `openrouter:anthropic/claude-sonnet-5.5`. The prefix is read only up to the first `:` and only when it is a provider name, so ids like `llama3.3:70b` stay whole. Mixing providers per tier needs both keys.
- `resolveTextModel(route)` answers None when the chosen provider has no credentials or no model, and callers answer `notConfigured`.

## Speech to text

Voice entry transcribes through the same package, with its own registry (`speechProviders` in `speech-registry.ts`) so the Convex bundle does not pull every text SDK in.

- `STT_PROVIDER` picks `elevenlabs` (default), `openai`, `groq`, `grok` or `openai-compatible`. Credentials are shared with text: `ELEVENLABS_API_KEY`, `OPENAI_API_KEY`, `GROQ_API_KEY`, `XAI_API_KEY`. `openai-compatible` reads `STT_BASE_URL` and an optional `STT_API_KEY`, and needs `STT_MODEL_ID` since it has no default.
- `STT_MODEL_ID` overrides the clip model (`scribe_v2`, `gpt-4o-transcribe`, `whisper-large-v3-turbo`, `grok-stt`). `STT_REALTIME_MODEL_ID` overrides the streaming one (`scribe_v3_live`, `gpt-live-transcribe`).
- `openStream` answers a `session`: `elevenlabs` (a single-use Scribe token), `openai` (a short-lived transcription client secret from `/v1/realtime/client_secrets`) or `clip`. Groq, Grok and OpenAI-compatible servers have no stream, so the phone records an M4A and sends it to `speak`, which transcribes and parses in one action. `clip` counts no capture and grants no stream credit; `speak` counts it.
- `token` is still filled for ElevenLabs so builds older than `session` keep streaming.

**Why OpenAI skips the relay.** `apps/voice-relay` exists so ElevenLabs never sees the phone, which is what the privacy policy promises for the hosted app. Hosted Outlayr stays on ElevenLabs. A deployment that picks OpenAI is self-hosted and chose that provider, so the phone opens `wss://api.openai.com/v1/realtime` itself with the ephemeral secret, sent as the `openai-insecure-api-key.` subprotocol. The secret expires in two minutes and is scoped to one transcription session, so the API key never leaves Convex.

## Adding a provider

1. Add the TanStack adapter to `packages/ai/package.json`, pinned exactly to a release at least a week old.
2. Write `packages/ai/src/providers/<name>.ts` exporting a `TextProvider`: `connect` reads its env with `secret`/`setting` and returns a `(modelId) => adapter` factory, `defaultModels` gives a fast and a standard model (or `Option.none()` when there is no sensible default), `outputLimit` maps a token cap to the provider option that holds it, and the optional `webSearch` returns the provider's hosted search tool for grounded lookups.
3. Add the name to `TextProviderName` in `provider.ts` and the provider to `textProviders` in `registry.ts`; the `satisfies` there fails until both agree.
4. Run the receipt and grounded live tests against it before claiming support.

## Testing

`@outlayr/ai/testing` has `fakeModel(responses)`, a `TextModel` over TanStack's fake adapter that records each request; `answers(value)` and `fails(message)` build its steps. With `webSearch: true` the fake also has a hosted search, and `searched(text, urls)` answers as if it had searched and found those urls. Live tests resolve their model with `liveModel(feature)`, which is undefined unless `RUN_LIVE_MODEL_TESTS=1` and the configured provider has a key. A test that mocks `@outlayr/ai/model` must not import `@outlayr/ai/testing` inside the mock factory: it imports the module being mocked and the import never settles.

## Traps

- **An aborted `chat()` resolves.** It returns an empty answer instead of rejecting, so `generate.ts` checks the signal after every call and fails with `providerError`.
- **Model ids are closed unions.** Each adapter types its model list, but ours come from env, so every provider casts once, at `connect`. An id outside TanStack's list still works; for Anthropic it loses native structured output and falls back to a forced tool call.
- **No portable token cap.** TanStack AI has no `maxTokens`; each provider puts it in a different `modelOptions` key, which `outputLimit` owns.
- **OpenAI keeps requests unless told not to.** The Responses API stores each one by default, so the OpenAI provider sends `store: false` through `requestOptions`, which every request carries. Grok's adapter already defaults to it.
- **No typed errors.** Failures are plain `Error`s; only structured-output failures carry a `code`. `errors.ts` maps those to `invalidResponse` and everything else to `providerError`.
- **Every call needs a `threadId`.** One-shot calls get a fresh UUID.
- **Effect leaves objects open.** Its JSON Schema allows extra keys unless asked otherwise, and Anthropic's native structured output rejects that with a 400 (Grok accepts it). `closedJsonSchema` builds the schema with `onExcessProperty: "error"`.
- **A failed call throws before `onError`.** `chat({ stream: false })` throws on the `RUN_ERROR` chunk, and an abort runs `onAbort`, so `tracing.ts` records from `onChunk` and `onAbort` too, once per call.
- **Provider SDKs retry on their own.** Every provider turns retries off (`maxRetries: 0`, OpenRouter's `retryConfig`): the backend's timeouts and its Sonnet retry assume one attempt.
- **Voice entry is still on the AI SDK.** `@convex-dev/agent` takes an AI SDK model, so `voiceEntry.impl.ts` builds one from the gate's model with `anthropicAgentModel` and answers `notConfigured` on any other provider.
- **Hosted search caps differ.** Only Anthropic honors `maxSearches`; the others search as often as the model likes within one turn (Grok ran 5 searches for one lookup). Spend records the measured count: from usage where the provider reports it (Anthropic, OpenRouter), else from the provider-executed search calls. The default prices are Claude's; set `GROUNDED_SEARCH_PRICE_MICROS` and the `GROUNDED_*_PRICE_MICROS_PER_TOKEN` overrides for another provider.
- **Not every provider grounds.** OpenRouter's adapter drops url citations, so its answers carry no sources and never publish to shared merchant knowledge. Gemini cites through Google redirect URLs, which the harness drops, so its answers carry no sources and never publish either. `openai-compatible` has no hosted search, so lookups are skipped and the expense keeps its ordinary ungrounded enrichment.
- **An aborted transcription resolves too.** `transcribe` in `speech.ts` checks the signal the same way, and maps an empty transcript to `noTranscript`.
- **Realtime sample rates differ.** Scribe takes PCM16 at 16 kHz, OpenAI at 24 kHz; the phone resamples to the rate each protocol declares.
- **Keyless servers still need a key.** The OpenAI client refuses an empty one, so `openai-compatible` sends `unused` when `OPENAI_COMPATIBLE_API_KEY` is unset; Ollama and LM Studio ignore it.
