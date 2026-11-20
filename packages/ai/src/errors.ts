import * as Predicate from "effect/Predicate";
import * as Schema from "effect/Schema";

const ModelCallFailure = Schema.Literals(["invalidResponse", "noTranscript", "providerError"]);

export class ModelCallError extends Schema.TaggedError<ModelCallError>()("ModelCallError", {
    cause: Schema.Defect(),
    message: Schema.String,
    reason: ModelCallFailure,
}) {}

const INVALID_RESPONSE_CODES: ReadonlySet<unknown> = new Set([
    "structured-output-missing-result",
    "structured-output-parse-failed",
    "structured-output-validation-failed",
]);

export const failedCall = (reason: typeof ModelCallFailure.Type, cause: unknown) =>
    new ModelCallError({ cause, message: `Model call failed: ${reason}`, reason });

export function modelCallError(cause: unknown): ModelCallError {
    const code = Predicate.hasProperty(cause, "code") ? cause.code : undefined;
    return failedCall(INVALID_RESPONSE_CODES.has(code) ? "invalidResponse" : "providerError", cause);
}
