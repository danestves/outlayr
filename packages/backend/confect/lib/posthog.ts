import { env } from "@outlayr/env/backend";
import * as Schema from "effect/Schema";

const POSTHOG_TIMEOUT_MS = 10_000;

const decodeBulkDeleteResponse = Schema.decodeUnknownSync(
    Schema.Struct({ deletion_errors: Schema.Array(Schema.Unknown) })
);

export async function erasePostHogPerson(distinctId: string): Promise<void> {
    if (!(env.POSTHOG_PERSONAL_API_KEY && env.POSTHOG_PROJECT_ID)) {
        throw new Error(
            "POSTHOG_PERSONAL_API_KEY and POSTHOG_PROJECT_ID are not set; the analytics person cannot be erased"
        );
    }
    const response = await fetch(
        `https://us.posthog.com/api/projects/${encodeURIComponent(env.POSTHOG_PROJECT_ID)}/persons/bulk_delete/`,
        {
            body: JSON.stringify({ delete_events: true, distinct_ids: [distinctId] }),
            headers: { Authorization: `Bearer ${env.POSTHOG_PERSONAL_API_KEY}`, "Content-Type": "application/json" },
            method: "POST",
            signal: AbortSignal.timeout(POSTHOG_TIMEOUT_MS),
        }
    );
    if (!response.ok) {
        throw new Error(`PostHog person erase failed with ${response.status}`);
    }
    if (decodeBulkDeleteResponse(await response.json()).deletion_errors.length > 0) {
        throw new Error("PostHog reported deletion errors for the person");
    }
}
