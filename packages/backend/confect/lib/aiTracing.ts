import type { TextModel } from "@outlayr/ai/model";
import { withTracing } from "@outlayr/ai/tracing";
import type { GenerationProperties, TraceScope } from "@outlayr/ai/tracing";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";

import { outboundHttp } from "./http";
import { capturePostHogEvent } from "./posthog";
import { runEdge } from "./runEdge";

const CAPTURE_TIMEOUT = Duration.seconds(3);

export const captureGeneration = Effect.fn("AiTracing.capture")(function* captureGeneration(
    distinctId: string,
    properties: GenerationProperties
) {
    yield* capturePostHogEvent({ distinct_id: distinctId, event: "$ai_generation", properties }, CAPTURE_TIMEOUT);
}, Effect.ignore());

export function sendGeneration(distinctId: string, properties: GenerationProperties): Promise<void> {
    return runEdge(captureGeneration(distinctId, properties).pipe(Effect.provide(outboundHttp)));
}

export const traceModel = (model: TextModel, scope?: TraceScope) => withTracing(model, sendGeneration, scope);
