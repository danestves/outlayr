# AI providers for a self-hosted deployment

Outlayr's AI features run on whatever provider a deployment's Convex env names. Hosted Outlayr runs on Anthropic for text and ElevenLabs for speech. Nothing else needs to change in code to switch. How the code picks a model is in [AI providers](../internals/ai-providers.md); this page is the operator's side.

Set Convex variables from `packages/backend` against your own deployment:

```sh
npx convex env set ANTHROPIC_API_KEY <key>
```

## Text

| Provider | Turn it on with | Fast / standard defaults | Hosted search |
| --- | --- | --- | --- |
| `anthropic` | `ANTHROPIC_API_KEY` | `claude-haiku-5-5` / `claude-sonnet-5-5` | yes, capped per lookup |
| `openai` | `OPENAI_API_KEY` | `gpt-5.4-mini` / `gpt-5.5` | yes |
| `gemini` | `GEMINI_API_KEY` | `gemini-3.5-flash-lite` / `gemini-3.5-flash` | yes |
| `grok` | `XAI_API_KEY` | `grok-4.20-non-reasoning` / `grok-4.7` | yes |
| `openrouter` | `OPENROUTER_API_KEY` | `anthropic/claude-haiku-5.5` / `anthropic/claude-sonnet-5.5` | yes, answers carry no sources |
| `openai-compatible` | `OPENAI_COMPATIBLE_BASE_URL`, optional `OPENAI_COMPATIBLE_API_KEY` | none, set both model ids | no |

- `AI_PROVIDER` picks the provider; unset means `anthropic`.
- `AI_MODEL_ID` and `AI_FAST_MODEL_ID` replace the defaults. `AI_GROUNDED_MODEL_ID` picks the merchant lookup model and falls back to the fast one.
- A model id can name another provider, `openai:gpt-5.5`, so tiers can mix providers when both keys are set.
- A feature whose provider has no key or no model answers "not configured" in the app instead of failing.

**Merchant lookups** search the web through the provider's own search tool. Spend limits default to Claude's prices; on another provider set `GROUNDED_SEARCH_PRICE_MICROS`, `GROUNDED_INPUT_PRICE_MICROS_PER_TOKEN` and `GROUNDED_OUTPUT_PRICE_MICROS_PER_TOKEN`, and `GROUNDED_BUDGET_MICROS` for the ceiling per 30 days. Only Anthropic caps searches per lookup, so budget for more on the others. `openai-compatible` has no search, so lookups are skipped and expenses keep their ordinary enrichment.

## Speech

| `STT_PROVIDER` | Key | Live transcript | Clip model / live model |
| --- | --- | --- | --- |
| `elevenlabs` (default) | `ELEVENLABS_API_KEY` | yes | `scribe_v2` / `scribe_v3_live` |
| `openai` | `OPENAI_API_KEY` | yes | `gpt-4o-transcribe` / `gpt-live-transcribe` |
| `groq` | `GROQ_API_KEY` | no | `whisper-large-v3-turbo` |
| `grok` | `XAI_API_KEY` | no | `grok-stt` |
| `openai-compatible` | `STT_BASE_URL`, optional `STT_API_KEY` | no | none, set `STT_MODEL_ID` |

- `STT_MODEL_ID` and `STT_REALTIME_MODEL_ID` replace the defaults.
- Without a live transcript the app records the sentence and sends it when the person stops.
- OpenAI live transcripts connect the phone to OpenAI with a two-minute secret; the API key stays in Convex.
- ElevenLabs live transcripts go through a relay so ElevenLabs never sees the phone. The app uses ours unless the build sets `EXPO_PUBLIC_VOICE_RELAY_URL`: deploy `apps/voice-relay` to your own Cloudflare account and use its address, or set `wss://api.elevenlabs.io` to connect directly.

## Examples

All on OpenAI:

```sh
npx convex env set AI_PROVIDER openai
npx convex env set STT_PROVIDER openai
npx convex env set OPENAI_API_KEY <key>
```

Local models through Ollama, with Groq for speech:

```sh
npx convex env set AI_PROVIDER openai-compatible
npx convex env set OPENAI_COMPATIBLE_BASE_URL http://<host>:11434/v1
npx convex env set AI_MODEL_ID llama3.3:70b
npx convex env set AI_FAST_MODEL_ID llama3.2:3b
npx convex env set STT_PROVIDER groq
npx convex env set GROQ_API_KEY <key>
```

Convex runs in the cloud or on your server, so the base URL must be reachable from there, not only from your laptop.

## Before you ship

- Run the live tests from `packages/backend` with your keys exported and `RUN_LIVE_MODEL_TESTS=1`. Receipt and installment tests also need `RECEIPT_PATH` and `INSTALLMENT_PLAN_PATHS`.
- Most AI features need Pro. Without RevenueCat, grant it on Convex: `npx convex env set PRO_ACCOUNTS all` for every account (only on its own), or a comma-separated list of emails (`ana@example.com,luis@example.com`), which count only once verified. It applies without a deploy; the app picks it up on its next sign-in or launch.
- On the web, a listed account's plan page says its Pro comes from your server, and anyone else is told to ask you for access. An app build with RevenueCat public keys takes Pro from RevenueCat alone and ignores these grants.
- The app's permission prompts (`apps/native/app.config.ts`) and the import note (`import.content.ts`) name Anthropic and ElevenLabs; change them to name your providers. The AI consent only says third-party providers.
- Our privacy policy and terms cover only hosted Outlayr. Your deployment needs your own.
