import type * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as HttpClient from "effect/http/HttpClient";
import type * as HttpClientRequest from "effect/http/HttpClientRequest";
import * as HttpIncomingMessage from "effect/http/HttpIncomingMessage";
import type * as Schema from "effect/Schema";

import { failedCall } from "./errors";

export const realtimeTokenRequest = Effect.fn("Ai.realtimeTokenRequest")(
    function* realtimeTokenRequest<A>(
        request: HttpClientRequest.HttpClientRequest,
        body: Schema.Decoder<A>,
        _timeout: Duration.Input
    ) {
        const response = yield* HttpClient.execute(request);
        if (response.status < 200 || response.status >= 300) {
            return yield* failedCall(
                "providerError",
                new Error(`Realtime token request failed with ${response.status}`)
            );
        }
        return yield* HttpIncomingMessage.schemaBodyJson(body)(response);
    },
    (effect, _request, _body, timeout) =>
        effect.pipe(
            Effect.timeout(timeout),
            Effect.catchTags({
                HttpClientError: (cause) => Effect.fail(failedCall("providerError", cause)),
                SchemaError: (cause) => Effect.fail(failedCall("providerError", cause)),
                TimeoutError: (cause) => Effect.fail(failedCall("providerError", cause)),
            })
        )
);
