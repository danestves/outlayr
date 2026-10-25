import { jsonSchema, NoObjectGeneratedError, NoTranscriptGeneratedError, TypeValidationError } from "ai";
import type { JSONSchema7, Schema as ModelSchema } from "ai";
import * as Predicate from "effect/Predicate";
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";

export const ModelCallFailure = Schema.Literals(["invalidResponse", "noTranscript", "providerError"]);

export class ModelCallError extends Schema.TaggedError<ModelCallError>()("ModelCallError", {
    cause: Schema.Defect(),
    message: Schema.String,
    reason: ModelCallFailure,
}) {}

export function modelCallError(cause: unknown): ModelCallError {
    let reason: typeof ModelCallFailure.Type = "providerError";
    if (NoObjectGeneratedError.isInstance(cause) || TypeValidationError.isInstance(cause)) {
        reason = "invalidResponse";
    } else if (NoTranscriptGeneratedError.isInstance(cause)) {
        reason = "noTranscript";
    }
    return new ModelCallError({ cause, message: `Model call failed: ${reason}`, reason });
}

type Definition = NonNullable<JSONSchema7["anyOf"]>[number];
type TypeName = Extract<JSONSchema7["type"], string>;

const DRAFT_07 = "http://json-schema.org/draft-07/schema#";

const isBareType = (definition: Definition | undefined): definition is JSONSchema7 & { type: TypeName } =>
    typeof definition === "object" && Object.keys(definition).length === 1 && typeof definition.type === "string";

const toZodDefinition = (definition: Definition): Definition =>
    Predicate.isBoolean(definition) ? definition : toZodJsonSchema(definition);

function toZodJsonSchema(node: JSONSchema7): JSONSchema7 {
    const converted: JSONSchema7 = { ...node };
    if (node.properties !== undefined) {
        converted.properties = Object.fromEntries(
            Object.entries(node.properties).map(([name, child]) => [name, toZodDefinition(child)])
        );
    }
    if (node.items !== undefined) {
        converted.items = Array.isArray(node.items) ? node.items.map(toZodDefinition) : toZodDefinition(node.items);
    }
    if (node.anyOf !== undefined) {
        const members = node.anyOf.map(toZodDefinition);
        const [value, nullish] = members;
        if (
            Object.keys(node).length === 1 &&
            members.length === 2 &&
            isBareType(value) &&
            isBareType(nullish) &&
            nullish.type === "null"
        ) {
            return { type: [value.type, "null"] };
        }
        converted.anyOf = members;
    }
    if (node.type === "object") {
        converted.additionalProperties = false;
    }
    return converted;
}

export function modelSchema<S extends Schema.Decoder<unknown>>(schema: S): ModelSchema<S["Type"]> {
    const decode = Schema.decodeUnknownResult(schema);
    const draft07: JSONSchema7 = Schema.toStandardJSONSchemaV1(schema)["~standard"].jsonSchema.input({
        target: "draft-07",
    });
    return jsonSchema<S["Type"]>(
        { $schema: DRAFT_07, ...toZodJsonSchema(draft07) },
        {
            validate: (value) => {
                const result = decode(value);
                return Result.isSuccess(result)
                    ? { success: true, value: result.success }
                    : { success: false, error: result.failure };
            },
        }
    );
}
