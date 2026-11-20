# AI providers

Every model call goes through `@outlayr/ai` (`packages/ai`), which wraps TanStack AI. The harness (prompts, schemas, routing, consent, quotas, tracing) is ours and stays the same whatever model answers. A deployment picks providers with env vars; the code never names one outside `packages/ai/src/providers/`.

## How a call finds its model

- A provider is on when its credentials are set: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `XAI_API_KEY`, `OPENROUTER_API_KEY`, or `OPENAI_COMPATIBLE_BASE_URL` (with an optional `OPENAI_COMPATIBLE_API_KEY`).
- `AI_PROVIDER` names the default provider (`anthropic` when unset).
- `AI_MODEL_ID` (standard tier), `AI_FAST_MODEL_ID` (fast tier) and `AI_GROUNDED_MODEL_ID` (grounded lookups, falling back to the fast model) override the default provider's models.
- A model id may name its provider: `openai:gpt-5.5`, `openrouter:anthropic/claude-sonnet-5.5`. The prefix is read only up to the first `:` and only when it is a provider name, so ids like `llama3.3:70b` stay whole. Mixing providers per tier needs both keys.
- `resolveTextModel(route)` answers None when the chosen provider has no credentials or no model, and callers answer `notConfigured`.

## Adding a provider

1. Add the TanStack adapter to `packages/ai/package.json`, pinned exactly to a release at least a week old.
2. Write `packages/ai/src/providers/<name>.ts` exporting a `TextProvider`: `connect` reads its env with `secret`/`setting` and returns a `(modelId) => adapter` factory, `defaultModels` gives a fast and a standard model (or `Option.none()` when there is no sensible default), and `outputLimit` maps a token cap to the provider option that holds it.
3. Add the name to `TextProviderName` in `provider.ts` and the provider to `textProviders` in `registry.ts`; the `satisfies` there fails until both agree.
4. Run the receipt and grounded live tests against it before claiming support.

## Testing

`@outlayr/ai/testing` has `fakeModel(responses)`, a `TextModel` over TanStack's fake adapter that records each request; `answers(value)` and `fails(message)` build its steps. Live tests resolve their model with `liveModel(feature)`, which is undefined unless `RUN_LIVE_MODEL_TESTS=1` and the configured provider has a key. A test that mocks `@outlayr/ai/model` must not import `@outlayr/ai/testing` inside the mock factory: it imports the module being mocked and the import never settles.

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
- **Keyless servers still need a key.** The OpenAI client refuses an empty one, so `openai-compatible` sends `unused` when `OPENAI_COMPATIBLE_API_KEY` is unset; Ollama and LM Studio ignore it.
