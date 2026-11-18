# AI and speech providers

Every AI feature reads its vendor from deployment env vars, so a self-hosted deployment can point the backend at a different provider without a code change or a rebuild. Unset, everything behaves exactly as before: Anthropic for text models and ElevenLabs for speech-to-text.

## Text models

| Variable | Values | Default |
| --- | --- | --- |
| `AI_PROVIDER` | `anthropic`, `google`, `openai`, `openai-compatible` | `anthropic` |
| `AI_API_KEY` | key for the chosen provider | falls back to `ANTHROPIC_API_KEY` |
| `AI_BASE_URL` | endpoint override (OpenRouter, LiteLLM, Ollama, proxies) | provider default |

`openai-compatible` is the catch-all for anything that speaks the OpenAI API; it needs `AI_BASE_URL`. The routed model ids still come from `CLAUDE_MODEL_ID`, `CLAUDE_FAST_MODEL_ID` and `CLAUDE_GROUNDED_MODEL_ID`, so a provider switch also needs those set to ids the new provider serves:

```sh
npx convex env set AI_PROVIDER openai
npx convex env set AI_API_KEY "sk-..."
npx convex env set CLAUDE_MODEL_ID "gpt-5"
npx convex env set CLAUDE_FAST_MODEL_ID "gpt-5-mini"
npx convex env set CLAUDE_GROUNDED_MODEL_ID "gpt-5-mini"
```

Grounding uses each vendor's hosted search tool: `webSearch_20250305` on Anthropic, `googleSearch` on Google, `webSearch` on OpenAI. On `openai-compatible` the grounded lookup still runs, just without web results, since a compatible endpoint cannot be assumed to expose one.

## Speech-to-text

| Variable | Values | Default |
| --- | --- | --- |
| `STT_PROVIDER` | `elevenlabs`, `openai`, `openai-compatible` | `elevenlabs` |
| `STT_API_KEY` | key for the chosen provider | falls back to `ELEVENLABS_API_KEY` |
| `STT_BASE_URL` | endpoint override | provider default |
| `STT_MODEL_ID` | transcription model id | `scribe_v2` on ElevenLabs, `whisper-1` on OpenAI |

```sh
npx convex env set STT_PROVIDER openai
npx convex env set STT_API_KEY "sk-..."
```

Realtime voice streaming is ElevenLabs-only: `openStream` answers `notConfigured` on any other `STT_PROVIDER`, because Scribe single-use tokens have no equivalent elsewhere. Clip transcription (`speak`) works on every provider.
