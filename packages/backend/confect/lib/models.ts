export const CLAUDE_MODEL_ID = "claude-sonnet-5-5";
export const CLAUDE_FAST_MODEL_ID = "claude-haiku-5-5";
export const ELEVENLABS_TRANSCRIPTION_MODEL_ID = "scribe_v2";

// Bump `AI_CONSENT_VERSION` in `@outlayr/money/contract` whenever the providers above change, so a build that asked
// about the old ones cannot send data to new ones.
