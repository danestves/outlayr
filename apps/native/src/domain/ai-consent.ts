/**
 * Sent with every AI request; the server refuses any other (`packages/backend/convex/lib/models.ts`). Bump it
 * with the `aiConsentV2` setting key when the providers change, so the question is asked again.
 */
export const AI_CONSENT_VERSION = 2;
