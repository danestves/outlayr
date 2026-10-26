import * as FetchHttpClient from "effect/http/FetchHttpClient";
import * as HttpClient from "effect/http/HttpClient";
import * as Layer from "effect/Layer";

export const outboundHttp = Layer.mergeAll(
    FetchHttpClient.layer.pipe(
        Layer.provide(Layer.succeed(FetchHttpClient.Fetch, (input, init) => globalThis.fetch(input, init)))
    ),
    Layer.succeed(HttpClient.TracerPropagationEnabled, false)
);
