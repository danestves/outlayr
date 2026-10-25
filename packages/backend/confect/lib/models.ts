export const CLAUDE_MODEL_ID = "claude-sonnet-5-5";
export const CLAUDE_FAST_MODEL_ID = "claude-haiku-5-5";
export const ELEVENLABS_TRANSCRIPTION_MODEL_ID = "scribe_v2";

// Bump whenever the providers above change, so a build that asked about the old ones cannot send data to new ones.
// Mirrored in apps/native/src/domain/ai-consent.ts.
export const AI_CONSENT_VERSION = 2;
