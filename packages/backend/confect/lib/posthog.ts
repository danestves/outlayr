import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as HttpClient from "effect/http/HttpClient";
import * as HttpClientRequest from "effect/http/HttpClientRequest";
import * as HttpIncomingMessage from "effect/http/HttpIncomingMessage";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import { postHogConfig } from "./config";

const POSTHOG_TIMEOUT = Duration.seconds(10);

export class PostHogError extends Schema.TaggedError<PostHogError>()("PostHogError", {
    cause: Schema.optional(Schema.Defect()),
    reason: Schema.Literals(["unconfigured", "transport", "status", "invalidResponse", "deletionErrors"]),
    status: Schema.optional(Schema.Number),
}) {
    override get message(): string {
        switch (this.reason) {
            case "unconfigured": {
                return "POSTHOG_PERSONAL_API_KEY and POSTHOG_PROJECT_ID are not set; the analytics person cannot be erased";
            }
            case "status": {
                return `PostHog person erase failed with ${this.status}`;
            }
            case "deletionErrors": {
                return "PostHog reported deletion errors for the person";
            }
            case "invalidResponse": {
                return "PostHog person erase returned an unexpected response";
            }
            default: {
                return "PostHog person erase request failed";
            }
        }
    }
}

const decodeBulkDeleteResponse = HttpIncomingMessage.schemaBodyJson(
    Schema.Struct({ deletion_errors: Schema.Array(Schema.Unknown) })
);

const transport = (cause: unknown) => new PostHogError({ cause, reason: "transport" });

export const erasePostHogPerson = Effect.fn("PostHog.erasePerson")(
    function* erasePostHogPerson(distinctId: string) {
        const config = yield* postHogConfig;
        if (Option.isNone(config)) {
            return yield* new PostHogError({ reason: "unconfigured" });
        }
        const { personalApiKey, projectId } = config.value;
        const request = yield* HttpClientRequest.post(
            `https://us.posthog.com/api/projects/${encodeURIComponent(projectId)}/persons/bulk_delete/`
        ).pipe(
            HttpClientRequest.bearerToken(personalApiKey),
            HttpClientRequest.bodyJson({ delete_events: true, distinct_ids: [distinctId] }),
            Effect.catchTags({ HttpBodyError: transport })
        );
        const response = yield* HttpClient.execute(request).pipe(Effect.catchTags({ HttpClientError: transport }));
        if (response.status < 200 || response.status >= 300) {
            return yield* new PostHogError({ reason: "status", status: response.status });
        }
        const { deletion_errors: deletionErrors } = yield* decodeBulkDeleteResponse(response).pipe(
            Effect.catchTags({
                HttpClientError: transport,
                SchemaError: (cause) => new PostHogError({ cause, reason: "invalidResponse" }),
            })
        );
        if (deletionErrors.length > 0) {
            return yield* new PostHogError({ reason: "deletionErrors" });
        }
    },
    Effect.timeout(POSTHOG_TIMEOUT),
    Effect.catchTags({ TimeoutError: transport })
);
