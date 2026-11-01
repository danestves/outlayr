import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

// Hermes reports `at apply (native)`; the SDK calls any scheme-less filename in-app, and with no chunk id
// it never resolves.
const NATIVE_FILENAME = "native";

const JsonRecord = Schema.Record(
    Schema.String,
    Schema.declare((_value: unknown): _value is Schema.MutableJson => true)
);

const decodeExceptionList = Schema.decodeUnknownOption(Schema.Array(JsonRecord));

const decodeStacktrace = Schema.decodeUnknownOption(
    Schema.StructWithRest(Schema.Struct({ frames: Schema.Array(JsonRecord) }), [JsonRecord])
);

const decodeMessages = Schema.decodeUnknownOption(
    Schema.Array(Schema.Struct({ type: Schema.optional(Schema.String), value: Schema.optional(Schema.String) }))
);

/**
 * PostHog fingerprints an exception from its in-app resolved frames, and from the type alone when it has none, so a
 * native promise rejection (no JS stack) lands in one "Error" issue with every other stackless error, backend included.
 */
export function groupStacklessExceptions<Event extends { properties?: Record<string, Schema.MutableJson> }>(
    event: Event | null
): Event | null {
    const properties = event?.properties;
    const exceptions = decodeExceptionList(properties?.$exception_list);
    if (properties === undefined || Option.isNone(exceptions) || exceptions.value.length === 0) {
        return event;
    }
    let hasJsFrame = false;
    properties.$exception_list = exceptions.value.map((exception) => {
        const stacktrace = decodeStacktrace(exception.stacktrace);
        if (Option.isNone(stacktrace)) {
            return exception;
        }
        const frames = stacktrace.value.frames.map((frame) => {
            if (frame.filename !== NATIVE_FILENAME) {
                hasJsFrame = true;
                return frame;
            }
            return { ...frame, in_app: false };
        });
        return { ...exception, stacktrace: { ...stacktrace.value, frames } };
    });
    const messages = decodeMessages(exceptions.value);
    if (!hasJsFrame && Option.isSome(messages) && properties.$exception_fingerprint === undefined) {
        properties.$exception_fingerprint = messages.value
            .map(({ type, value }) => `${type ?? "Error"}: ${value ?? ""}`)
            .join("\n");
    }
    return event;
}
